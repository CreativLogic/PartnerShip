import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type {
  ConversationSession,
  Automation,
  KanbanBoard,
  FileNode,
  AgentKind
} from '@common/types'
import { CONVERSATION_LIMIT, DEFAULT_KANBAN } from '@common/types'
import type { AgentMeta } from '@common/events'
import { api } from '../lib/cn'

export type SidebarTab = 'conversations' | 'automations' | 'kanban' | 'files'

interface OpenDoc {
  path: string
  rel: string
  text: string
  dirty: boolean
  savedAt?: number
}

interface AppState {
  // workspace
  root: string | null
  tree: FileNode | null
  // editor docs
  openDocs: OpenDoc[]
  activePath: string | null
  // sidebar
  sidebarTab: SidebarTab
  sidebarCollapsed: boolean
  // agents & sessions
  agents: AgentMeta[]
  sessions: ConversationSession[]
  activeSessionId: string | null
  agentPanes: [string | null, string | null] // session ids bound to pane 0/1
  agentPaneCount: 0 | 1 | 2
  // automations / kanban
  automations: Automation[]
  kanban: KanbanBoard
  // ui
  focusMode: boolean
  kanbanFull: boolean

  // actions
  init(): Promise<void>
  pickWorkspace(): Promise<void>
  openWorkspace(root: string): Promise<void>
  refreshTree(): Promise<void>
  openFile(path: string, rel: string): Promise<void>
  closeFile(path: string): void
  setActive(path: string): void
  editDoc(path: string, text: string): void
  saveDoc(path: string): Promise<void>
  setSidebarTab(t: SidebarTab): void
  toggleSidebar(): void
  toggleFocus(): void
  setKanbanFull(v: boolean): void

  newSession(agent?: AgentKind, seed?: Partial<ConversationSession>): ConversationSession
  selectSession(id: string): void
  updateSession(id: string, patch: Partial<ConversationSession>): void
  appendMessage(id: string, role: 'user' | 'agent' | 'system' | 'tool', content: string): string
  appendToMessage(id: string, messageId: string, text: string): void
  archiveSession(id: string): void
  bindPane(pane: 0 | 1, sessionId: string | null): void
  setPaneCount(n: 0 | 1 | 2): void
  persistSessions(): void
  commitLog(): Promise<void>

  loadAutomations(): Promise<void>
  saveAutomation(a: Automation): Promise<void>
  loadKanban(): Promise<void>
  saveKanban(b: KanbanBoard): Promise<void>
}

