import { useEffect, useRef } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { useApp } from '../../store/app'
import { api } from '../../lib/cn'
import { cn } from '../../lib/cn'
import { X, Check, Circle } from 'lucide-react'

export function MarkdownEditor(): JSX.Element {
  const openDocs = useApp((s) => s.openDocs)
  const activePath = useApp((s) => s.activePath)
  const setActive = useApp((s) => s.setActive)
  const closeFile = useApp((s) => s.closeFile)
  const editDoc = useApp((s) => s.editDoc)
  const saveDoc = useApp((s) => s.saveDoc)
  const root = useApp((s) => s.root)

  const doc = openDocs.find((d) => d.path === activePath)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  // autosave: debounce 1.2s after edits
  useEffect(() => {
    if (!doc?.dirty) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void saveDoc(doc.path), 1200)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [doc?.text, doc?.dirty, doc?.path, saveDoc])

  // stream presence so agents can see the active file
  useEffect(() => {
    api().updatePresence({
      workspaceRoot: root ?? undefined,
      activeFilePath: doc?.rel,
      activeFileText: doc?.text
    })
  }, [doc?.rel, doc?.text, root])

  const onMount: OnMount = (editor) => {
    editorRef.current = editor
    editor.onDidChangeCursorSelection(() => {
      const sel = editor.getModel()?.getValueInRange(editor.getSelection()!) ?? ''
      api().updatePresence({ selection: sel })
    })
  }

  if (openDocs.length === 0) {
    return (
      <div className="ps-panel h-full flex items-center justify-center text-ink-faint text-sm">
        Open a markdown file from the Files tab to start.
      </div>
    )
  }

  return (
    <div className="ps-panel h-full flex flex-col">
      {/* tabs */}
      <div className="flex items-stretch border-b border-base-700/60 overflow-x-auto shrink-0">
        {openDocs.map((d) => (
          <div
            key={d.path}
            onClick={() => setActive(d.path)}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-2 text-sm border-r border-base-700/40 cursor-pointer whitespace-nowrap',
              activePath === d.path ? 'bg-base-800 text-ink' : 'text-ink-dim hover:bg-base-850'
            )}
          >
            {d.dirty ? <Circle size={8} className="fill-current text-amber-400" /> : <FileTextDot />}
            <span>{d.rel.split(/[\\/]/).pop()}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                closeFile(d.path)
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-ink rounded"
            >
              <X size={13} />
            </button>
          </div>
        ))}
        <div className="flex-1" />
        {doc && (
          <div className="flex items-center gap-1 px-3 text-xs text-ink-faint">
            {doc.dirty ? (
              <span className="text-amber-400/80">unsaved…</span>
            ) : (
              <span className="flex items-center gap-1 text-ship/80">
                <Check size={12} /> Saved
              </span>
            )}
          </div>
        )}
      </div>

      {/* monaco */}
      <div className="flex-1 min-h-0">
        {doc && (
          <Editor
            height="100%"
            theme="vs-dark"
            language="markdown"
            path={doc.path}
            value={doc.text}
            onMount={onMount}
            onChange={(v) => editDoc(doc.path, v ?? '')}
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              wordWrap: 'on',
              minimap: { enabled: false },
              lineNumbers: 'on',
              padding: { top: 12 },
              smoothScrolling: true,
              renderWhitespace: 'none',
              scrollBeyondLastLine: false,
              automaticLayout: true
            }}
          />
        )}
      </div>
    </div>
  )
}

function FileTextDot(): JSX.Element {
  return <span className="w-2 h-2 rounded-full bg-ship/50" />
}
