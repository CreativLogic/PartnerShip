// AgentProvider interface — the seam between PartnerShip and any agent backend.
import type { AgentEvent, AgentMeta, InferPayload } from '@common/events'

export interface AgentProvider {
  listAgents(): Promise<AgentMeta[]>
  /** Stream events for a single inference. Honor `signal` for Stop. */
  sendMessage(payload: InferPayload, signal: AbortSignal): AsyncIterable<AgentEvent>
}

const registry = new Map<string, AgentProvider>()

export function register(kind: string, provider: AgentProvider): void {
  registry.set(kind, provider)
}

export function providerFor(agentId: string): AgentProvider {
  // agentId convention: "<kind>:<name>" e.g. "mock:default", "claude:code"
  const kind = agentId.split(':')[0] ?? 'mock'
  const p = registry.get(kind)
  if (!p) throw new Error(`No provider registered for kind: ${kind}`)
  return p
}

export async function listAllAgents(): Promise<AgentMeta[]> {
  const all: AgentMeta[] = []
  for (const p of registry.values()) all.push(...(await p.listAgents()))
  return all
}
