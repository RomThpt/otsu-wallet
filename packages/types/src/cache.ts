import type { TokenBalance, TokenMetadata } from './token'
import type { NftBalance, NftMetadata } from './nft'
import type { TransactionRecord } from './transaction'

export interface CachedBalance {
  available: string
  total: string
  reserved: string
}

export interface CachedAccountData {
  address: string
  balance?: CachedBalance
  tokens?: TokenBalance[]
  nfts?: NftBalance[]
  transactions?: TransactionRecord[]
  lastUpdated: number
}

export interface CachedTokenMetadata {
  [key: string]: TokenMetadata
}

export interface CachedNftMetadata {
  [nftId: string]: NftMetadata
}

export interface CachedPrice {
  xrpUsd: string
  updatedAt: number
}

export interface CacheManifest {
  accounts: string[]
  lastCleanup: number
}
