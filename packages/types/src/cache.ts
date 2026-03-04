import type { TokenBalance, TokenMetadata } from './token'
import type { TransactionRecord } from './transaction'

export interface CachedAccountData {
  address: string
  balance?: string
  tokens?: TokenBalance[]
  transactions?: TransactionRecord[]
  lastUpdated: number
}

export interface CachedTokenMetadata {
  [key: string]: TokenMetadata
}

export interface CachedPrice {
  xrpUsd: string
  updatedAt: number
}

export interface CacheManifest {
  accounts: string[]
  lastCleanup: number
}
