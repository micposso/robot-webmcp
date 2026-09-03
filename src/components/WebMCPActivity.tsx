import type { WebMCPActivity as ActivityItem } from '../webmcp/activity'

interface WebMCPActivityProps {
  activity: ActivityItem[]
}

const STATUS_LABELS = {
  running: 'Executing',
  success: 'Completed',
  error: 'Failed',
} as const

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(timestamp)
}

function formatDuration(item: ActivityItem) {
  if (!item.completedAt) return 'in progress'
  return `${item.completedAt - item.receivedAt} ms`
}

export function WebMCPActivity({ activity }: WebMCPActivityProps) {
  const isLive = activity.some((item) => item.status === 'running')

  return (
    <section className={`activity-section${isLive ? ' activity-section--live' : ''}`} aria-labelledby="activity-title">
      <div className="activity-heading">
        <div>
          <p className="eyebrow">Live tool traffic</p>
          <h2 id="activity-title">WebMCP activity</h2>
        </div>
        <p className={`activity-signal${isLive ? ' activity-signal--live' : ''}`} aria-live="polite">
          <span aria-hidden="true" />
          {isLive ? 'Command in flight' : 'Listening for commands'}
        </p>
      </div>

      <div className="activity-route" aria-label="Command route">
        <span>Agent</span>
        <i aria-hidden="true" />
        <span>WebMCP</span>
        <i aria-hidden="true" />
        <span>Reachy</span>
      </div>

      {activity.length === 0 ? (
        <div className="activity-empty">
          <span className="activity-prompt" aria-hidden="true">›_</span>
          <p>Agent tool calls will appear here with their execution result.</p>
        </div>
      ) : (
        <ol className="activity-list" aria-live="polite">
          {activity.map((item) => (
            <li className={`activity-item activity-item--${item.status}`} key={item.id}>
              <span className="activity-item__marker" aria-hidden="true" />
              <div className="activity-item__identity">
                <strong>{item.title}</strong>
                <code>{item.toolName}</code>
              </div>
              <span className="activity-item__status">{STATUS_LABELS[item.status]}</span>
              <span className="activity-item__duration">{formatDuration(item)}</span>
              <time dateTime={new Date(item.receivedAt).toISOString()}>{formatTime(item.receivedAt)}</time>
              {item.error && <p className="activity-item__error">{item.error}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
