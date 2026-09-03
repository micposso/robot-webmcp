import type { MovementAction } from '../reachy/types'

interface RobotControlsProps {
  connected: boolean
  connecting: boolean
  busyAction: string | null
  onConnect: () => void
  onAction: (action: MovementAction) => void
}

const MOVEMENTS: Array<{
  action: MovementAction
  label: string
  description: string
  icon: string
}> = [
  { action: 'nod', label: 'Nod', description: 'Gentle yes', icon: '↓↑' },
  { action: 'lookLeft', label: 'Look left', description: 'Yaw −22°', icon: '←' },
  { action: 'lookRight', label: 'Look right', description: 'Yaw +22°', icon: '→' },
  { action: 'wiggleAntennas', label: 'Wiggle antennas', description: 'Two beats', icon: '⌁' },
  { action: 'center', label: 'Center', description: 'Neutral pose', icon: '◎' },
]

export function RobotControls({ connected, connecting, busyAction, onConnect, onAction }: RobotControlsProps) {
  return (
    <section className="control-section" aria-labelledby="controls-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Manual control</p>
          <h2 id="controls-title">Robot controls</h2>
        </div>
        <span className="shortcut-hint">Safe gestures only</span>
      </div>

      <button className="connect-button" type="button" onClick={onConnect} disabled={connected || connecting}>
        <span>{connecting ? 'Connecting…' : connected ? 'Reachy connected' : 'Connect Reachy'}</span>
        <span aria-hidden="true">↗</span>
      </button>

      <div className="movement-grid">
        {MOVEMENTS.map((movement) => (
          <button
            className="movement-button"
            type="button"
            onClick={() => onAction(movement.action)}
            disabled={!connected || busyAction !== null}
            key={movement.action}
          >
            <span className="movement-icon" aria-hidden="true">{movement.icon}</span>
            <span>{movement.label}</span>
            <small>{busyAction === movement.action ? 'Moving…' : movement.description}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
