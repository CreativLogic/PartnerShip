import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC } from '@common/ipc'
import type { Automation, KanbanBoard, ConversationSession, ShellKind } from '@common/types'
import { DEFAULT_KANBAN } from '@common/types'
import type { InferPayload, PresenceContext, AgentEvent } from '@common/events'
import type { ToolCall, ToolResult } from '@common/tools'
import * as ws from '../fs/workspace'
import * as pty from '../pty/manager'
import * as sched from '../automations/scheduler'
import { history } from '../automations/history'
import { providerFor, listAllAgents } from '../agents/provider'
import { getConfig, setConfig, rememberWorkspace } from '../store/appConfig'

let mainWindow: BrowserWindow | null = null
const aborters = new Map<string, AbortController>()
let presence: PresenceContext = {}

export function registerHandlers(win: BrowserWindow): void {
  mainWindow = win

  // stream pty output to renderer
  pty.onData((id, data) => win.webContents.send(IPC.ptyData, { id, data }))

  // automation -> agent bridge + notifications
  sched.onNotify((id) => win.webContents.send(IPC.autoFired, { id }))
  sched.onFire(async (a: Automation) => {
    const prompt = a.instruction
    const agentId = a.sessionId ? 'mock:default' : 'mock:default'
    await runInfer({ sessionId: a.sessionId ?? `auto-${a.id}`, agentId, prompt, context: presence, allowTools: a.allowTools })
    return { result: 'success', summary: `Fired "${a.name}"` }
  })

  // ---- workspace / fs ----
  ipcMain.handle(IPC.workspacePick, async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    if (r.canceled || !r.filePaths[0]) return null
    ws.setRoot(r.filePaths[0])
    rememberWorkspace(r.filePaths[0])
    sched.load()
    return r.filePaths[0]
  })
  ipcMain.handle(IPC.workspaceOpen, (_e, root: string) => {
    ws.setRoot(root)
    rememberWorkspace(root)
    sched.load()
    return root
  })
  ipcMain.handle(IPC.fsTree, () => ws.buildTree())
  ipcMain.handle(IPC.fsRead, (_e, p: string) => ws.readFile(p))
  ipcMain.handle(IPC.fsWrite, (_e, p: string, content: string) => {
    ws.writeFile(p, content)
    return true
  })
  ipcMain.handle(IPC.fsCreate, (_e, p: string, isDir: boolean) => {
    ws.createEntry(p, isDir)
    return ws.buildTree()
  })
  ipcMain.handle(IPC.fsRename, (_e, from: string, to: string) => {
    ws.renameEntry(from, to)
    return ws.buildTree()
  })
  ipcMain.handle(IPC.fsDelete, (_e, p: string) => {
    ws.deleteEntry(p)
    return ws.buildTree()
  })

  // ---- terminals ----
  ipcMain.handle(IPC.ptyList, () => pty.listShells())
  ipcMain.handle(
    IPC.ptyCreate,
    (_e, id: string, kind: ShellKind, distro: string | undefined, cols: number, rows: number) => {
      const cwd = safeCwd()
      pty.create(id, kind, cwd, distro, cols, rows)
      return true
    }
  )
  ipcMain.handle(IPC.ptyWrite, (_e, id: string, data: string) => pty.write(id, data))
  ipcMain.handle(IPC.ptyResize, (_e, id: string, cols: number, rows: number) =>
    pty.resize(id, cols, rows)
  )
  ipcMain.handle(IPC.ptyKill, (_e, id: string) => pty.kill(id))

  // ---- presence ----
  ipcMain.on(IPC.presenceUpdate, (_e, ctx: PresenceContext) => {
    presence = { ...presence, ...ctx }
  })

  // ---- agents ----
  ipcMain.handle(IPC.agentList, () => listAllAgents())
  ipcMain.handle(IPC.agentInfer, async (_e, payload: InferPayload) => {
    void runInfer(payload)
    return true
  })
  ipcMain.handle(IPC.agentStop, (_e, sessionId: string) => {
    aborters.get(sessionId)?.abort()
    aborters.delete(sessionId)
    return true
  })

  // ---- sessions ----
  ipcMain.handle(IPC.sessionsLoad, () => ws.readState<ConversationSession[]>('sessions.json', []))
  ipcMain.handle(IPC.sessionsSave, (_e, sessions: ConversationSession[]) => {
    ws.writeState('sessions.json', sessions)
    return true
  })
  ipcMain.handle(IPC.sessionsCommitLog, (_e, sessions: ConversationSession[]) => {
    const md = renderSessionsLog(sessions)
    const name = `conversation-log-${new Date().toISOString().slice(0, 10)}.md`
    ws.writeFile(name, md)
    ws.audit('sessions', `Committed ${sessions.length} sessions to ${name}`)
    return name
  })

  // ---- automations ----
  ipcMain.handle(IPC.autoList, () => sched.list())
  ipcMain.handle(IPC.autoSave, (_e, a: Automation) => sched.save(a))
  ipcMain.handle(IPC.autoDelete, (_e, id: string) => sched.remove(id))
  ipcMain.handle(IPC.autoToggle, (_e, id: string, enabled: boolean) => sched.toggle(id, enabled))
  ipcMain.handle(IPC.autoRunNow, async (_e, id: string) => {
    await sched.runNow(id)
    return true
  })
  ipcMain.handle(IPC.autoHistory, (_e, id: string, limit: number, offset: number) =>
    history(id, limit, offset)
  )

  // ---- kanban ----
  ipcMain.handle(IPC.kanbanLoad, () => ws.readState<KanbanBoard>('kanban.json', DEFAULT_KANBAN()))
  ipcMain.handle(IPC.kanbanSave, (_e, board: KanbanBoard) => {
    ws.writeState('kanban.json', board)
    return true
  })

  // ---- config ----
  ipcMain.handle(IPC.configGet, () => getConfig())
  ipcMain.handle(IPC.configSet, (_e, patch) => setConfig(patch))
}

