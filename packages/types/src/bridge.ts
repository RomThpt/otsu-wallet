export type BridgeDirection = 'xrpl-to-evm' | 'evm-to-xrpl'

export type BridgeStatus =
  | 'pending'
  | 'source_confirmed'
  | 'bridging'
  | 'destination_confirmed'
  | 'completed'
  | 'failed'

export interface BridgeTransaction {
  id: string
  direction: BridgeDirection
  sourceAddress: string
  destinationAddress: string
  sourceAmount: string
  destinationAmount: string
  sourceTxHash?: string
  destinationTxHash?: string
  status: BridgeStatus
  createdAt: number
  updatedAt: number
  completedAt?: number
  error?: string
}

export interface BridgeEstimate {
  fee: string
  estimatedTime: number
  sourceAmount: string
  destinationAmount: string
}
