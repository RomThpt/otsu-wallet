import { describe, it, expect, vi } from 'vitest'
import { TokenClient } from './token-client'

function createMockClient(
  lines: unknown[] = [],
  objects: unknown[] = [],
  ledgerEntry: Record<string, unknown> = {},
) {
  return {
    getAccountLines: vi.fn().mockResolvedValue(lines),
    getAccountObjects: vi.fn().mockResolvedValue({ objects }),
    request: vi.fn().mockResolvedValue({ node: ledgerEntry }),
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
        authorized: true,
        frozen: false,
        disabledReason: undefined,
      })
      expect(tokens[1].currency).toBe('EUR')
    })

    it('marks frozen and require-auth trustlines as unavailable for trading', async () => {
      const mock = createMockClient([
        {
          account: 'rIssuer',
          currency: 'USD',
          balance: '5',
          limit: '100',
          freeze_peer: true,
          peer_authorized: false,
        },
      ])
      vi.mocked(mock.request).mockResolvedValue({ account_data: { Flags: 0x00040000 } })

      await expect(new TokenClient(mock).getAccountTokens('rHolder')).resolves.toEqual([
        expect.objectContaining({
          authorized: false,
          frozen: true,
          disabledReason: 'Frozen by issuer',
        }),
      ])
    })
  })

  describe('getMptTokens', () => {
    it('discovers authorized MPT holdings with asset scale and tradeability', async () => {
      const issuanceId = 'A'.repeat(48)
      const client = new TokenClient(
        createMockClient(
          [],
          [
            {
              LedgerEntryType: 'MPToken',
              MPTokenIssuanceID: issuanceId,
              MPTAmount: '12345',
              LockedAmount: '45',
            },
          ],
          { AssetScale: 2, Issuer: 'rIssuer', Flags: 0x10 },
        ),
      )

      await expect(client.getMptTokens('rHolder')).resolves.toEqual([
        expect.objectContaining({
          key: `mpt:${issuanceId}`,
          balance: '123',
          transactionBalance: '12300',
          lockedBalance: '0.45',
          authorized: true,
          tradeable: true,
          asset: {
            type: 'mpt',
            issuanceId,
            assetScale: 2,
            issuer: 'rIssuer',
          },
        }),
      ])
      expect(
        (client as unknown as { client: { request: ReturnType<typeof vi.fn> } }).client.request,
      ).toHaveBeenCalledWith({
        command: 'ledger_entry',
        mpt_issuance: issuanceId,
        ledger_index: 'validated',
      })
    })

    it('does not expose unauthorized or locked MPT holdings as tradeable', async () => {
      const issuanceId = 'B'.repeat(48)
      const unauthorized = new TokenClient(
        createMockClient(
          [],
          [
            {
              LedgerEntryType: 'MPToken',
              MPTokenIssuanceID: issuanceId,
              MPTAmount: '10',
              Flags: 0,
            },
          ],
          { AssetScale: 0, Flags: 0x14 },
        ),
      )
      const [asset] = await unauthorized.getMptTokens('rHolder')
      expect(asset).toMatchObject({
        authorized: false,
        tradeable: false,
        disabledReason: 'Issuer authorization required',
      })

      const locked = new TokenClient(
        createMockClient(
          [],
          [
            {
              LedgerEntryType: 'MPToken',
              MPTokenIssuanceID: issuanceId,
              MPTAmount: '10',
              Flags: 0x03,
            },
          ],
          { AssetScale: 0, Flags: 0x10 },
        ),
      )
      await expect(locked.getMptTokens('rHolder')).resolves.toEqual([
        expect.objectContaining({
          authorized: true,
          tradeable: false,
          disabledReason: 'Locked by issuer',
        }),
      ])
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

    it('includes validated inbound and outbound trustline quality settings', () => {
      const client = new TokenClient(createMockClient())
      const tx = client.buildSetTrustline('rAccount', {
        currency: 'USD',
        issuer: 'rIssuer',
        limit: '1000',
        qualityIn: 1_000_000_000,
        qualityOut: 900_000_000,
      })

      expect(tx).toMatchObject({ QualityIn: 1_000_000_000, QualityOut: 900_000_000 })
      expect(() =>
        client.buildSetTrustline('rAccount', {
          currency: 'USD',
          issuer: 'rIssuer',
          limit: '1000',
          qualityIn: -1,
        }),
      ).toThrow('unsigned 32-bit integer')
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
