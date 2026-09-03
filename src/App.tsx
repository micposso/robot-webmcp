import { useEffect, useState } from 'react'
import { RobotControls } from './components/RobotControls'
import { RobotStatus } from './components/RobotStatus'
import { centerHead, lookLeft, lookRight, nod, wiggleAntennas } from './reachy/movements'
import { reachyClient } from './reachy/reachyClient'
import type { MovementAction, ReachyConnectionState } from './reachy/types'
import './App.css'

function App() {
  const [connection, setConnection] = useState<ReachyConnectionState>(reachyClient.getState())
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => reachyClient.subscribe(setConnection), [])
  useEffect(() => { void reachyClient.connect().catch(() => undefined) }, [])

  const connect = () => { void reachyClient.connect().catch(() => undefined) }

  const runAction = async (action: MovementAction) => {
    setBusyAction(action)
    setActionError(null)
    try {
      const reachy = reachyClient.getRobot()
      const movement = {
        nod,
        lookLeft,
        lookRight,
        wiggleAntennas,
        center: centerHead,
      }[action]
      await movement(reachy)
    } catch (error) {
      console.error(`[Reachy] ${action} failed.`, error)
      setActionError(error instanceof Error ? error.message : String(error))
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true"><span /><span /></div>
        <div>
          <p className="eyebrow">Hardware bridge / Milestone 01</p>
          <h1>Reachy WebMCP</h1>
        </div>
        <p className="build-label">Developer console</p>
      </header>

      <RobotStatus connection={connection} />

      {(connection.error || actionError) && (
        <div className="error-banner" role="alert">
          <span aria-hidden="true">!</span>
          <p>{actionError ?? connection.error}</p>
        </div>
      )}

      <RobotControls
        connected={connection.status === 'connected'}
        connecting={connection.status === 'connecting'}
        busyAction={busyAction}
        onConnect={connect}
        onAction={runAction}
      />

      <section className="webmcp-section" aria-labelledby="webmcp-title">
        <div>
          <p className="eyebrow">Next milestone</p>
          <h2 id="webmcp-title">WebMCP</h2>
        </div>
        <p className="webmcp-status"><span /> Status: Not initialized</p>
      </section>

      <footer>
        <p>Commands travel peer-to-peer over WebRTC.</p>
        <p>SDK v1.8.0</p>
      </footer>
    </main>
  )
}

export default App
