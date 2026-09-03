import { centerHead, lookLeft, lookRight, nod, wiggleAntennas } from './movements'
import { reachyClient } from './reachyClient'
import type { MovementAction } from './types'

let activeAction: MovementAction | null = null

const movements = {
  nod,
  lookLeft,
  lookRight,
  wiggleAntennas,
  center: centerHead,
}

export async function runRobotMovement(
  action: MovementAction,
  signal?: AbortSignal,
) {
  if (activeAction) {
    throw new Error(`Reachy is already performing ${activeAction}. Wait for it to finish.`)
  }

  const reachy = reachyClient.getRobot()
  activeAction = action

  try {
    signal?.throwIfAborted()
    await movements[action](reachy, signal)
  } catch (error) {
    if (signal?.aborted && action !== 'center') {
      try {
        await centerHead(reachy)
      } catch (centerError) {
        console.warn('[Reachy] Could not center after a cancelled movement.', centerError)
      }
    }
    throw error
  } finally {
    activeAction = null
  }
}

