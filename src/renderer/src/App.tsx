import { useEffect } from 'react'
import { useApp } from './store/app'
import { useAgentStream } from './hooks/useAgentStream'
import { Shell } from './components/layout/Shell'
import { WelcomeScreen } from './components/layout/WelcomeScreen'

export default function App(): JSX.Element {
  const root = useApp((s) => s.root)
  const init = useApp((s) => s.init)
  useAgentStream()

  useEffect(() => {
    void init()
  }, [init])

  return <div className="h-full w-full">{root ? <Shell /> : <WelcomeScreen />}</div>
}
