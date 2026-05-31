#!/usr/bin/env node
// PartnerShip MCP server (stdio). Exposes a workspace — files, kanban, sessions,
// automations — to any MCP client (the app's own Claude, Claude Desktop, or an
// external Claude Code). Sandboxed to PARTNERSHIP_WORKSPACE.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import * as ws from './workspace.js'

const server = new McpServer({ name: 'partnership', version: '0.1.0' })

const ok = (text: string, data?: unknown) => ({
  content: [{ type: 'text' as const, text }],
  ...(data !== undefined ? { structuredContent: { result: data } } : {})
})
const fail = (text: string) => ({ content: [{ type: 'text' as const, text }], isError: true })

// ---------- Files ----------

server.registerTool(
  'partnership_list_files',
  {
    title: 'List workspace files',
    description: 'List every file and folder in the PartnerShip workspace (markdown files are marked editable). Use before reading or writing to discover paths.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const tree = ws.listTree()
    const lines = tree.map((e) => `${e.isDir ? '[dir] ' : e.editable ? '[md]  ' : '[file]'} ${e.rel}`)
    return ok(lines.join('\n') || '(empty workspace)', tree)
  }
)

server.registerTool(
  'partnership_read_file',
  {
    title: 'Read a file',
    description: 'Read the full text of a workspace file by its relative path.',
    inputSchema: { path: z.string().describe('Workspace-relative path, e.g. notes/plan.md') },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ path }) => {
    try {
      return ok(ws.read(path))
    } catch (e) {
      return fail(`Could not read ${path}: ${String(e)}`)
    }
  }
)

server.registerTool(
  'partnership_write_file',
  {
    title: 'Write a file',
    description: 'Create or overwrite a workspace file with full text. Ships to disk immediately and appears live in the app. Use for markdown notes/docs.',
    inputSchema: {
      path: z.string().describe('Workspace-relative path, e.g. notes/plan.md'),
      content: z.string().describe('Full file contents (replaces existing).')
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
  },
  async ({ path, content }) => {
    try {
      ws.write(path, content)
      ws.audit('mcp-write', path)
      return ok(`Wrote ${path} (${content.length} chars).`)
    } catch (e) {
      return fail(`Could not write ${path}: ${String(e)}`)
    }
  }
)

server.registerTool(
  'partnership_search',
  {
    title: 'Search markdown',
    description: 'Case-insensitive substring search across all markdown files. Returns path:line matches.',
    inputSchema: { query: z.string().min(1), max: z.number().int().positive().max(500).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ query, max }) => {
    const hits = ws.search(query, max ?? 100)
    const lines = hits.map((h) => `${h.rel}:${h.line}  ${h.text}`)
    return ok(lines.join('\n') || 'No matches.', hits)
  }
)

// ---------- Kanban ----------

interface Card { id: string; title: string; description?: string; sessionId?: string; filePath?: string; createdAt: number }
interface Column { id: string; title: string; cardIds: string[] }
interface Board { columns: Column[]; cards: Record<string, Card> }

const defaultBoard = (): Board => ({
  columns: [
    { id: 'backlog', title: 'Backlog', cardIds: [] },
    { id: 'in-progress', title: 'In progress', cardIds: [] },
    { id: 'blocked', title: 'Blocked', cardIds: [] },
    { id: 'done', title: 'Done', cardIds: [] }
  ],
  cards: {}
})

server.registerTool(
  'partnership_list_kanban',
  {
    title: 'List kanban board',
    description: 'Return the workspace Kanban board: columns and their cards.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const b = ws.readState<Board>('kanban.json', defaultBoard())
    const text = b.columns
      .map((c) => `## ${c.title}\n${c.cardIds.map((id) => `- ${b.cards[id]?.title ?? id}`).join('\n') || '- (empty)'}`)
      .join('\n\n')
    return ok(text, b)
  }
)

server.registerTool(
  'partnership_add_kanban_card',
  {
    title: 'Add kanban card',
    description: 'Add a card to a Kanban column (backlog | in-progress | blocked | done).',
    inputSchema: {
      column: z.enum(['backlog', 'in-progress', 'blocked', 'done']),
      title: z.string().min(1),
      description: z.string().optional()
    },
    annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false }
  },
  async ({ column, title, description }) => {
    const b = ws.readState<Board>('kanban.json', defaultBoard())
    const card: Card = { id: nanoid(), title, description, createdAt: Date.now() }
    b.cards[card.id] = card
    const col = b.columns.find((c) => c.id === column)
    if (!col) return fail(`Unknown column: ${column}`)
    col.cardIds.push(card.id)
    ws.writeState('kanban.json', b)
    ws.audit('mcp-kanban', `add "${title}" -> ${column}`)
    return ok(`Added "${title}" to ${column} (id ${card.id}).`, card)
  }
)

