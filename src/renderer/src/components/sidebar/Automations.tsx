import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import { useApp } from '../../store/app'
import type { Automation, AutomationRun } from '@common/types'
import { api } from '../../lib/cn'
import { cn } from '../../lib/cn'
import { Plus, Play, Trash2, History, Power } from 'lucide-react'

const PRESETS: { label: string; cron: string }[] = [
  { label: 'Every 15 min', cron: '*/15 * * * *' },
  { label: 'Hourly', cron: '0 * * * *' },
  { label: 'Daily 9:00', cron: '0 9 * * *' },
  { label: 'Weekly Mon 9:00', cron: '0 9 * * 1' }
]

export function Automations(): JSX.Element {
  const automations = useApp((s) => s.automations)
  const load = useApp((s) => s.loadAutomations)
  const save = useApp((s) => s.saveAutomation)
  const sessions = useApp((s) => s.sessions)
  const [editing, setEditing] = useState<Automation | null>(null)
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const [runs, setRuns] = useState<AutomationRun[]>([])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (historyFor) void api().automationHistory(historyFor).then(setRuns)
  }, [historyFor])

  function blank(): Automation {
    return {
      id: nanoid(),
      name: 'New automation',
      kind: 'standalone',
      instruction: 'Summarize what changed in the workspace.',
      cron: '0 9 * * *',
      scheduleLabel: 'Daily 9:00',
      enabled: false,
      allowTools: false,
      createdAt: Date.now()
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-base-700/50">
        <button className="ps-btn w-full justify-center" onClick={() => setEditing(blank())}>
          <Plus size={14} /> New automation
        </button>
      </div>

      <div className="flex-1 overflow-auto p-1.5 flex flex-col gap-1.5">
        {automations.length === 0 && (
          <div className="text-xs text-ink-faint text-center py-6">No automations yet.</div>
        )}
        {automations.map((a) => (
          <div key={a.id} className="rounded-md border border-base-700/60 bg-base-850 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <button className="text-sm font-medium truncate text-left flex-1" onClick={() => setEditing(a)}>
                {a.name}
              </button>
              <button
                title={a.enabled ? 'Enabled' : 'Disabled'}
                onClick={() => void api().toggleAutomation(a.id, !a.enabled).then(() => load())}
                className={cn('p-1 rounded', a.enabled ? 'text-ship' : 'text-ink-faint')}
              >
                <Power size={14} />
              </button>
            </div>
            <div className="text-[11px] text-ink-faint mt-0.5">
              {a.scheduleLabel} · {a.kind}
              {a.lastResult && <span className={cn('ml-1', a.lastResult === 'error' && 'text-red-400')}>· {a.lastResult}</span>}
            </div>
            <div className="flex items-center gap-1 mt-1.5">
              <button className="ps-btn py-1 text-xs" onClick={() => void api().runAutomation(a.id).then(() => load())}>
                <Play size={12} /> Run now
              </button>
              <button className="ps-btn py-1 text-xs" onClick={() => setHistoryFor(historyFor === a.id ? null : a.id)}>
                <History size={12} /> History
              </button>
              <button
                className="ps-btn py-1 text-xs ml-auto"
                onClick={() => void api().deleteAutomation(a.id).then(() => load())}
              >
                <Trash2 size={12} />
              </button>
            </div>
            {historyFor === a.id && (
              <div className="mt-2 border-t border-base-700/50 pt-1.5 flex flex-col gap-1">
                {runs.length === 0 && <div className="text-[11px] text-ink-faint">No runs.</div>}
                {runs.map((r) => (
                  <div key={r.id} className="text-[11px] flex items-center gap-2">
                    <span className={cn(r.result === 'error' ? 'text-red-400' : r.result === 'success' ? 'text-ship' : 'text-ink-faint')}>
                      {r.result}
                    </span>
                    <span className="text-ink-faint">{new Date(r.ts).toLocaleString()}</span>
                    <span className="truncate text-ink-dim">{r.summary}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <Editor
          automation={editing}
          sessions={sessions.filter((s) => !s.archived).map((s) => ({ id: s.id, title: s.title }))}
          onClose={() => setEditing(null)}
          onSave={async (a) => {
            await save(a)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function Editor({
  automation,
  sessions,
  onClose,
  onSave
}: {
  automation: Automation
  sessions: { id: string; title: string }[]
  onClose: () => void
  onSave: (a: Automation) => void
}): JSX.Element {
  const [a, setA] = useState<Automation>(automation)
  return (
    <div className="absolute inset-0 z-20 bg-base-950/80 flex items-end" onClick={onClose}>
      <div
        className="ps-panel w-full max-h-[80%] overflow-auto p-3 flex flex-col gap-2.5 m-2"
        onClick={(e) => e.stopPropagation()}
      >
        <input className="ps-input" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Name" />
        <textarea
          className="ps-input min-h-[64px] resize-y"
          value={a.instruction}
          onChange={(e) => setA({ ...a, instruction: e.target.value })}
          placeholder="Instruction sent to the agent on each run"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-ink-dim">Type</label>
          <select className="ps-input flex-1 py-1" value={a.kind} onChange={(e) => setA({ ...a, kind: e.target.value as Automation['kind'] })}>
            <option value="standalone">Standalone</option>
            <option value="thread">Thread (wake a session)</option>
          </select>
        </div>
        {a.kind === 'thread' && (
          <select className="ps-input py-1" value={a.sessionId ?? ''} onChange={(e) => setA({ ...a, sessionId: e.target.value })}>
            <option value="">Select session…</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        )}
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.cron}
              className={cn('ps-tab', a.cron === p.cron && 'ps-tab-active')}
              onClick={() => setA({ ...a, cron: p.cron, scheduleLabel: p.label })}
            >
              {p.label}
            </button>
          ))}
        </div>
        <input
          className="ps-input font-mono"
          value={a.cron}
          onChange={(e) => setA({ ...a, cron: e.target.value, scheduleLabel: `cron: ${e.target.value}` })}
          placeholder="custom cron e.g. 0 9 * * 1"
        />
        <label className="flex items-center gap-2 text-sm text-ink-dim">
          <input type="checkbox" checked={a.allowTools} onChange={(e) => setA({ ...a, allowTools: e.target.checked })} />
          Allow agent to edit files / run commands
        </label>
        <div className="flex items-center gap-2 justify-end">
          <button className="ps-btn" onClick={onClose}>Cancel</button>
          <button className="ps-btn ps-btn-ship" onClick={() => onSave(a)}>Save</button>
        </div>
      </div>
    </div>
  )
}
