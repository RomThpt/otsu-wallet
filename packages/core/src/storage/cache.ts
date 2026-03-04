import type { TokenBalance, TokenMetadata, TransactionRecord } from '@otsu/types'

export interface CacheStorage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

const CACHE_PREFIX = 'otsu-cache:'

function accountKey(address: string, suffix: string): string {
  return `${CACHE_PREFIX}${address}:${suffix}`
}

function globalKey(suffix: string): string {
  return `${CACHE_PREFIX}${suffix}`
}

export class WalletCache {
  constructor(private storage: CacheStorage) {}

  async getCachedBalance(address: string): Promise<string | null> {
    return this.storage.get<string>(accountKey(address, 'balance'))
  }

  async setCachedBalance(address: string, balance: string): Promise<void> {
    await this.storage.set(accountKey(address, 'balance'), balance)
    await this.touchAccount(address)
  }

  async getCachedTokens(address: string): Promise<TokenBalance[] | null> {
    return this.storage.get<TokenBalance[]>(accountKey(address, 'tokens'))
  }

  async setCachedTokens(address: string, tokens: TokenBalance[]): Promise<void> {
    await this.storage.set(accountKey(address, 'tokens'), tokens)
    await this.touchAccount(address)
  }

  async getCachedTokenMetadata(key: string): Promise<TokenMetadata | null> {
    return this.storage.get<TokenMetadata>(globalKey(`token-meta:${key}`))
  }

  async setCachedTokenMetadata(key: string, metadata: TokenMetadata): Promise<void> {
    await this.storage.set(globalKey(`token-meta:${key}`), metadata)
  }

  async getCachedTransactions(address: string): Promise<TransactionRecord[] | null> {
    return this.storage.get<TransactionRecord[]>(accountKey(address, 'transactions'))
  }

  async setCachedTransactions(address: string, transactions: TransactionRecord[]): Promise<void> {
    await this.storage.set(accountKey(address, 'transactions'), transactions)
    await this.touchAccount(address)
  }

  async appendCachedTransactions(address: string, newTxs: TransactionRecord[]): Promise<void> {
    const existing = (await this.getCachedTransactions(address)) ?? []
    const existingHashes = new Set(existing.map((tx) => tx.hash))
    const unique = newTxs.filter((tx) => !existingHashes.has(tx.hash))
    await this.setCachedTransactions(address, [...existing, ...unique])
  }

  async getCachedPrice(): Promise<{ xrpUsd: string; updatedAt: number } | null> {
    return this.storage.get(globalKey('xrp-price'))
  }

  async setCachedPrice(xrpUsd: string): Promise<void> {
    await this.storage.set(globalKey('xrp-price'), { xrpUsd, updatedAt: Date.now() })
  }

  async getAccountLabels(): Promise<Record<string, string>> {
    return (await this.storage.get<Record<string, string>>(globalKey('account-labels'))) ?? {}
  }

  async setAccountLabel(address: string, label: string): Promise<void> {
    const labels = await this.getAccountLabels()
    labels[address] = label
    await this.storage.set(globalKey('account-labels'), labels)
  }

  async getLastUpdated(address: string): Promise<number | null> {
    return this.storage.get<number>(accountKey(address, 'updated-at'))
  }

  async clearAccountCache(address: string): Promise<void> {
    await this.storage.remove(accountKey(address, 'balance'))
    await this.storage.remove(accountKey(address, 'tokens'))
    await this.storage.remove(accountKey(address, 'transactions'))
    await this.storage.remove(accountKey(address, 'updated-at'))
  }

  async clearAllCache(): Promise<void> {
    await this.storage.clear()
  }

  private async touchAccount(address: string): Promise<void> {
    await this.storage.set(accountKey(address, 'updated-at'), Date.now())
  }
}
