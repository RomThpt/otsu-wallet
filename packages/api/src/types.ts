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

export interface NFTRecord {
  tokenID: string
  uri?: string
  flags: number
  transferFee: number
  issuer: string
  taxon: number
  serial: number
}

export interface DexOffer {
  seq: number
  takerGets: string | { currency: string; issuer: string; value: string }
  takerPays: string | { currency: string; issuer: string; value: string }
  flags: number
}

export interface TransactionStatus {
  hash: string
  validated: boolean
  result: string
  ledgerIndex: number
}

export interface ContractInfo {
  address: string
  functions: Array<{
    name: string
    parameters: Array<{
      flags: number
      sType: string
      label?: string
    }>
  }>
  owner?: string
  sourceUri?: string
}

export interface ContractCallParams {
  contractAddress: string
  functionName: string
  parameters?: Array<{ sType: string; value: string; flags: number }>
  fee?: string
}

export type OtsuEventType = 'accountChanged' | 'networkChanged' | 'connected' | 'disconnected'
export type OtsuEventCallback = (data: unknown) => void
