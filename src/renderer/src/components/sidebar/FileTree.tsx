import { useState } from 'react'
import type { FileNode } from '@common/types'
import { useApp } from '../../store/app'
import { api } from '../../lib/cn'
import { cn } from '../../lib/cn'
import {
  ChevronRight,
  ChevronDown,
  FileText,
  File as FileIcon,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  RefreshCw
} from 'lucide-react'

export function FileTree(): JSX.Element {
  const tree = useApp((s) => s.tree)
  const refresh = useApp((s) => s.refreshTree)

  async function newFile(): Promise<void> {
    const name = prompt('New markdown file (relative path):', 'untitled.md')
    if (!name) return
    await api().createEntry(name.endsWith('.md') ? name : `${name}.md`, false)
    await refresh()
  }
  async function newFolder(): Promise<void> {
    const name = prompt('New folder (relative path):', 'notes')
    if (!name) return
    await api().createEntry(name, true)
    await refresh()
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-base-700/50">
        <span className="text-xs uppercase tracking-wide text-ink-faint">Files</span>
        <div className="flex items-center gap-0.5">
          <IconBtn onClick={() => void newFile()} title="New file"><FilePlus size={13} /></IconBtn>
          <IconBtn onClick={() => void newFolder()} title="New folder"><FolderPlus size={13} /></IconBtn>
          <IconBtn onClick={() => void refresh()} title="Refresh"><RefreshCw size={13} /></IconBtn>
        </div>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {tree?.children?.map((c) => <Node key={c.path} node={c} depth={0} />)}
      </div>
    </div>
  )
}

function Node({ node, depth }: { node: FileNode; depth: number }): JSX.Element {
  const [open, setOpen] = useState(depth < 1)
  const openFile = useApp((s) => s.openFile)
  const activePath = useApp((s) => s.activePath)
  const refresh = useApp((s) => s.refreshTree)

  const pad = { paddingLeft: 6 + depth * 12 }

  if (node.isDir) {
    return (
      <div>
        <button
          style={pad}
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center gap-1 py-1 pr-2 text-sm text-ink-dim hover:text-ink hover:bg-base-850"
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {open ? <FolderOpen size={14} className="text-user/70" /> : <Folder size={14} className="text-user/70" />}
          <span className="truncate">{node.name}</span>
        </button>
        {open && node.children?.map((c) => <Node key={c.path} node={c} depth={depth + 1} />)}
      </div>
    )
  }

  return (
    <button
      style={pad}
      onClick={() => node.editable && void openFile(node.path, node.rel)}
      onContextMenu={(e) => {
        e.preventDefault()
        if (confirm(`Delete ${node.rel}?`)) void api().deleteEntry(node.rel).then(() => refresh())
      }}
      disabled={!node.editable}
      className={cn(
        'w-full flex items-center gap-1.5 py-1 pr-2 text-sm hover:bg-base-850',
        node.editable ? 'text-ink-dim hover:text-ink' : 'text-ink-faint/60 cursor-default',
        activePath === node.path && 'bg-base-800 text-ink'
      )}
      title={node.editable ? node.rel : `${node.rel} (read-only in v1)`}
    >
      <span style={{ width: 13 }} />
      {node.editable ? <FileText size={14} className="text-ship/70" /> : <FileIcon size={14} />}
      <span className="truncate">{node.name}</span>
    </button>
  )
}

function IconBtn({
  children,
  onClick,
  title
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}): JSX.Element {
  return (
    <button onClick={onClick} title={title} className="p-1 rounded text-ink-faint hover:text-ink hover:bg-base-800">
      {children}
    </button>
  )
}
