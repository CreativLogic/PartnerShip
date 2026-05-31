// Streaming event protocol between agent provider (main) and renderer.
import type { ToolCall, ToolResult } from './tools'

export type AgentEvent =
  | { type: 'token'; sessionId: string; text: string }
  | { type: 'message-start'; sessionId: string; messageId: string }
  | { type: 'message-end'; sessionId: string; messageId: string }
  | { type: 'tool-call'; sessionId: string; call: ToolCall }
  | { type: 'tool-result'; sessionId: string; result: ToolResult }
  | { type: 'status'; sessionId: string; status: string }
  | { type: 'error'; sessionId: string; message: string }
  | { type: 'done'; sessionId: string }

/** Presence/context the renderer streams up so agents can "see" the user. */
export interface PresenceContext {
  workspaceRoot?: string
  activeFilePath?: string
  activeFileText?: string
  selection?: string
  focusedTerminalId?: string
  terminalTail?: string // last N lines, summarized
  recentEditSummary?: string
}

export interface AgentMeta {
  id: string
  name: string
  kind: 'claude' | 'hermes' | 'mock'
  online: boolean
}

export interface InferPayload {
  sessionId: string
  agentId: string
  prompt: string
  context: PresenceContext
  allowTools: boolean
}
