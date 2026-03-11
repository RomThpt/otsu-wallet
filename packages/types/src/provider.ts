export type ProviderMethod =
  | 'connect'
  | 'disconnect'
  | 'getAddress'
  | 'getNetwork'
  | 'getBalance'
  | 'signTransaction'
  | 'signAndSubmit'
  | 'signMessage'
  | 'switchNetwork'
  | 'getNFTs'
  | 'getAccountOffers'
  | 'getTransactionStatus'
  | 'getContractInfo'
  | 'contractCall'

export type ProviderEventType = 'accountChanged' | 'networkChanged' | 'connected' | 'disconnected'

export interface OtsuProviderRequest {
  id: string
  method: ProviderMethod
  params?: unknown
  origin?: string
  favicon?: string
  title?: string
}

export interface OtsuProviderResponse {
  id: string
  result?: unknown
  error?: string
}

export interface OtsuEvent {
  type: ProviderEventType
  data?: unknown
}

export interface SigningRequest {
  id: string
  origin: string
  favicon?: string
  title?: string
  method: 'signTransaction' | 'signAndSubmit' | 'signMessage' | 'connect'
  params?: unknown
  createdAt: number
}
