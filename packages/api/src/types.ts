export interface NetworkInfo {
  network: string
}

export interface AddressInfo {
  address: string
}

export interface BalanceInfo {
  available: string
  total: string
  reserved: string
}

export interface SignedTransaction {
  tx_blob: string
  hash: string
}

export interface SignedMessage {
  signature: string
}

export type OtsuEventType = 'accountChanged' | 'networkChanged' | 'connected' | 'disconnected'
export type OtsuEventCallback = (data: unknown) => void
