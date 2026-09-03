export type WebMCPActivityStatus = 'running' | 'success' | 'error'

export interface WebMCPActivity {
  id: number
  toolName: string
  title: string
  status: WebMCPActivityStatus
  receivedAt: number
  completedAt: number | null
  error: string | null
}

type ActivityListener = (activity: WebMCPActivity[]) => void

const MAX_ACTIVITY_ITEMS = 12
const listeners = new Set<ActivityListener>()
let nextId = 1
let activity: WebMCPActivity[] = []

function publish(nextActivity: WebMCPActivity[]) {
  activity = nextActivity
  listeners.forEach((listener) => listener(activity))
}

export function getWebMCPActivity() {
  return activity
}

export function subscribeToWebMCPActivity(listener: ActivityListener) {
  listeners.add(listener)
  listener(activity)
  return () => { listeners.delete(listener) }
}

export function beginWebMCPActivity(toolName: string, title: string) {
  const item: WebMCPActivity = {
    id: nextId++,
    toolName,
    title,
    status: 'running',
    receivedAt: Date.now(),
    completedAt: null,
    error: null,
  }

  publish([item, ...activity].slice(0, MAX_ACTIVITY_ITEMS))
  return item.id
}

export function finishWebMCPActivity(
  id: number,
  status: Exclude<WebMCPActivityStatus, 'running'>,
  error: string | null = null,
) {
  publish(activity.map((item) => (
    item.id === id
      ? { ...item, status, completedAt: Date.now(), error }
      : item
  )))
}
