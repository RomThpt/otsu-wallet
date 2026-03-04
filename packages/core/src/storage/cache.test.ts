import { describe, it, expect, beforeEach } from 'vitest'
import { WalletCache } from './cache'
import { MemoryCacheStorage } from './memory-cache-storage'
import type { TokenBalance, TransactionRecord } from '@otsu/types'

describe('WalletCache', () => {
  let cache: WalletCache

  beforeEach(() => {
    cache = new WalletCache(new MemoryCacheStorage())
  })

  const address = 'rTestAddress123456789'

  describe('balance', () => {
    it('returns null for uncached balance', async () => {
      expect(await cache.getCachedBalance(address)).toBeNull()
    })

    it('roundtrips cached balance', async () => {
      await cache.setCachedBalance(address, '1000000')
      expect(await cache.getCachedBalance(address)).toBe('1000000')
    })
  })

  describe('tokens', () => {
    const tokens: TokenBalance[] = [
      { currency: 'USD', issuer: 'rIssuer1', value: '100', limit: '1000', noRipple: true },
      { currency: 'EUR', issuer: 'rIssuer2', value: '50', limit: '500', noRipple: false },
    ]

    it('returns null for uncached tokens', async () => {
      expect(await cache.getCachedTokens(address)).toBeNull()
    })

    it('roundtrips cached tokens', async () => {
      await cache.setCachedTokens(address, tokens)
      expect(await cache.getCachedTokens(address)).toEqual(tokens)
    })
  })

  describe('transactions', () => {
    const tx1: TransactionRecord = {
      hash: 'HASH1',
      type: 'Payment',
      direction: 'sent',
      account: address,
      destination: 'rOther',
      amount: { currency: 'XRP', value: '10' },
      fee: '12',
      timestamp: 1000,
      ledgerIndex: 100,
      sequence: 1,
      result: 'tesSUCCESS',
      successful: true,
    }

    const tx2: TransactionRecord = {
      ...tx1,
      hash: 'HASH2',
      direction: 'received',
      timestamp: 2000,
    }

    it('returns null for uncached transactions', async () => {
      expect(await cache.getCachedTransactions(address)).toBeNull()
    })

    it('roundtrips cached transactions', async () => {
      await cache.setCachedTransactions(address, [tx1])
      expect(await cache.getCachedTransactions(address)).toEqual([tx1])
    })

    it('appends new transactions without duplicates', async () => {
      await cache.setCachedTransactions(address, [tx1])
      await cache.appendCachedTransactions(address, [tx1, tx2])
      const result = await cache.getCachedTransactions(address)
      expect(result).toHaveLength(2)
      expect(result!.map((t) => t.hash)).toEqual(['HASH1', 'HASH2'])
    })
  })

  describe('price', () => {
    it('returns null for uncached price', async () => {
      expect(await cache.getCachedPrice()).toBeNull()
    })

    it('roundtrips cached price', async () => {
      await cache.setCachedPrice('0.55')
      const result = await cache.getCachedPrice()
      expect(result!.xrpUsd).toBe('0.55')
      expect(result!.updatedAt).toBeGreaterThan(0)
    })
  })

  describe('account labels', () => {
    it('returns empty object for no labels', async () => {
      expect(await cache.getAccountLabels()).toEqual({})
    })

    it('sets and retrieves labels', async () => {
      await cache.setAccountLabel(address, 'Main Account')
      const labels = await cache.getAccountLabels()
      expect(labels[address]).toBe('Main Account')
    })

    it('updates existing label', async () => {
      await cache.setAccountLabel(address, 'Old')
      await cache.setAccountLabel(address, 'New')
      const labels = await cache.getAccountLabels()
      expect(labels[address]).toBe('New')
    })
  })

  describe('cache invalidation', () => {
    it('clears account cache', async () => {
      await cache.setCachedBalance(address, '1000000')
      await cache.setCachedTokens(address, [])
      await cache.clearAccountCache(address)
      expect(await cache.getCachedBalance(address)).toBeNull()
      expect(await cache.getCachedTokens(address)).toBeNull()
    })

    it('clears all cache', async () => {
      await cache.setCachedBalance(address, '1000000')
      await cache.setCachedPrice('0.55')
      await cache.clearAllCache()
      expect(await cache.getCachedBalance(address)).toBeNull()
      expect(await cache.getCachedPrice()).toBeNull()
    })
  })

  describe('lastUpdated', () => {
    it('tracks last updated timestamp', async () => {
      await cache.setCachedBalance(address, '1000000')
      const updated = await cache.getLastUpdated(address)
      expect(updated).toBeGreaterThan(0)
    })
  })
})
