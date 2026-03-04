import { describe, it, expect, vi } from 'vitest'
import { PriceClient } from './price-client'

function createMockClient(offers: unknown[] = []) {
  return {
    getBookOffers: vi.fn().mockResolvedValue(offers),
  } as unknown as import('./client').XrplClient
}

describe('PriceClient', () => {
  describe('getXrpUsdPrice', () => {
    it('returns 0 when no offers', async () => {
      const client = new PriceClient(createMockClient([]))
      const price = await client.getXrpUsdPrice()
      expect(price).toBe('0')
    })

    it('calculates XRP/USD price from book offers', async () => {
      const offers = [
        {
          TakerPays: '1000000', // 1 XRP in drops
          TakerGets: { currency: 'USD', issuer: 'rBitstamp', value: '0.55' },
        },
      ]
      const client = new PriceClient(createMockClient(offers))
      const price = await client.getXrpUsdPrice()
      expect(Number(price)).toBeCloseTo(0.55, 2)
    })
  })

  describe('getTokenXrpPrice', () => {
    it('returns 0 when no offers', async () => {
      const client = new PriceClient(createMockClient([]))
      const price = await client.getTokenXrpPrice('USD', 'rIssuer')
      expect(price).toBe('0')
    })

    it('calculates token/XRP price', async () => {
      const offers = [
        {
          TakerPays: '10000000', // 10 XRP in drops
          TakerGets: { currency: 'USD', issuer: 'rIssuer', value: '5' },
        },
      ]
      const client = new PriceClient(createMockClient(offers))
      const price = await client.getTokenXrpPrice('USD', 'rIssuer')
      expect(Number(price)).toBeCloseTo(2.0, 1)
    })
  })

  describe('getTokenUsdPrice', () => {
    it('combines token/XRP and XRP/USD prices', async () => {
      const mockClient = {
        getBookOffers: vi.fn()
          .mockResolvedValueOnce([
            {
              TakerPays: '2000000', // 2 XRP
              TakerGets: { currency: 'TOKEN', issuer: 'rIssuer', value: '1' },
            },
          ])
          .mockResolvedValueOnce([
            {
              TakerPays: '1000000', // 1 XRP
              TakerGets: { currency: 'USD', issuer: 'rBitstamp', value: '0.50' },
            },
          ]),
      } as unknown as import('./client').XrplClient

      const client = new PriceClient(mockClient)
      const price = await client.getTokenUsdPrice('TOKEN', 'rIssuer')
      expect(Number(price)).toBeCloseTo(1.0, 1)
    })
  })
})
