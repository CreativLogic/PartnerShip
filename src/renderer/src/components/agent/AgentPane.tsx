import { useEffect, useRef, useState } from 'react'
import { useApp } from '../../store/app'
import type { AgentKind, ChatMessage } from '@common/types'
import { api } from '../../lib/cn'
import { cn } from '../../lib/cn'
import { Send, Zap, Square, Bot, ChevronDown } from 'lucide-react'

const ROLE_STYLE: Record<ChatMessage['role'], string> = {
  user: 'bg-user/10 border-user/30 text-ink',
  agent: 'bg-agent/10 border-agent/30 text-ink',
  system: 'bg-base-800 border-base-700 text-ink-dim italic',
  tool: 'bg-ship/10 border-ship/30 text-ship font-mono text-xs'
}

export function AgentPane({ pane }: { pane: 0 | 1 }): JSX.Element {
  const paneSession = useApp((s) => s.agentPanes[pane])
  const sessions = useApp((s) => s.sessions)
  const agents = useApp((s) => s.agents)
  const bindPane = useApp((s) => s.bindPane)
  const newSession = useApp((s) => s.newSession)
  const appendMessage = useApp((s) => s.appendMessage)
  const updateSession = useApp((s) => s.updateSession)
  const root = useApp((s) => s.root)
  const activeDoc = useApp((s) => s.openDocs.find((d) => d.path === s.activePath))

  const session = sessions.find((s) => s.id === paneSession && !s.archived)
  const [input, setInput] = useState('')
  const [takeOver, setTakeOver] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [session?.messages.length, session?.messages.at(-1)?.content])

  function ensureSession(): string {
    if (session) return session.id
    const s = newSession('mock', { title: `Agent ${pane + 1}` })
    bindPane(pane, s.id)
    return s.id
  }

  function send(): void {
    const text = input.trim()
    if (!text) return
    const sid = ensureSession()
    setInput('')

    if (text.startsWith('/')) {
      handleSlash(text, sid)
      return
    }

    appendMessage(sid, 'user', text)
    const s = useApp.getState().sessions.find((x) => x.id === sid)!
    void api().infer({
      sessionId: sid,
      agentId: `${s.agent}:default`,
      prompt: text,
      allowTools: takeOver,
      context: {
        workspaceRoot: root ?? undefined,
        activeFilePath: activeDoc?.rel,
        activeFileText: activeDoc?.text
      }
    })
  }

  function handleSlash(cmd: string, sid: string): void {
    const [c, ...rest] = cmd.slice(1).split(' ')
    const arg = rest.join(' ')
    switch (c) {
      case 'clear':
        updateSession(sid, { messages: [] })
        break
      case 'takeover':
        setTakeOver(true)
        appendMessage(sid, 'system', 'Take-over enabled. Agent can edit files and run commands.')
        break
      case 'stop':
        void api().stopAgent(sid)
        setTakeOver(false)
        break
      case 'model':
        if (['claude', 'hermes', 'mock'].includes(arg)) {
          updateSession(sid, { agent: arg as AgentKind })
          appendMessage(sid, 'system', `Switched to ${arg}.`)
        }
        break
      case 'rename':
        if (arg) updateSession(sid, { title: arg })
        break
      default:
        appendMessage(sid, 'system', `Unknown command: /${c}. Try /clear /takeover /stop /model /rename`)
    }
  }

  function stop(): void {
    if (session) void api().stopAgent(session.id)
  }

  return (
    <div className="ps-panel h-full flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-base-700/60 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bot size={15} className="text-agent shrink-0" />
          <span className="text-sm truncate">{session?.title ?? `Agent ${pane + 1}`}</span>
        </div>
        <div className="flex items-center gap-1">
          <AgentSelect
            value={session?.agent ?? 'mock'}
            agents={agents.map((a) => a.kind)}
            onChange={(k) => session && updateSession(session.id, { agent: k })}
          />
          <button
            onClick={() => setTakeOver((v) => !v)}
            className={cn('ps-btn py-1 text-xs', takeOver && 'ps-btn-ship animate-pulseglow')}
            title="Let agent edit files and run commands"
          >
            <Zap size={12} /> {takeOver ? 'Take-over on' : 'Take over'}
          </button>
          <button onClick={stop} className="ps-btn py-1 text-xs" title="Stop & revoke">
            <Square size={12} />
          </button>
        </div>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto p-2.5 flex flex-col gap-2">
        {!session && (
          <div className="text-xs text-ink-faint text-center py-8">
            Press <kbd className="px-1 bg-base-800 rounded">Ctrl+Shift+A</kbd> or type below to summon an agent here.
          </div>
        )}
        {session?.messages.map((m) => (
          <div key={m.id} className={cn('rounded-md border px-3 py-2 text-sm whitespace-pre-wrap break-words', ROLE_STYLE[m.role])}>
            {m.content || <span className="opacity-40">…</span>}
          </div>
        ))}
      </div>

      {/* input */}
      <div className="p-2 border-t border-base-700/60 shrink-0">
        <div className="flex items-end gap-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            rows={1}
            placeholder="Message agent or /command…"
            className="ps-input flex-1 resize-none max-h-32"
          />
          <button onClick={send} className="ps-btn ps-btn-ship">
            <Send size={14} />
          </button>
        </div>
        {takeOver && (
          <div className="text-[11px] text-ship/80 mt-1 px-1">
            Take-over active — edits ship to disk and commands run in the focused terminal.
          </div>
        )}
      </div>
    </div>
  )
}

function AgentSelect({
  value,
  agents,
  onChange
}: {
  value: AgentKind
  agents: AgentKind[]
  onChange: (k: AgentKind) => void
}): JSX.Element {
  const opts = Array.from(new Set<AgentKind>(['mock', 'claude', 'hermes', ...agents]))
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AgentKind)}
        className="ps-input py-1 pr-6 text-xs appearance-none capitalize"
      >
        {opts.map((k) => (
          <option key={k} value={k}>{k}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-faint" />
    </div>
  )
}
