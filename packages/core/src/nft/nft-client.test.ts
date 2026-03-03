import { describe, it, expect, vi } from 'vitest'
import { NftClient } from './nft-client'

function createMockClient(responses: Record<string, unknown> = {}) {
  return {
    request: vi.fn().mockImplementation(async (req: { command: string }) => {
      if (responses[req.command]) return responses[req.command]
      return {}
    }),
  } as unknown as import('../network/client').XrplClient
}

describe('NftClient', () => {
  describe('getAccountNFTs', () => {
    it('returns parsed NFTs', async () => {
      const mockNft = {
        NFTokenID: '00080000ABCDEF',
        Issuer: 'rIssuer123',
        URI: '68747470733A2F2F6578616D706C652E636F6D', // "https://example.com" in hex
        Flags: 8,
        TransferFee: 1000,
        NFTokenTaxon: 1,
      }

      const client = new NftClient(
        createMockClient({
          account_nfts: { account_nfts: [mockNft] },
        }),
      )

      const nfts = await client.getAccountNFTs('rAddress')

      expect(nfts).toHaveLength(1)
      expect(nfts[0].nftId).toBe('00080000ABCDEF')
      expect(nfts[0].issuer).toBe('rIssuer123')
      expect(nfts[0].uri).toBe('https://example.com')
      expect(nfts[0].flags).toBe(8)
      expect(nfts[0].transferFee).toBe(1000)
      expect(nfts[0].taxon).toBe(1)
    })

    it('returns empty array for unfunded account', async () => {
      const mock = createMockClient()
      ;(mock.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('actNotFound'))
      const nftClient = new NftClient(mock)

      const nfts = await nftClient.getAccountNFTs('rMissing')
      expect(nfts).toEqual([])
    })
  })

  describe('getNFTSellOffers', () => {
    it('returns parsed sell offers', async () => {
      const client = new NftClient(
        createMockClient({
          nft_sell_offers: {
            offers: [{ nft_offer_index: 'OFFER1', owner: 'rOwner', amount: '5000000' }],
          },
        }),
      )

      const offers = await client.getNFTSellOffers('TOKEN123')

      expect(offers).toHaveLength(1)
      expect(offers[0].offerId).toBe('OFFER1')
      expect(offers[0].flags).toBe(1) // sell
    })

    it('returns empty on error', async () => {
      const mock = createMockClient()
      ;(mock.request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('objectNotFound'))
      const client = new NftClient(mock)

      const offers = await client.getNFTSellOffers('TOKEN123')
      expect(offers).toEqual([])
    })
  })

  describe('getNFTBuyOffers', () => {
    it('returns parsed buy offers', async () => {
      const client = new NftClient(
        createMockClient({
          nft_buy_offers: {
            offers: [{ nft_offer_index: 'OFFER2', owner: 'rBuyer', amount: '3000000' }],
          },
        }),
      )

      const offers = await client.getNFTBuyOffers('TOKEN123')

      expect(offers).toHaveLength(1)
      expect(offers[0].offerId).toBe('OFFER2')
      expect(offers[0].flags).toBe(0) // buy
    })
  })
})