export const useApp = create<AppState>((set, get) => ({
  root: null,
  tree: null,
  openDocs: [],
  activePath: null,
  sidebarTab: 'conversations',
  sidebarCollapsed: false,
  agents: [],
  sessions: [],
  activeSessionId: null,
  agentPanes: [null, null],
  agentPaneCount: 1,
  automations: [],
  kanban: DEFAULT_KANBAN(),
  focusMode: false,
  kanbanFull: false,

  async init() {
    const cfg = await api().getConfig()
    const agents = await api().listAgents()
    set({ agents })
    if (cfg.lastWorkspace) {
      try {
        await get().openWorkspace(cfg.lastWorkspace)
      } catch {
        /* workspace gone */
      }
    }
  },

  async pickWorkspace() {
    const root = await api().pickWorkspace()
    if (root) await get().openWorkspace(root)
  },

  async openWorkspace(root) {
    await api().openWorkspace(root)
    set({ root })
    await get().refreshTree()
    const [sessions, automations, kanban] = await Promise.all([
      api().loadSessions(),
      api().listAutomations(),
      api().loadKanban()
    ])
    set({
      sessions,
      automations,
      kanban,
      activeSessionId: sessions.find((s) => !s.archived)?.id ?? null
    })
  },

  async refreshTree() {
    const tree = await api().tree()
    set({ tree })
  },

  async openFile(path, rel) {
    const existing = get().openDocs.find((d) => d.path === path)
    if (existing) {
      set({ activePath: path })
      return
    }
    const text = await api().readFile(rel)
    set((s) => ({
      openDocs: [...s.openDocs, { path, rel, text, dirty: false }],
      activePath: path
    }))
  },

  closeFile(path) {
    set((s) => {
      const openDocs = s.openDocs.filter((d) => d.path !== path)
      const activePath = s.activePath === path ? (openDocs.at(-1)?.path ?? null) : s.activePath
      return { openDocs, activePath }
    })
  },

  setActive(path) {
    set({ activePath: path })
  },

  editDoc(path, text) {
    set((s) => ({
      openDocs: s.openDocs.map((d) => (d.path === path ? { ...d, text, dirty: true } : d))
    }))
  },

  async saveDoc(path) {
    const doc = get().openDocs.find((d) => d.path === path)
    if (!doc) return
    await api().writeFile(doc.rel, doc.text)
    set((s) => ({
      openDocs: s.openDocs.map((d) =>
        d.path === path ? { ...d, dirty: false, savedAt: Date.now() } : d
      )
    }))
  },

  setSidebarTab(t) {
    set({ sidebarTab: t })
  },
  toggleSidebar() {
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }))
  },
  toggleFocus() {
    set((s) => ({ focusMode: !s.focusMode }))
  },
  setKanbanFull(v) {
    set({ kanbanFull: v })
  },

  newSession(agent = 'mock', seed = {}) {
    const now = Date.now()
    const session: ConversationSession = {
      id: nanoid(),
      title: seed.title ?? 'New session',
      agent,
      status: 'idle',
      createdAt: now,
      updatedAt: now,
      archived: false,
      messages: [],
      ...seed
    }
    set((s) => ({ sessions: [session, ...s.sessions], activeSessionId: session.id }))
    get().persistSessions()
    return session
  },

  selectSession(id) {
    set({ activeSessionId: id })
  },

  updateSession(id, patch) {
    set((s) => ({
      sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x))
    }))
    get().persistSessions()
  },

  appendMessage(id, role, content) {
    const messageId = nanoid()
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === id
          ? {
              ...x,
              updatedAt: Date.now(),
              messages: [...x.messages, { id: messageId, role, content, ts: Date.now() }]
            }
          : x
      )
    }))
    get().persistSessions()
    return messageId
  },

  appendToMessage(id, messageId, text) {
    set((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === id
          ? {
              ...x,
              messages: x.messages.map((m) =>
                m.id === messageId ? { ...m, content: m.content + text } : m
              )
            }
          : x
      )
    }))
  },

  archiveSession(id) {
    get().updateSession(id, { archived: true })
  },

  bindPane(pane, sessionId) {
    set((s) => {
      const panes = [...s.agentPanes] as [string | null, string | null]
      panes[pane] = sessionId
      return { agentPanes: panes }
    })
  },

  setPaneCount(n) {
    set({ agentPaneCount: n })
  },

  persistSessions() {
    void api().saveSessions(get().sessions)
  },

  async commitLog() {
    const active = get().sessions.filter((s) => !s.archived)
    const name = await api().commitSessionsLog(active)
    // collapse: archive all, keep nothing; reopen the log file
    set((s) => ({ sessions: s.sessions.map((x) => ({ ...x, archived: true })) }))
    get().persistSessions()
    await get().refreshTree()
    await get().openFile(`${get().root}/${name}`, name)
  },

  async loadAutomations() {
    set({ automations: await api().listAutomations() })
  },
  async saveAutomation(a) {
    set({ automations: await api().saveAutomation(a) })
  },
  async loadKanban() {
    set({ kanban: await api().loadKanban() })
  },
  async saveKanban(b) {
    set({ kanban: b })
    await api().saveKanban(b)
  }
}))

export function activeSessionCount(sessions: ConversationSession[]): number {
  return sessions.filter((s) => !s.archived).length
}

export const AT_LIMIT = (n: number): boolean => n >= CONVERSATION_LIMIT
