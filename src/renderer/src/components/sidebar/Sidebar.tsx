import { useApp, type SidebarTab } from '../../store/app'
import { Conversations } from './Conversations'
import { Automations } from './Automations'
import { KanbanCompact } from './Kanban'
import { FileTree } from './FileTree'
import { cn } from '../../lib/cn'
import { MessagesSquare, Clock4, KanbanSquare, FolderTree } from 'lucide-react'

const TABS: { id: SidebarTab; label: string; icon: JSX.Element }[] = [
  { id: 'conversations', label: 'Chats', icon: <MessagesSquare size={15} /> },
  { id: 'automations', label: 'Auto', icon: <Clock4 size={15} /> },
  { id: 'kanban', label: 'Board', icon: <KanbanSquare size={15} /> },
  { id: 'files', label: 'Files', icon: <FolderTree size={15} /> }
]

export function Sidebar(): JSX.Element {
  const tab = useApp((s) => s.sidebarTab)
  const setTab = useApp((s) => s.setSidebarTab)

  return (
    <div className="ps-panel h-full flex flex-col">
      <div className="flex items-center gap-0.5 p-1.5 border-b border-base-700/60">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn('ps-tab flex-1 flex items-center justify-center gap-1', tab === t.id && 'ps-tab-active')}
            title={t.label}
          >
            {t.icon}
            <span className="text-xs">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'conversations' && <Conversations />}
        {tab === 'automations' && <Automations />}
        {tab === 'kanban' && <KanbanCompact />}
        {tab === 'files' && <FileTree />}
      </div>
    </div>
  )
}
