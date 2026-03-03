import type { NftBalance, NftOffer } from '@otsu/types'
import type { XrplClient } from '../network/client'

export class NftClient {
  constructor(private client: XrplClient) {}

  async getAccountNFTs(address: string): Promise<NftBalance[]> {
    try {
      const result = await this.client.request({
        command: 'account_nfts',
        account: address,
        ledger_index: 'validated',
      })

      const nfts = (result.account_nfts ?? []) as Record<string, unknown>[]
      return nfts.map((nft) => ({
        nftId: nft.NFTokenID as string,
        issuer: nft.Issuer as string,
        owner: address,
        tokenId: nft.NFTokenID as string,
        uri: nft.URI ? hexDecode(nft.URI as string) : '',
        flags: (nft.Flags as number) ?? 0,
        transferFee: (nft.TransferFee as number) ?? 0,
        taxon: (nft.NFTokenTaxon as number) ?? 0,
      }))
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('actNotFound')) {
        return []
      }
      throw error
    }
  }

  async getNFTSellOffers(tokenId: string): Promise<NftOffer[]> {
    try {
      const result = await this.client.request({
        command: 'nft_sell_offers',
        nft_id: tokenId,
      })
      return this.parseOffers((result.offers as Record<string, unknown>[]) ?? [], tokenId, true)
    } catch {
      return []
    }
  }

  async getNFTBuyOffers(tokenId: string): Promise<NftOffer[]> {
    try {
      const result = await this.client.request({
        command: 'nft_buy_offers',
        nft_id: tokenId,
      })
      return this.parseOffers((result.offers as Record<string, unknown>[]) ?? [], tokenId, false)
    } catch {
      return []
    }
  }

  private parseOffers(
    offers: Record<string, unknown>[],
    nftId: string,
    isSell: boolean,
  ): NftOffer[] {
    return offers.map((offer) => ({
      offerId: offer.nft_offer_index as string,
      nftId,
      owner: offer.owner as string,
      amount: typeof offer.amount === 'string' ? offer.amount : JSON.stringify(offer.amount),
      destination: offer.destination as string | undefined,
      flags: isSell ? 1 : 0,
      expiration: offer.expiration as number | undefined,
    }))
  }
}

function hexDecode(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return new TextDecoder().decode(bytes)
}
