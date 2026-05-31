import { useEffect, useState } from 'react'
import { Logo } from '../Logo'
import { useApp } from '../../store/app'
import { api } from '../../lib/cn'
import { FolderOpen, Clock } from 'lucide-react'

export function WelcomeScreen(): JSX.Element {
  const pick = useApp((s) => s.pickWorkspace)
  const open = useApp((s) => s.openWorkspace)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    void api()
      .getConfig()
      .then((c) => setRecent(c.recentWorkspaces ?? []))
  }, [])

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-base-950 text-ink">
      <div className="flex flex-col items-center gap-5 max-w-md w-full px-6">
        <Logo size={72} />
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Partner<span className="text-ship">Ship</span>
          </h1>
          <p className="text-ink-dim text-sm mt-1">
            You and your agents, side by side. Edits ship straight to disk.
          </p>
        </div>
        <button className="ps-btn ps-btn-ship w-full justify-center py-2.5" onClick={() => void pick()}>
          <FolderOpen size={16} /> Open a workspace folder
        </button>
        {recent.length > 0 && (
          <div className="w-full">
            <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">Recent</div>
            <div className="flex flex-col gap-1">
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => void open(r)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-ink-dim
                    hover:text-ink hover:bg-base-850 text-left truncate"
                  title={r}
                >
                  <Clock size={14} className="shrink-0" />
                  <span className="truncate">{r}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
