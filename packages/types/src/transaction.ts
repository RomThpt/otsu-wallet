export type TransactionDirection = 'sent' | 'received' | 'self' | 'other'

export type TransactionType =
  | 'Payment'
  | 'TrustSet'
  | 'OfferCreate'
  | 'OfferCancel'
  | 'AccountSet'
  | 'EscrowCreate'
  | 'EscrowFinish'
  | 'EscrowCancel'
  | 'NFTokenMint'
  | 'NFTokenBurn'
  | 'NFTokenCreateOffer'
  | 'NFTokenAcceptOffer'
  | 'NFTokenCancelOffer'
  | 'CheckCreate'
  | 'CheckCash'
  | 'CheckCancel'
  | 'ContractCall'
  | 'Other'

export interface TransactionAmount {
  currency: string
  value: string
  issuer?: string
}

export interface TransactionRecord {
  hash: string
  type: TransactionType
  direction: TransactionDirection
  account: string
  destination?: string
  amount: TransactionAmount
  fee: string
  timestamp: number
  ledgerIndex: number
  sequence: number
  result: string
  successful: boolean
  memo?: string
  contractCall?: {
    contractAddress: string
    functionName: string
    parameters?: Array<{ sType: string; value: string; flags: number }>
  }
}

export interface TransactionHistoryPage {
  transactions: TransactionRecord[]
  marker?: unknown
  hasMore: boolean
}
