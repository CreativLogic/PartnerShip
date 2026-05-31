// Agent tool/skill schemas. The backend validates every call against the
// workspace root + permission model before applying.

export type ToolName = 'open_file' | 'edit_file' | 'run_command'

export interface OpenFileCall {
  tool: 'open_file'
  path: string // workspace-relative
}

export interface EditFileCall {
  tool: 'edit_file'
  path: string // workspace-relative
  /** Full replacement text. (Diff mode reserved for later.) */
  content: string
  mode?: 'replace'
}

export interface RunCommandCall {
  tool: 'run_command'
  command: string
  terminalId: string
}

export type ToolCall = OpenFileCall | EditFileCall | RunCommandCall

export interface ToolResult {
  tool: ToolName
  ok: boolean
  /** stdout, diff summary, or error message. */
  output: string
  path?: string
}

/** Permissions a session grants to the agent at a given moment. */
export interface SessionPermissions {
  canEditFiles: boolean
  canRunCommands: boolean
  /** Take-over active: agent may act without per-call confirmation. */
  takeOver: boolean
}

export const NO_PERMISSIONS: SessionPermissions = {
  canEditFiles: false,
  canRunCommands: false,
  takeOver: false
}
