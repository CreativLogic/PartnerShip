// PartnerShip shared data model. Imported by main, preload, and renderer.
// This is the contract — keep it stable; everything else depends on it.

export type AgentKind = 'claude' | 'hermes' | 'mock'

export type SessionStatus = 'idle' | 'running' | 'scheduled' | 'paused'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent' | 'system' | 'tool'
  content: string
  ts: number
  /** Tool calls/results attached to an agent turn, if any. */
  toolName?: string
}

export interface ConversationSession {
  id: string
  title: string
  agent: AgentKind
  status: SessionStatus
  createdAt: number
  updatedAt: number
  archived: boolean
  messages: ChatMessage[]
  /** Optional links into the workspace. */
  linkedFilePath?: string
  linkedCardId?: string
  /** Which agent workspace pane (0 or 1) this session is bound to, if any. */
  paneIndex?: 0 | 1
  unread?: boolean
}

export type AutomationKind = 'thread' | 'standalone'

export interface Automation {
  id: string
  name: string
  kind: AutomationKind
  /** thread automations target a session; standalone use workspace scope. */
  sessionId?: string
  /** Instruction/prompt fired on each tick. */
  instruction: string
  /** Raw cron expression (5-field). */
  cron: string
  /** Human-readable schedule label, e.g. "Every day at 9:00". */
  scheduleLabel: string
  enabled: boolean
  allowTools: boolean
  createdAt: number
  lastRunId?: string
  lastResult?: AutomationResult
  lastRunAt?: number
}

export type AutomationResult = 'success' | 'error' | 'no-change'

export interface AutomationRun {
  id: string
  automationId: string
  ts: number
  result: AutomationResult
  summary: string
  durationMs: number
}

export interface KanbanCard {
  id: string
  title: string
  description?: string
  sessionId?: string
  filePath?: string
  createdAt: number
}

export interface KanbanColumn {
  id: string
  title: string
  cardIds: string[]
}

export interface KanbanBoard {
  columns: KanbanColumn[]
  cards: Record<string, KanbanCard>
}

export interface FileNode {
  name: string
  path: string // absolute, always inside workspace root
  rel: string // relative to workspace root
  isDir: boolean
  /** Editable in Monaco (markdown). Non-md shown read-only/disabled in v1. */
  editable: boolean
  children?: FileNode[]
}

export type ShellKind = 'powershell' | 'cmd' | 'wsl' | 'bash' | 'zsh'

export interface ShellOption {
  kind: ShellKind
  label: string
  /** For wsl: the distro name. */
  distro?: string
}

export interface WorkspaceSettings {
  root: string
  openFiles: string[]
  activeFile?: string
  conversationLimit: number // default 13
}

export type ClaudeAuthMode = 'subscription' | 'apiKey'

export interface ClaudeConfig {
  /** subscription = drive the `claude` CLI (Pro/Max OAuth, no API billing). */
  mode: ClaudeAuthMode
  /** Long-lived token from `claude setup-token` (subscription, headless). */
  oauthToken?: string
  /** Only used when mode === 'apiKey'. */
  apiKey?: string
  /** Claude Code permission mode when take-over is off. */
  permissionMode?: 'default' | 'acceptEdits' | 'plan'
  /** Extra MCP servers to load into the in-app Claude, by name. */
  extraMcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }>
}

export interface GlobalConfig {
  theme: 'dark' | 'light'
  lastWorkspace?: string
  recentWorkspaces: string[]
  agentEndpoints: {
    claude?: string
    hermes?: string
  }
  claude?: ClaudeConfig
  layout?: Record<string, number>
}

export const DEFAULT_KANBAN: () => KanbanBoard = () => ({
  columns: [
    { id: 'backlog', title: 'Backlog', cardIds: [] },
    { id: 'in-progress', title: 'In progress', cardIds: [] },
    { id: 'blocked', title: 'Blocked', cardIds: [] },
    { id: 'done', title: 'Done', cardIds: [] }
  ],
  cards: {}
})

export const CONVERSATION_LIMIT = 13
