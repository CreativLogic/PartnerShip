// ClaudeCodeProvider — drives the `claude` CLI headlessly so the app can use a
// Pro/Max SUBSCRIPTION (OAuth) instead of the metered API. The CLI runs with
// cwd = workspace root (its built-in Read/Edit/Bash tools operate on your
// files) and loads the PartnerShip MCP for app-specific actions (kanban,
// sessions). Degrades gracefully if `claude` isn't installed.
import { spawn, execSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import type { AgentProvider } from './provider'
import type { AgentEvent, AgentMeta, InferPayload } from '@common/events'
import type { ClaudeConfig } from '@common/types'

let claudeBin: string | null | undefined

function findClaude(): string | null {
  if (claudeBin !== undefined) return claudeBin
  for (const cmd of ['claude', 'claude.cmd']) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' })
      claudeBin = cmd
      return cmd
    } catch {
      /* try next */
    }
  }
  claudeBin = null
  return null
}

export function claudeInstalled(): boolean {
  return findClaude() !== null
}

/** Path to the bundled PartnerShip MCP server entry (mcp/dist/index.js). */
function mcpEntry(): string | null {
  // __dirname in dev = out/main; repo root two levels up.
  const candidates = [
    resolve(__dirname, '../../mcp/dist/index.js'),
    resolve(process.cwd(), 'mcp/dist/index.js')
  ]
  return candidates.find((p) => existsSync(p)) ?? null
}

export class ClaudeCodeProvider implements AgentProvider {
  constructor(
    private getCfg: () => ClaudeConfig | undefined,
    private getWorkspace: () => string | undefined
  ) {}

  async listAgents(): Promise<AgentMeta[]> {
    return [{ id: 'claude:code', name: 'Claude (subscription)', kind: 'claude', online: findClaude() !== null }]
  }

  async *sendMessage(payload: InferPayload, signal: AbortSignal): AsyncIterable<AgentEvent> {
    const { sessionId } = payload
    const bin = findClaude()
    if (!bin) {
      yield { type: 'error', sessionId, message: 'Claude CLI not found. Install it and run `claude setup-token` to sign in with your subscription.' }
      yield { type: 'done', sessionId }
      return
    }

    const cfg = this.getCfg() ?? { mode: 'subscription' as const }
    const cwd = this.getWorkspace() ?? payload.context.workspaceRoot ?? process.cwd()

    // Build an mcp-config so Claude Code can drive the app (kanban/sessions/etc).
    const tmp = mkdtempSync(join(tmpdir(), 'partnership-'))
    const mcp = mcpEntry()
    const mcpServers: Record<string, unknown> = {}
    if (mcp) {
      mcpServers.partnership = {
        command: process.execPath, // bundled node/electron
        args: [mcp],
        env: { PARTNERSHIP_WORKSPACE: cwd, ELECTRON_RUN_AS_NODE: '1' }
      }
    }
    for (const [name, s] of Object.entries(cfg.extraMcpServers ?? {})) mcpServers[name] = s
    const mcpConfigPath = join(tmp, 'mcp.json')
    writeFileSync(mcpConfigPath, JSON.stringify({ mcpServers }, null, 2), 'utf8')

    const permission = payload.allowTools ? 'acceptEdits' : cfg.permissionMode ?? 'default'
    const args = [
      '-p',
      payload.prompt,
      '--output-format',
      'stream-json',
      '--include-partial-messages',
      '--verbose',
      '--permission-mode',
      permission
    ]
    if (Object.keys(mcpServers).length) args.push('--mcp-config', mcpConfigPath)

    // Auth: subscription => ensure NO api key leaks in; pass OAuth token if we have one.
    const env: NodeJS.ProcessEnv = { ...process.env }
    if (cfg.mode === 'subscription') {
      delete env.ANTHROPIC_API_KEY
      if (cfg.oauthToken) env.CLAUDE_CODE_OAUTH_TOKEN = cfg.oauthToken
    } else if (cfg.apiKey) {
      env.ANTHROPIC_API_KEY = cfg.apiKey
    }

    yield { type: 'message-start', sessionId, messageId: sessionId + ':' + Date.now() }
    yield { type: 'status', sessionId, status: 'thinking' }

    let child: ChildProcessWithoutNullStreams
    try {
      child = spawn(bin, args, { cwd, env, shell: process.platform === 'win32' })
    } catch (e) {
      yield { type: 'error', sessionId, message: `Failed to start claude: ${String(e)}` }
      yield { type: 'done', sessionId }
      return
    }

    const onAbort = (): void => {
      try {
        child.kill()
      } catch {
        /* already dead */
      }
    }
    signal.addEventListener('abort', onAbort)

    // Pull stdout lines through an async queue so we can `yield` from the loop.
    const queue: AgentEvent[] = []
    let resolveNext: (() => void) | null = null
    let finished = false
    const push = (e: AgentEvent): void => {
      queue.push(e)
      resolveNext?.()
    }

    let buf = ''
    let sawDelta = false
    let assistantText = ''

    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      buf += chunk
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const t = line.trim()
        if (!t) continue
        let obj: Record<string, unknown>
        try {
          obj = JSON.parse(t)
        } catch {
          continue
        }
        handle(obj)
      }
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', () => {
      /* claude logs noise to stderr; ignore unless it exits nonzero */
    })
    child.on('close', (code) => {
      if (!sawDelta && assistantText) push({ type: 'token', sessionId, text: assistantText })
      if (code && code !== 0) push({ type: 'error', sessionId, message: `claude exited with code ${code}` })
      push({ type: 'message-end', sessionId, messageId: sessionId })
      push({ type: 'done', sessionId })
      finished = true
      resolveNext?.()
    })

    function handle(obj: Record<string, unknown>): void {
      const type = obj.type as string
      if (type === 'stream_event') {
        const ev = obj.event as { type?: string; delta?: { type?: string; text?: string } } | undefined
        if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta' && ev.delta.text) {
          sawDelta = true
          push({ type: 'token', sessionId, text: ev.delta.text })
        }
      } else if (type === 'assistant') {
        const msg = obj.message as { content?: Array<{ type: string; text?: string; name?: string }> } | undefined
        for (const block of msg?.content ?? []) {
          if (block.type === 'text' && block.text) assistantText += block.text
          else if (block.type === 'tool_use' && block.name) push({ type: 'status', sessionId, status: `using ${block.name}` })
        }
      } else if (type === 'result') {
        const r = obj.result as string | undefined
        if (!sawDelta && r && !assistantText) assistantText = r
      }
    }

    try {
      while (!finished || queue.length) {
        if (queue.length) {
          yield queue.shift() as AgentEvent
          continue
        }
        await new Promise<void>((r) => (resolveNext = r))
        resolveNext = null
      }
    } finally {
      signal.removeEventListener('abort', onAbort)
    }
  }
}
