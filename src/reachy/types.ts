export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'

export interface ReachyConnectionState {
  status: ConnectionStatus
  robotName: string | null
  error: string | null
}

export type MovementAction =
  | 'nod'
  | 'lookLeft'
  | 'lookRight'
  | 'wiggleAntennas'
  | 'center'
