import { useMemo, useState } from 'react'
import { useApp, activeSessionCount, AT_LIMIT } from '../../store/app'
import { CONVERSATION_LIMIT, type AgentKind } from '@common/types'
import { cn } from '../../lib/cn'
import { Plus, Search, Archive, GitFork, Pencil, FileDown, Circle } from 'lucide-react'

const STATUS_DOT: Record<string, string> = {
  idle: 'text-ink-faint',
  running: 'text-ship',
  scheduled: 'text-user',
  paused: 'text-amber-400'
}

export function Conversations(): JSX.Element {
  const sessions = useApp((s) => s.sessions)
  const activeId = useApp((s) => s.activeSessionId)
  const select = useApp((s) => s.selectSession)
  const newSession = useApp((s) => s.newSession)
  const update = useApp((s) => s.updateSession)
  const archive = useApp((s) => s.archiveSession)
  const bindPane = useApp((s) => s.bindPane)
  const commitLog = useApp((s) => s.commitLog)

  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [agentFilter, setAgentFilter] = useState<AgentKind | 'all'>('all')

  const liveCount = activeSessionCount(sessions)
  const atLimit = AT_LIMIT(liveCount)

  const visible = useMemo(
    () =>
      sessions.filter(
        (s) =>
          s.archived === showArchived &&
          (agentFilter === 'all' || s.agent === agentFilter) &&
          s.title.toLowerCase().includes(query.toLowerCase())
      ),
    [sessions, showArchived, agentFilter, query]
  )

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 flex flex-col gap-2 border-b border-base-700/50">
        <div className="flex items-center gap-1.5">
          <button
            className="ps-btn flex-1 justify-center"
            onClick={() => {
              const s = newSession('mock', { title: 'New session' })
              bindPane(0, s.id)
            }}
          >
            <Plus size={14} /> New
          </button>
          <span className={cn('text-xs tabular-nums px-1.5', atLimit ? 'text-ship' : 'text-ink-faint')}>
            {liveCount}/{CONVERSATION_LIMIT}
          </span>
        </div>

        {/* commit-to-log — glows green at the cap */}
        <button
          onClick={() => void commitLog()}
          disabled={liveCount === 0}
          className={cn(
            'ps-btn justify-center w-full',
            atLimit ? 'ps-btn-ship animate-pulseglow' : 'opacity-90'
          )}
          title="Collapse all conversations into one markdown log and reset history"
        >
          <FileDown size={14} /> Commit conversations to log
        </button>

        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="ps-input w-full pl-7"
            placeholder="Search sessions"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <select
            className="ps-input py-1 flex-1"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value as AgentKind | 'all')}
          >
            <option value="all">All agents</option>
            <option value="mock">Mock</option>
            <option value="claude">Claude</option>
            <option value="hermes">Hermes</option>
          </select>
          <button
            className={cn('ps-tab', showArchived && 'ps-tab-active')}
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? 'Archived' : 'Active'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-1.5 flex flex-col gap-1">
        {visible.length === 0 && (
          <div className="text-xs text-ink-faint text-center py-6">No sessions.</div>
        )}
        {visible.map((s) => (
          <div
            key={s.id}
            onClick={() => {
              select(s.id)
              bindPane(0, s.id)
            }}
            className={cn(
              'group rounded-md px-2.5 py-2 cursor-pointer border border-transparent',
              activeId === s.id ? 'bg-base-800 border-base-600' : 'hover:bg-base-850'
            )}
          >
            <div className="flex items-center gap-1.5">
              <Circle size={8} className={cn('shrink-0 fill-current', STATUS_DOT[s.status])} />
              <span className="text-sm truncate flex-1">{s.title}</span>
              {s.unread && <span className="w-1.5 h-1.5 rounded-full bg-user" />}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[11px] text-ink-faint capitalize">{s.agent}</span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Mini title="Rename" onClick={() => {
                  const t = prompt('Rename session', s.title)
                  if (t) update(s.id, { title: t })
                }}><Pencil size={12} /></Mini>
                <Mini title="Fork" onClick={() => {
                  newSession(s.agent, { title: `${s.title} (fork)`, messages: [...s.messages] })
                }}><GitFork size={12} /></Mini>
                <Mini title="Archive" onClick={() => archive(s.id)}><Archive size={12} /></Mini>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Mini({
  children,
  onClick,
  title
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}): JSX.Element {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="p-1 rounded text-ink-faint hover:text-ink hover:bg-base-700"
    >
      {children}
    </button>
  )
}
