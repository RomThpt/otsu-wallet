import { BITSTAMP_USD_ISSUER } from '@otsu/constants'
import type { XrplClient } from './client'

export class PriceClient {
  constructor(private client: XrplClient) {}

  async getXrpUsdPrice(): Promise<string> {
    const offers = await this.client.getBookOffers(
      { currency: 'XRP' },
      { currency: 'USD', issuer: BITSTAMP_USD_ISSUER },
      1,
    )

    if (offers.length === 0) return '0'

    const offer = offers[0]
    const takerPays = offer.TakerPays as Record<string, string> | string
    const takerGets = offer.TakerGets as Record<string, string> | string

    const paysValue =
      typeof takerPays === 'string'
        ? Number(takerPays) / 1_000_000
        : Number((takerPays as Record<string, string>).value)

    const getsValue =
      typeof takerGets === 'string'
        ? Number(takerGets) / 1_000_000
        : Number((takerGets as Record<string, string>).value)

    if (paysValue === 0) return '0'

    const price = getsValue / paysValue
    return price.toFixed(6)
  }

  async getTokenXrpPrice(currency: string, issuer: string): Promise<string> {
    const offers = await this.client.getBookOffers({ currency, issuer }, { currency: 'XRP' }, 1)

    if (offers.length === 0) return '0'

    const offer = offers[0]
    const takerPays = offer.TakerPays as string
    const takerGets = offer.TakerGets as Record<string, string>

    const paysDrops = Number(takerPays) / 1_000_000
    const getsValue = Number(takerGets.value)

    if (getsValue === 0) return '0'
    return (paysDrops / getsValue).toFixed(6)
  }

  async getTokenUsdPrice(currency: string, issuer: string): Promise<string> {
    const [tokenXrp, xrpUsd] = await Promise.all([
      this.getTokenXrpPrice(currency, issuer),
      this.getXrpUsdPrice(),
    ])

    const price = Number(tokenXrp) * Number(xrpUsd)
    return price.toFixed(6)
  }
}
