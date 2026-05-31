// HTTP bridge provider for real agents (Claude Code / Hermes).
// Expects an endpoint that accepts POST /agent/infer and returns either an
// SSE/NDJSON stream of AgentEvent-shaped objects, or a single JSON response.
import type { AgentProvider } from './provider'
import type { AgentEvent, AgentMeta, InferPayload } from '@common/events'

export class HttpProvider implements AgentProvider {
  constructor(
    private readonly kind: 'claude' | 'hermes',
    private readonly endpoint: string | undefined
  ) {}

  async listAgents(): Promise<AgentMeta[]> {
    const online = Boolean(this.endpoint)
    const name = this.kind === 'claude' ? 'Claude Code' : 'Hermes'
    return [{ id: `${this.kind}:default`, name, kind: this.kind, online }]
  }

  async *sendMessage(payload: InferPayload, signal: AbortSignal): AsyncIterable<AgentEvent> {
    const { sessionId } = payload
    if (!this.endpoint) {
      yield {
        type: 'error',
        sessionId,
        message: `No endpoint configured for ${this.kind}. Set it in Settings.`
      }
      yield { type: 'done', sessionId }
      return
    }

    let res: Response
    try {
      res = await fetch(`${this.endpoint.replace(/\/$/, '')}/agent/infer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: payload.prompt }],
          tools: payload.allowTools ? ['open_file', 'edit_file', 'run_command'] : [],
          context: payload.context
        }),
        signal
      })
    } catch (e) {
      yield { type: 'error', sessionId, message: `Request failed: ${String(e)}` }
      yield { type: 'done', sessionId }
      return
    }

    if (!res.ok || !res.body) {
      yield { type: 'error', sessionId, message: `HTTP ${res.status}` }
      yield { type: 'done', sessionId }
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const raw of lines) {
        const line = raw.replace(/^data:\s?/, '').trim()
        if (!line || line === '[DONE]') continue
        try {
          const evt = JSON.parse(line) as Partial<AgentEvent>
          yield { sessionId, ...(evt as object) } as AgentEvent
        } catch {
          // treat non-JSON chunk as a raw token
          yield { type: 'token', sessionId, text: line }
        }
      }
    }
    yield { type: 'done', sessionId }
  }
}
