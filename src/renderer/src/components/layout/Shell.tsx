import { useEffect } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useApp } from '../../store/app'
import { LogoWordmark } from '../Logo'
import { Sidebar } from '../sidebar/Sidebar'
import { MarkdownEditor } from '../editor/MarkdownEditor'
import { TerminalPane } from '../terminal/TerminalPane'
import { AgentPane } from '../agent/AgentPane'
import { KanbanBoardView } from '../sidebar/Kanban'
import { Maximize2, Minimize2, PanelLeft, Columns2, Square, SquareSplitHorizontal } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Shell(): JSX.Element {
  const root = useApp((s) => s.root)
  const focusMode = useApp((s) => s.focusMode)
  const toggleFocus = useApp((s) => s.toggleFocus)
  const toggleSidebar = useApp((s) => s.toggleSidebar)
  const sidebarCollapsed = useApp((s) => s.sidebarCollapsed)
  const paneCount = useApp((s) => s.agentPaneCount)
  const setPaneCount = useApp((s) => s.setPaneCount)
  const kanbanFull = useApp((s) => s.kanbanFull)
  const setKanbanFull = useApp((s) => s.setKanbanFull)

  // Ctrl+Shift+A → ask agent here; Ctrl+B → sidebar; Ctrl+. → focus mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        askAgentHere()
      } else if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleSidebar()
      } else if (e.ctrlKey && e.key === '.') {
        e.preventDefault()
        toggleFocus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar, toggleFocus])

  const workspaceName = root?.split(/[\\/]/).filter(Boolean).pop() ?? 'workspace'

  return (
    <div className="h-full w-full flex flex-col bg-base-950 text-ink">
      {/* top bar */}
      <header className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-base-700/60 bg-base-900">
        <div className="flex items-center gap-3">
          <LogoWordmark />
          <span className="text-ink-faint">/</span>
          <span className="text-sm text-ink-dim truncate max-w-[280px]" title={root ?? ''}>
            {workspaceName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="ps-btn" onClick={toggleSidebar} title="Toggle sidebar (Ctrl+B)">
            <PanelLeft size={15} />
          </button>
          <div className="flex items-center rounded-md bg-base-850 border border-base-700">
            <PaneCountBtn icon={<Square size={14} />} active={paneCount === 1} onClick={() => setPaneCount(1)} label="1 agent" />
            <PaneCountBtn icon={<SquareSplitHorizontal size={14} />} active={paneCount === 2} onClick={() => setPaneCount(2)} label="2 agents" />
            <PaneCountBtn icon={<Columns2 size={14} />} active={paneCount === 0} onClick={() => setPaneCount(0)} label="hide agents" />
          </div>
          <button
            className={cn('ps-btn', kanbanFull && 'ps-btn-ship')}
            onClick={() => setKanbanFull(!kanbanFull)}
          >
            Board
          </button>
          <button className="ps-btn" onClick={toggleFocus} title="Focus mode (Ctrl+.)">
            {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </header>

      {/* body */}
      <div className="flex-1 min-h-0 p-2">
        <PanelGroup direction="horizontal" className="h-full">
          {!sidebarCollapsed && !focusMode && (
            <>
              <Panel defaultSize={20} minSize={14} maxSize={34} className="min-w-0">
                <Sidebar />
              </Panel>
              <PanelResizeHandle className="resizer-handle w-1.5 mx-0.5 rounded" />
            </>
          )}

          <Panel defaultSize={focusMode ? 100 : 52} minSize={28} className="min-w-0">
            {kanbanFull ? <KanbanBoardView /> : <MarkdownEditor />}
          </Panel>

          {!focusMode && paneCount > 0 && (
            <>
              <PanelResizeHandle className="resizer-handle w-1.5 mx-0.5 rounded" />
              <Panel defaultSize={28} minSize={20} className="min-w-0">
                <PanelGroup direction="vertical" className="h-full">
                  <Panel defaultSize={62} minSize={20} className="min-h-0">
                    {paneCount === 2 ? (
                      <PanelGroup direction="horizontal" className="h-full gap-1">
                        <Panel minSize={25} className="min-w-0">
                          <AgentPane pane={0} />
                        </Panel>
                        <PanelResizeHandle className="resizer-handle w-1.5 rounded" />
                        <Panel minSize={25} className="min-w-0">
                          <AgentPane pane={1} />
                        </Panel>
                      </PanelGroup>
                    ) : (
                      <AgentPane pane={0} />
                    )}
                  </Panel>
                  <PanelResizeHandle className="resizer-handle h-1.5 my-0.5 rounded" />
                  <Panel defaultSize={38} minSize={12} className="min-h-0">
                    <TerminalPane />
                  </Panel>
                </PanelGroup>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}

function PaneCountBtn({
  icon,
  active,
  onClick,
  label
}: {
  icon: JSX.Element
  active: boolean
  onClick: () => void
  label: string
}): JSX.Element {
  return (
    <button
      title={label}
      onClick={onClick}
      className={cn(
        'px-2 py-1.5 transition-colors first:rounded-l-md last:rounded-r-md',
        active ? 'bg-base-700 text-ink' : 'text-ink-faint hover:text-ink'
      )}
    >
      {icon}
    </button>
  )
}

function askAgentHere(): void {
  const s = useApp.getState()
  const doc = s.openDocs.find((d) => d.path === s.activePath)
  const session =
    s.sessions.find((x) => x.id === s.activeSessionId && !x.archived) ??
    s.newSession('mock', { title: doc ? `Help: ${doc.rel}` : 'Quick help' })
  if (doc) s.updateSession(session.id, { linkedFilePath: doc.rel })
  s.selectSession(session.id)
  if (s.agentPaneCount === 0) s.setPaneCount(1)
  s.bindPane(0, session.id)
}