server.registerTool(
  'partnership_move_kanban_card',
  {
    title: 'Move kanban card',
    description: 'Move a card to a different column by card id.',
    inputSchema: {
      cardId: z.string(),
      toColumn: z.enum(['backlog', 'in-progress', 'blocked', 'done'])
    },
    annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false }
  },
  async ({ cardId, toColumn }) => {
    const b = ws.readState<Board>('kanban.json', defaultBoard())
    if (!b.cards[cardId]) return fail(`No card ${cardId}`)
    b.columns.forEach((c) => (c.cardIds = c.cardIds.filter((id) => id !== cardId)))
    b.columns.find((c) => c.id === toColumn)?.cardIds.push(cardId)
    ws.writeState('kanban.json', b)
    ws.audit('mcp-kanban', `move ${cardId} -> ${toColumn}`)
    return ok(`Moved ${cardId} to ${toColumn}.`)
  }
)

// ---------- Sessions ----------

interface ChatMessage { id: string; role: string; content: string; ts: number }
interface Session { id: string; title: string; agent: string; status: string; archived: boolean; createdAt: number; updatedAt: number; messages: ChatMessage[] }

server.registerTool(
  'partnership_list_sessions',
  {
    title: 'List agent sessions',
    description: 'List conversation/agent sessions in the workspace (active by default).',
    inputSchema: { includeArchived: z.boolean().optional() },
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async ({ includeArchived }) => {
    const all = ws.readState<Session[]>('sessions.json', [])
    const shown = all.filter((s) => includeArchived || !s.archived)
    const text = shown.map((s) => `- ${s.title} [${s.agent}/${s.status}] (${s.messages.length} msgs) id=${s.id}`).join('\n')
    return ok(text || 'No sessions.', shown.map((s) => ({ id: s.id, title: s.title, agent: s.agent, status: s.status, messages: s.messages.length })))
  }
)

server.registerTool(
  'partnership_append_session_note',
  {
    title: 'Append a note to a session',
    description: 'Append a message/note to an existing session (by id) or create a new session with this note. Shows up in the app conversation.',
    inputSchema: {
      content: z.string().min(1),
      sessionId: z.string().optional().describe('Existing session id; omit to create a new session.'),
      title: z.string().optional().describe('Title when creating a new session.')
    },
    annotations: { readOnlyHint: false, openWorldHint: false }
  },
  async ({ content, sessionId, title }) => {
    const all = ws.readState<Session[]>('sessions.json', [])
    const msg: ChatMessage = { id: nanoid(), role: 'agent', content, ts: Date.now() }
    let target = sessionId ? all.find((s) => s.id === sessionId) : undefined
    if (!target) {
      target = {
        id: nanoid(),
        title: title ?? 'MCP note',
        agent: 'claude',
        status: 'idle',
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      }
      all.unshift(target)
    }
    target.messages.push(msg)
    target.updatedAt = Date.now()
    ws.writeState('sessions.json', all)
    ws.audit('mcp-session', `note -> ${target.id}`)
    return ok(`Appended note to session "${target.title}" (${target.id}).`)
  }
)

// ---------- Automations (read-only) ----------

server.registerTool(
  'partnership_list_automations',
  {
    title: 'List automations',
    description: 'List the workspace automations (cron jobs) and their schedules/status.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  },
  async () => {
    const list = ws.readState<{ name: string; scheduleLabel: string; enabled: boolean; kind: string; lastResult?: string }[]>(
      'automations.json',
      []
    )
    const text = list.map((a) => `- ${a.name} [${a.kind}] ${a.scheduleLabel} ${a.enabled ? 'ON' : 'off'}${a.lastResult ? ` last=${a.lastResult}` : ''}`).join('\n')
    return ok(text || 'No automations.', list)
  }
)

// ---------- boot ----------

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write(`partnership-mcp ready. workspace=${ws.root()}\n`)
}

main().catch((e) => {
  process.stderr.write(`partnership-mcp fatal: ${String(e)}\n`)
  process.exit(1)
})
