import { useEffect, useRef, useState } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { nanoid } from 'nanoid'
import type { ShellKind, ShellOption } from '@common/types'
import { api } from '../../lib/cn'
import { cn } from '../../lib/cn'
import { Plus, X } from 'lucide-react'

interface TermTab {
  id: string
  label: string
}

export function TerminalPane(): JSX.Element {
  const [tabs, setTabs] = useState<TermTab[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [shells, setShells] = useState<ShellOption[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    void api().listShells().then((s) => {
      setShells(s)
      if (s[0]) void spawn(s[0])
    })
    return () => {
      tabs.forEach((t) => void api().killTerminal(t.id))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function spawn(shell: ShellOption): Promise<void> {
    const id = nanoid()
    await api().createTerminal(id, shell.kind as ShellKind, shell.distro, 80, 24)
    setTabs((t) => [...t, { id, label: shell.label }])
    setActive(id)
    setPickerOpen(false)
  }

  function closeTab(id: string): void {
    void api().killTerminal(id)
    setTabs((t) => t.filter((x) => x.id !== id))
    setActive((a) => (a === id ? null : a))
  }

  return (
    <div className="ps-panel h-full flex flex-col">
      <div className="flex items-center border-b border-base-700/60 shrink-0 relative">
        <div className="flex items-stretch overflow-x-auto">
          {tabs.map((t) => (
            <div
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                'group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-base-700/40 cursor-pointer whitespace-nowrap',
                active === t.id ? 'bg-base-800 text-ink' : 'text-ink-dim hover:bg-base-850'
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-ship/70" />
              {t.label}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(t.id)
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-ink"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="px-2 py-1.5 text-ink-faint hover:text-ink"
          onClick={() => setPickerOpen((v) => !v)}
          title="New terminal"
        >
          <Plus size={14} />
        </button>
        {pickerOpen && (
          <div className="absolute right-2 top-9 z-30 ps-panel py-1 w-44 shadow-lg">
            {shells.map((s) => (
              <button
                key={s.label}
                className="w-full text-left px-3 py-1.5 text-sm text-ink-dim hover:text-ink hover:bg-base-800"
                onClick={() => void spawn(s)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 relative bg-[#0a0c10]">
        {tabs.map((t) => (
          <XtermView key={t.id} id={t.id} visible={active === t.id} />
        ))}
      </div>
    </div>
  )
}

function XtermView({ id, visible }: { id: string; visible: boolean }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!ref.current) return
    const term = new Terminal({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      cursorBlink: true,
      theme: {
        background: '#0a0c10',
        foreground: '#e6e9ef',
        cursor: '#22c55e',
        selectionBackground: '#252b38'
      }
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(ref.current)
    fit.fit()
    termRef.current = term
    fitRef.current = fit

    term.onData((d) => void api().writeTerminal(id, d))
    const offData = api().onTerminalData((tid, data) => {
      if (tid === id) term.write(data)
    })
    const onResize = (): void => {
      try {
        fit.fit()
        void api().resizeTerminal(id, term.cols, term.rows)
      } catch {
        /* not visible */
      }
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(ref.current)

    return () => {
      offData()
      ro.disconnect()
      term.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (visible && fitRef.current && termRef.current) {
      requestAnimationFrame(() => {
        try {
          fitRef.current?.fit()
          void api().resizeTerminal(id, termRef.current!.cols, termRef.current!.rows)
          termRef.current?.focus()
        } catch {
          /* noop */
        }
      })
    }
  }, [visible, id])

  return <div ref={ref} className={cn('absolute inset-0 p-1.5', visible ? 'block' : 'hidden')} />
}
