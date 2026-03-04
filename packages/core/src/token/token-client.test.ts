import { describe, it, expect, vi } from 'vitest'
import { TokenClient } from './token-client'

function createMockClient(lines: unknown[] = []) {
  return {
    getAccountLines: vi.fn().mockResolvedValue(lines),
  } as unknown as import('../network/client').XrplClient
}

describe('TokenClient', () => {
  describe('getAccountTokens', () => {
    it('returns empty array for account with no trustlines', async () => {
      const client = new TokenClient(createMockClient([]))
      const tokens = await client.getAccountTokens('rTest')
      expect(tokens).toEqual([])
    })

    it('maps account_lines response to TokenBalance', async () => {
      const lines = [
        {
          account: 'rIssuer1',
          currency: 'USD',
          balance: '100.5',
          limit: '1000',
          no_ripple: true,
        },
        {
          account: 'rIssuer2',
          currency: 'EUR',
          balance: '50',
          limit: '500',
          no_ripple: false,
        },
      ]
      const client = new TokenClient(createMockClient(lines))
      const tokens = await client.getAccountTokens('rTest')

      expect(tokens).toHaveLength(2)
      expect(tokens[0]).toEqual({
        currency: 'USD',
        issuer: 'rIssuer1',
        value: '100.5',
        limit: '1000',
        noRipple: true,
      })
      expect(tokens[1].currency).toBe('EUR')
    })
  })

  describe('buildSetTrustline', () => {
    it('builds TrustSet transaction', () => {
      const client = new TokenClient(createMockClient())
      const tx = client.buildSetTrustline('rAccount', {
        currency: 'USD',
        issuer: 'rIssuer',
        limit: '1000',
      })

      expect(tx.TransactionType).toBe('TrustSet')
      expect(tx.Account).toBe('rAccount')
      expect(tx.LimitAmount).toEqual({
        currency: 'USD',
        issuer: 'rIssuer',
        value: '1000',
      })
    })
  })

  describe('buildRemoveTrustline', () => {
    it('builds TrustSet with limit 0', () => {
      const client = new TokenClient(createMockClient())
      const tx = client.buildRemoveTrustline('rAccount', 'USD', 'rIssuer')

      expect(tx.TransactionType).toBe('TrustSet')
      const limit = tx.LimitAmount as Record<string, string>
      expect(limit.value).toBe('0')
    })
  })
})
