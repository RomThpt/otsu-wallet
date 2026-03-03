import { describe, it, expect, vi } from 'vitest'
import { DexClient } from './dex-client'

function createMockClient(
  responses: {
    bookOffers?: Record<string, unknown>[][]
    accountOffers?: Record<string, unknown>[]
  } = {},
) {
  let bookCallIndex = 0
  return {
    getBookOffers: vi.fn().mockImplementation(async () => {
      const result = responses.bookOffers?.[bookCallIndex] ?? []
      bookCallIndex++
      return result
    }),
    request: vi.fn().mockImplementation(async () => ({
      offers: responses.accountOffers ?? [],
    })),
  } as unknown as import('../network/client').XrplClient
}

describe('DexClient', () => {
  describe('getOrderBook', () => {
    it('fetches both sides of the order book', async () => {
      const asks = [
        {
          TakerGets: '10000000',
          TakerPays: { currency: 'USD', issuer: 'rI', value: '5' },
          Account: 'rAsk1',
        },
      ]
      const bids = [
        {
          TakerGets: { currency: 'USD', issuer: 'rI', value: '3' },
          TakerPays: '6000000',
          Account: 'rBid1',
        },
      ]

      const client = new DexClient(createMockClient({ bookOffers: [asks, bids] }))
      const book = await client.getOrderBook({ currency: 'XRP' }, { currency: 'USD', issuer: 'rI' })

      expect(book.asks).toHaveLength(1)
      expect(book.bids).toHaveLength(1)
      expect(book.base.currency).toBe('XRP')
      expect(book.quote.currency).toBe('USD')
    })

    it('returns empty book when no offers', async () => {
      const client = new DexClient(createMockClient({ bookOffers: [[], []] }))
      const book = await client.getOrderBook({ currency: 'XRP' }, { currency: 'USD', issuer: 'rI' })

      expect(book.asks).toEqual([])
      expect(book.bids).toEqual([])
    })
  })

  describe('getAccountOffers', () => {
    it('returns parsed offers', async () => {
      const client = new DexClient(
        createMockClient({
          accountOffers: [{ seq: 1, taker_gets: '1000000', taker_pays: '2000000', flags: 0 }],
        }),
      )

      const offers = await client.getAccountOffers('rAddress')

      expect(offers).toHaveLength(1)
      expect(offers[0].seq).toBe(1)
      expect(offers[0].takerGets).toBe('1000000')
    })

    it('returns empty for unfunded account', async () => {
      const mock = createMockClient()
      ;(mock.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('actNotFound'))
      const client = new DexClient(mock)

      const offers = await client.getAccountOffers('rMissing')
      expect(offers).toEqual([])
    })
  })
})
