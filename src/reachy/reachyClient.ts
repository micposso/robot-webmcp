import { connectToHost } from '@pollen-robotics/reachy-mini-sdk/host/embed'
import type { ConnectedHandle } from '@pollen-robotics/reachy-mini-sdk/host/embed'
import type { ErrorEventDetail, ReachyMiniInstance } from '@pollen-robotics/reachy-mini-sdk'
import { centerHead } from './movements'
import type { ReachyConnectionState } from './types'

type StateListener = (state: ReachyConnectionState) => void

const INITIAL_STATE: ReachyConnectionState = {
  status: 'disconnected',
  robotName: null,
  error: null,
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  const message = raw.toLowerCase()

  if (message.includes('auth') || message.includes('token')) {
    return 'Authentication is required. Sign in through the Reachy host or configure a local Hugging Face token.'
  }
  if (message.includes('no reachable robot') || message.includes('no robot')) {
    return 'No available Reachy Mini was found. Check that the robot and its daemon are online.'
  }
  if (message.includes('busy') || message.includes('rejected')) {
    return 'Reachy is busy with another session. End that session, then try again.'
  }
  if (message.includes('webrtc') || message.includes('ice') || message.includes('data channel')) {
    return 'The WebRTC connection could not be established. Check the robot network and try again.'
  }
  if (message.includes('timeout')) {
    return 'The robot connection timed out. Check that Reachy is online and reachable.'
  }
  return raw || 'An unknown Reachy connection error occurred.'
}

class ReachyClient {
  private state: ReachyConnectionState = INITIAL_STATE
  private listeners = new Set<StateListener>()
  private handle: ConnectedHandle | null = null
  private connectPromise: Promise<ReachyMiniInstance> | null = null

  getState() { return this.state }

  subscribe(listener: StateListener) {
    this.listeners.add(listener)
    listener(this.state)
    return () => { this.listeners.delete(listener) }
  }

  private update(patch: Partial<ReachyConnectionState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((listener) => listener(this.state))
  }

  async connect(): Promise<ReachyMiniInstance> {
    if (this.handle?.reachy && this.state.status === 'connected') return this.handle.reachy
    if (this.connectPromise) return this.connectPromise

    this.update({ status: 'connecting', error: null })
    this.connectPromise = this.openConnection()
    try {
      return await this.connectPromise
    } finally {
      this.connectPromise = null
    }
  }

  private async openConnection() {
    try {
      const handle = await connectToHost()
      this.handle = handle
      const selectedId = handle.reachy.preselectedRobotId
      const robotName = handle.reachy.robots.find((robot) => robot.id === selectedId)?.meta?.name
        ?? handle.hostName
        ?? null

      handle.reachy.addEventListener('disconnected', () => {
        this.handle = null
        this.update({ status: 'disconnected', robotName: null, error: 'The connection to Reachy was interrupted.' })
      })

      handle.reachy.addEventListener('error', (event) => {
        const detail = (event as CustomEvent<ErrorEventDetail>).detail
        console.error(`[Reachy ${detail.source} error]`, detail.error)
        this.update({ status: 'error', error: errorMessage(detail.error) })
      })

      handle.onLeave(async () => {
        try {
          await centerHead(handle.reachy)
        } catch (error) {
          console.warn('[Reachy] Could not center during shutdown.', error)
        }
        this.handle = null
        this.update({ status: 'disconnected', robotName: null })
      })

      this.update({ status: 'connected', robotName, error: null })
      return handle.reachy
    } catch (error) {
      console.error('[Reachy] Connection failed.', error)
      const message = errorMessage(error)
      this.update({ status: 'error', robotName: null, error: message })
      throw new Error(message, { cause: error })
    }
  }

  getRobot() {
    if (!this.handle?.reachy || this.state.status !== 'connected') {
      throw new Error('Reachy is not connected. Connect to a robot first.')
    }
    return this.handle.reachy
  }

  disconnect() {
    if (this.handle) this.handle.requestLeave()
    else this.update({ status: 'disconnected', robotName: null, error: null })
  }
}

export const reachyClient = new ReachyClient()