function safeCwd(): string {
  try {
    return ws.getRoot()
  } catch {
    return process.env.HOME || process.env.USERPROFILE || '.'
  }
}

/** Run one inference, stream events to renderer, execute permitted tool calls. */
async function runInfer(payload: InferPayload): Promise<void> {
  const { sessionId } = payload
  aborters.get(sessionId)?.abort()
  const ctrl = new AbortController()
  aborters.set(sessionId, ctrl)
  const send = (evt: AgentEvent) => mainWindow?.webContents.send(IPC.agentEvent, evt)

  try {
    const provider = providerFor(payload.agentId)
    for await (const evt of provider.sendMessage(payload, ctrl.signal)) {
      send(evt)
      if (evt.type === 'tool-call' && payload.allowTools) {
        const result = await applyTool(evt.call)
        send({ type: 'tool-result', sessionId, result })
      }
    }
  } catch (e) {
    send({ type: 'error', sessionId, message: String(e) })
    send({ type: 'done', sessionId })
  } finally {
    aborters.delete(sessionId)
  }
}

async function applyTool(call: ToolCall): Promise<ToolResult> {
  try {
    switch (call.tool) {
      case 'edit_file':
        ws.writeFile(call.path, call.content)
        ws.audit('agent-edit', call.path)
        return { tool: 'edit_file', ok: true, output: `Wrote ${call.path}`, path: call.path }
      case 'open_file':
        return { tool: 'open_file', ok: true, output: ws.readFile(call.path), path: call.path }
      case 'run_command':
        pty.write(call.terminalId, call.command + '\r')
        ws.audit('agent-cmd', call.command)
        return { tool: 'run_command', ok: true, output: `Ran: ${call.command}` }
      default:
        return { tool: (call as ToolCall).tool, ok: false, output: 'Unknown tool' }
    }
  } catch (e) {
    return { tool: call.tool, ok: false, output: String(e) }
  }
}

function renderSessionsLog(sessions: ConversationSession[]): string {
  const lines: string[] = [`# Conversation Log`, ``, `Committed ${new Date().toLocaleString()}`, ``]
  for (const s of sessions) {
    lines.push(`## ${s.title} (${s.agent})`, '')
    for (const m of s.messages) {
      lines.push(`**${m.role}** · ${new Date(m.ts).toLocaleString()}`, '', m.content, '')
    }
    lines.push('---', '')
  }
  return lines.join('\n')
}
