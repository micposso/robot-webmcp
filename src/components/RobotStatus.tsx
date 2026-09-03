import type { ReachyConnectionState } from '../reachy/types'

interface RobotStatusProps { connection: ReachyConnectionState }

const STATUS_LABEL = {
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  error: 'Error',
} as const

export function RobotStatus({ connection }: RobotStatusProps) {
  return (
    <section className="status-strip" aria-live="polite">
      <div>
        <span className={`status-dot status-dot--${connection.status}`} />
        <div>
          <p className="eyebrow">Robot status</p>
          <p className="status-value">{STATUS_LABEL[connection.status]}</p>
        </div>
      </div>
      <div className="robot-identity">
        <p className="eyebrow">Robot</p>
        <p>{connection.robotName ?? 'No robot selected'}</p>
      </div>
    </section>
  )
}

