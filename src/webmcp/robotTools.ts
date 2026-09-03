import { reachyClient } from '../reachy/reachyClient'
import { runRobotMovement } from '../reachy/robotController'
import type { MovementAction } from '../reachy/types'
import { beginWebMCPActivity, finishWebMCPActivity } from './activity'

export type WebMCPStatus = 'not-initialized' | 'registering' | 'ready' | 'unsupported' | 'error'

export interface WebMCPState {
  status: WebMCPStatus
  toolCount: number
  error: string | null
}

type StateListener = (state: WebMCPState) => void

const stateListeners = new Set<StateListener>()
let state: WebMCPState = { status: 'not-initialized', toolCount: 0, error: null }
let registrationPromise: Promise<WebMCPState> | null = null
let registrationController: AbortController | null = null

function updateState(patch: Partial<WebMCPState>) {
  state = { ...state, ...patch }
  stateListeners.forEach((listener) => listener(state))
}

function movementTool(
  name: string,
  title: string,
  description: string,
  action: MovementAction,
): WebMCP.ModelContextTool {
  return {
    name,
    title,
    description,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    async execute(_input, { signal }) {
      const activityId = beginWebMCPActivity(name, title)
      try {
        await runRobotMovement(action, signal)
        finishWebMCPActivity(activityId, 'success')
        return {
          success: true,
          action,
          message: `${title} completed successfully.`,
          robot: reachyClient.getState().robotName ?? 'Reachy Mini',
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        finishWebMCPActivity(activityId, 'error', message)
        throw error
      }
    },
    annotations: { readOnlyHint: false },
  }
}

const ROBOT_TOOLS: WebMCP.ModelContextTool[] = [
  {
    name: 'get_robot_status',
    title: 'Get robot status',
    description: 'Read the current Reachy Mini connection status and robot name without moving the robot.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    execute() {
      const activityId = beginWebMCPActivity('get_robot_status', 'Get robot status')
      try {
        const connection = reachyClient.getState()
        finishWebMCPActivity(activityId, 'success')
        return {
          connected: connection.status === 'connected',
          status: connection.status,
          robotName: connection.robotName,
          error: connection.error,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        finishWebMCPActivity(activityId, 'error', message)
        throw error
      }
    },
    annotations: { readOnlyHint: true },
  },
  movementTool('nod', 'Nod', 'Make the connected Reachy Mini perform one gentle nod and return its head upright.', 'nod'),
  movementTool('look_left', 'Look left', 'Turn the connected Reachy Mini head 22 degrees to its left. This physically moves the robot.', 'lookLeft'),
  movementTool('look_right', 'Look right', 'Turn the connected Reachy Mini head 22 degrees to its right. This physically moves the robot.', 'lookRight'),
  movementTool('wiggle_antennas', 'Wiggle antennas', 'Make the connected Reachy Mini perform two safe antenna beats and return them to neutral.', 'wiggleAntennas'),
  movementTool('center', 'Center robot', 'Return the connected Reachy Mini head, body yaw, and antennas to the documented neutral pose.', 'center'),
]

export function getWebMCPState() {
  return state
}

export function subscribeToWebMCP(listener: StateListener) {
  stateListeners.add(listener)
  listener(state)
  return () => { stateListeners.delete(listener) }
}

export function initializeRobotTools() {
  if (registrationPromise) return registrationPromise

  registrationPromise = (async () => {
    const modelContext = document.modelContext
    if (!modelContext) {
      updateState({ status: 'unsupported', toolCount: 0, error: null })
      return state
    }

    updateState({ status: 'registering', error: null })
    registrationController = new AbortController()

    try {
      await Promise.all(
        ROBOT_TOOLS.map((tool) =>
          modelContext.registerTool(tool, { signal: registrationController?.signal }),
        ),
      )
      updateState({ status: 'ready', toolCount: ROBOT_TOOLS.length, error: null })
    } catch (error) {
      registrationController.abort()
      const message = error instanceof Error ? error.message : String(error)
      console.error('[WebMCP] Robot tool registration failed.', error)
      updateState({ status: 'error', toolCount: 0, error: message })
    }

    return state
  })()

  return registrationPromise
}

export function unregisterRobotTools() {
  registrationController?.abort()
  registrationController = null
  registrationPromise = null
  updateState({ status: 'not-initialized', toolCount: 0, error: null })
}

if (import.meta.hot) {
  import.meta.hot.dispose(unregisterRobotTools)
}
