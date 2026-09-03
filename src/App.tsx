import { useEffect, useState } from 'react'
import { RobotControls } from './components/RobotControls'
import { RobotStatus } from './components/RobotStatus'
import { WebMCPActivity } from './components/WebMCPActivity'
import { reachyClient } from './reachy/reachyClient'
import { runRobotMovement } from './reachy/robotController'
import type { MovementAction, ReachyConnectionState } from './reachy/types'
import {
  getWebMCPState,
  initializeRobotTools,
  subscribeToWebMCP,
} from './webmcp/robotTools'
import { getWebMCPActivity, subscribeToWebMCPActivity } from './webmcp/activity'
import './App.css'

const WEBMCP_LABELS = {
  'not-initialized': 'Not initialized',
  registering: 'Registering tools',
  ready: 'Available',
  unsupported: 'Unsupported by this browser',
  error: 'Registration error',
} as const

function App() {
  const [connection, setConnection] = useState<ReachyConnectionState>(reachyClient.getState())
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [webMCP, setWebMCP] = useState(getWebMCPState())
  const [webMCPActivity, setWebMCPActivity] = useState(getWebMCPActivity())

  useEffect(() => reachyClient.subscribe(setConnection), [])
  useEffect(() => subscribeToWebMCP(setWebMCP), [])
  useEffect(() => subscribeToWebMCPActivity(setWebMCPActivity), [])
  useEffect(() => { void reachyClient.connect().catch(() => undefined) }, [])
  useEffect(() => { void initializeRobotTools() }, [])

  const connect = () => { void reachyClient.connect().catch(() => undefined) }

  const runAction = async (action: MovementAction) => {
    setBusyAction(action)
    setActionError(null)
    try {
      await runRobotMovement(action)
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
          <p className="eyebrow">Agent-ready robotics / Milestone 02</p>
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
          <p className="eyebrow">Browser tool layer</p>
          <h2 id="webmcp-title">WebMCP</h2>
        </div>
        <div className="webmcp-detail">
          <p className={`webmcp-status webmcp-status--${webMCP.status}`}>
            <span /> Status: {WEBMCP_LABELS[webMCP.status]}
          </p>
          {webMCP.status === 'ready' && (
            <p className="tool-count">{webMCP.toolCount} robot tools registered</p>
          )}
          {webMCP.error && <p className="tool-error">{webMCP.error}</p>}
        </div>
      </section>

      <WebMCPActivity activity={webMCPActivity} />

      <footer>
        <p>Commands travel peer-to-peer over WebRTC.</p>
        <p>SDK v1.8.0</p>
      </footer>
    </main>
  )
}

export default App
