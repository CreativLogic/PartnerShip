import { useEffect, useRef } from 'react'
import { useApp } from '../store/app'
import { api } from '../lib/cn'

// Subscribes to streamed agent events and folds them into session state.
export function useAgentStream(): void {
  const streaming = useRef<Map<string, string>>(new Map()) // sessionId -> messageId

  useEffect(() => {
    const off = api().onAgentEvent((evt) => {
      const store = useApp.getState()
      switch (evt.type) {
        case 'message-start': {
          const mid = store.appendMessage(evt.sessionId, 'agent', '')
          streaming.current.set(evt.sessionId, mid)
          store.updateSession(evt.sessionId, { status: 'running' })
          break
        }
        case 'token': {
          const mid = streaming.current.get(evt.sessionId)
          if (mid) store.appendToMessage(evt.sessionId, mid, evt.text)
          break
        }
        case 'message-end': {
          streaming.current.delete(evt.sessionId)
          store.persistSessions()
          break
        }
        case 'tool-call': {
          store.appendMessage(
            evt.sessionId,
            'tool',
            `⟶ ${evt.call.tool}${'path' in evt.call ? ` ${evt.call.path}` : ''}`
          )
          break
        }
        case 'tool-result': {
          store.appendMessage(
            evt.sessionId,
            'tool',
            `${evt.result.ok ? '✓' : '✕'} ${evt.result.output.slice(0, 200)}`
          )
          if (evt.result.tool === 'edit_file') void store.refreshTree()
          break
        }
        case 'error': {
          store.appendMessage(evt.sessionId, 'system', `Error: ${evt.message}`)
          break
        }
        case 'done': {
          streaming.current.delete(evt.sessionId)
          store.updateSession(evt.sessionId, { status: 'idle' })
          break
        }
      }
    })
    const offFired = api().onAutomationFired(() => void useApp.getState().loadAutomations())
    return () => {
      off()
      offFired()
    }
  }, [])
}
