// Mock provider for v1: streams a believable response and can emit a sample
// tool call so the take-over / edit-highlight UI is exercisable end to end.
import { nanoid } from 'nanoid'
import type { AgentProvider } from './provider'
import type { AgentEvent, AgentMeta, InferPayload } from '@common/events'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class MockProvider implements AgentProvider {
  async listAgents(): Promise<AgentMeta[]> {
    return [{ id: 'mock:default', name: 'Mock Agent', kind: 'mock', online: true }]
  }

  async *sendMessage(payload: InferPayload, signal: AbortSignal): AsyncIterable<AgentEvent> {
    const { sessionId } = payload
    const messageId = nanoid()
    yield { type: 'message-start', sessionId, messageId }

    const ctx = payload.context
    const where = ctx.activeFilePath ? `\`${ctx.activeFilePath}\`` : 'no file open'
    const reply = `Looking at ${where}. ${
      payload.allowTools
        ? 'Take-over is on, so I can edit and run commands. Here is what I would do:'
        : 'I can see your context. Turn on take-over and I will apply changes directly.'
    }`

    for (const word of reply.split(' ')) {
      if (signal.aborted) {
        yield { type: 'done', sessionId }
        return
      }
      await sleep(35)
      yield { type: 'token', sessionId, text: word + ' ' }
    }
    yield { type: 'message-end', sessionId, messageId }

    if (payload.allowTools && ctx.activeFilePath) {
      await sleep(150)
      yield {
        type: 'tool-call',
        sessionId,
        call: {
          tool: 'edit_file',
          path: ctx.activeFilePath,
          content: (ctx.activeFileText ?? '') + `\n\n> Edited by Mock Agent at ${new Date().toLocaleTimeString()}\n`
        }
      }
    }

    yield { type: 'done', sessionId }
  }
}
