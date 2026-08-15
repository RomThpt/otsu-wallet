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

  describe('getSwapQuote', () => {
    it('walks funded book depth and applies slippage without floating point transaction math', async () => {
      const mock = createMockClient({
        bookOffers: [
          [
            {
              TakerGets: { currency: 'USD', issuer: 'rI', value: '5' },
              TakerPays: '5000000',
              Account: 'rMaker1',
            },
            {
              TakerGets: { currency: 'USD', issuer: 'rI', value: '4' },
              TakerPays: '10000000',
              Account: 'rMaker2',
            },
          ],
        ],
      })
      const client = new DexClient(mock)

      const quote = await client.getSwapQuote(
        {
          from: { type: 'native', currency: 'XRP' },
          to: { type: 'issued', currency: 'USD', issuer: 'rI' },
          amount: '10',
          slippageBps: 50,
        },
        'rTaker',
      )

      expect(mock.getBookOffers).toHaveBeenCalledWith(
        { currency: 'USD', issuer: 'rI' },
        { currency: 'XRP' },
        20,
        'rTaker',
      )
      expect(quote).toMatchObject({
        inputAmount: '10',
        expectedOutput: '7',
        minimumOutput: '6.965',
        priceImpactBps: 3000,
        takerGets: '10000000',
        takerPays: { currency: 'USD', issuer: 'rI', value: '6.965' },
        flags: 0x000c0000,
      })
    })

    it('preserves MPT asset scale while quoting an MPT to XRP swap', async () => {
      const client = new DexClient(
        createMockClient({
          bookOffers: [
            [
              {
                TakerGets: '3000000',
                TakerPays: { mpt_issuance_id: 'ABC123', value: '150' },
                Account: 'rMaker',
              },
            ],
          ],
        }),
      )

      const quote = await client.getSwapQuote({
        from: { type: 'mpt', issuanceId: 'ABC123', assetScale: 2 },
        to: { type: 'native', currency: 'XRP' },
        amount: '1.5',
        slippageBps: 50,
      })

      expect(quote.takerGets).toEqual({ mpt_issuance_id: 'ABC123', value: '150' })
      expect(quote.takerPays).toBe('2985000')
      expect(quote.expectedOutput).toBe('3')
      expect(quote.minimumOutput).toBe('2.985')
    })

    it('rejects a quote that cannot fill the whole input', async () => {
      const client = new DexClient(
        createMockClient({
          bookOffers: [
            [
              {
                TakerGets: { currency: 'USD', issuer: 'rI', value: '1' },
                TakerPays: '1000000',
                Account: 'rMaker',
              },
            ],
          ],
        }),
      )

      await expect(
        client.getSwapQuote({
          from: { type: 'native', currency: 'XRP' },
          to: { type: 'issued', currency: 'USD', issuer: 'rI' },
          amount: '2',
          slippageBps: 50,
        }),
      ).rejects.toThrow('Not enough liquidity')
    })

    it('rejects MPT inputs above the protocol maximum', async () => {
      const client = new DexClient(createMockClient())

      await expect(
        client.getSwapQuote({
          from: { type: 'mpt', issuanceId: 'ABC123', assetScale: 0 },
          to: { type: 'native', currency: 'XRP' },
          amount: '9223372036854775808',
          slippageBps: 50,
        }),
      ).rejects.toThrow('protocol maximum')
    })
  })
})
