import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@common/ipc'
import type {
  Automation,
  AutomationRun,
  ConversationSession,
  FileNode,
  KanbanBoard,
  GlobalConfig,
  ShellKind,
  ShellOption
} from '@common/types'
import type { AgentEvent, AgentMeta, InferPayload, PresenceContext } from '@common/events'

const api = {
  // workspace / fs
  pickWorkspace: (): Promise<string | null> => ipcRenderer.invoke(IPC.workspacePick),
  openWorkspace: (root: string): Promise<string> => ipcRenderer.invoke(IPC.workspaceOpen, root),
  tree: (): Promise<FileNode> => ipcRenderer.invoke(IPC.fsTree),
  readFile: (p: string): Promise<string> => ipcRenderer.invoke(IPC.fsRead, p),
  writeFile: (p: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke(IPC.fsWrite, p, content),
  createEntry: (p: string, isDir: boolean): Promise<FileNode> =>
    ipcRenderer.invoke(IPC.fsCreate, p, isDir),
  renameEntry: (from: string, to: string): Promise<FileNode> =>
    ipcRenderer.invoke(IPC.fsRename, from, to),
  deleteEntry: (p: string): Promise<FileNode> => ipcRenderer.invoke(IPC.fsDelete, p),

  // terminals
  listShells: (): Promise<ShellOption[]> => ipcRenderer.invoke(IPC.ptyList),
  createTerminal: (
    id: string,
    kind: ShellKind,
    distro: string | undefined,
    cols: number,
    rows: number
  ): Promise<boolean> => ipcRenderer.invoke(IPC.ptyCreate, id, kind, distro, cols, rows),
  writeTerminal: (id: string, data: string): Promise<void> =>
    ipcRenderer.invoke(IPC.ptyWrite, id, data),
  resizeTerminal: (id: string, cols: number, rows: number): Promise<void> =>
    ipcRenderer.invoke(IPC.ptyResize, id, cols, rows),
  killTerminal: (id: string): Promise<void> => ipcRenderer.invoke(IPC.ptyKill, id),
  onTerminalData: (cb: (id: string, data: string) => void): (() => void) => {
    const h = (_e: unknown, p: { id: string; data: string }): void => cb(p.id, p.data)
    ipcRenderer.on(IPC.ptyData, h)
    return () => ipcRenderer.removeListener(IPC.ptyData, h)
  },

  // agents
  listAgents: (): Promise<AgentMeta[]> => ipcRenderer.invoke(IPC.agentList),
  infer: (payload: InferPayload): Promise<boolean> => ipcRenderer.invoke(IPC.agentInfer, payload),
  stopAgent: (sessionId: string): Promise<boolean> => ipcRenderer.invoke(IPC.agentStop, sessionId),
  onAgentEvent: (cb: (evt: AgentEvent) => void): (() => void) => {
    const h = (_e: unknown, evt: AgentEvent): void => cb(evt)
    ipcRenderer.on(IPC.agentEvent, h)
    return () => ipcRenderer.removeListener(IPC.agentEvent, h)
  },
  updatePresence: (ctx: PresenceContext): void => ipcRenderer.send(IPC.presenceUpdate, ctx),

  // sessions
  loadSessions: (): Promise<ConversationSession[]> => ipcRenderer.invoke(IPC.sessionsLoad),
  saveSessions: (s: ConversationSession[]): Promise<boolean> =>
    ipcRenderer.invoke(IPC.sessionsSave, s),
  commitSessionsLog: (s: ConversationSession[]): Promise<string> =>
    ipcRenderer.invoke(IPC.sessionsCommitLog, s),

  // automations
  listAutomations: (): Promise<Automation[]> => ipcRenderer.invoke(IPC.autoList),
  saveAutomation: (a: Automation): Promise<Automation[]> => ipcRenderer.invoke(IPC.autoSave, a),
  deleteAutomation: (id: string): Promise<Automation[]> => ipcRenderer.invoke(IPC.autoDelete, id),
  toggleAutomation: (id: string, enabled: boolean): Promise<Automation[]> =>
    ipcRenderer.invoke(IPC.autoToggle, id, enabled),
  runAutomation: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.autoRunNow, id),
  automationHistory: (id: string, limit = 50, offset = 0): Promise<AutomationRun[]> =>
    ipcRenderer.invoke(IPC.autoHistory, id, limit, offset),
  onAutomationFired: (cb: (id: string) => void): (() => void) => {
    const h = (_e: unknown, p: { id: string }): void => cb(p.id)
    ipcRenderer.on(IPC.autoFired, h)
    return () => ipcRenderer.removeListener(IPC.autoFired, h)
  },

  // kanban
  loadKanban: (): Promise<KanbanBoard> => ipcRenderer.invoke(IPC.kanbanLoad),
  saveKanban: (board: KanbanBoard): Promise<boolean> => ipcRenderer.invoke(IPC.kanbanSave, board),

  // config
  getConfig: (): Promise<GlobalConfig> => ipcRenderer.invoke(IPC.configGet),
  setConfig: (patch: Partial<GlobalConfig>): Promise<GlobalConfig> =>
    ipcRenderer.invoke(IPC.configSet, patch),

  // claude (subscription) status
  claudeStatus: (): Promise<{ installed: boolean; mode: string; hasToken: boolean }> =>
    ipcRenderer.invoke(IPC.claudeStatus)
}

export type PartnerShipApi = typeof api

contextBridge.exposeInMainWorld('partnership', api)
