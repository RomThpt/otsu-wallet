import type { DexOffer, OrderBook, OrderBookEntry } from '@otsu/types'
import { MAX_ORDER_BOOK_DEPTH } from '@otsu/constants'
import type { XrplClient } from '../network/client'

type CurrencySpec = { currency: string; issuer?: string }

export class DexClient {
  constructor(private client: XrplClient) {}

  async getOrderBook(
    base: CurrencySpec,
    quote: CurrencySpec,
    limit = MAX_ORDER_BOOK_DEPTH,
  ): Promise<OrderBook> {
    const takerGets = base.issuer
      ? { currency: base.currency, issuer: base.issuer }
      : { currency: 'XRP' }
    const takerPays = quote.issuer
      ? { currency: quote.currency, issuer: quote.issuer }
      : { currency: 'XRP' }

    const [askRaw, bidRaw] = await Promise.all([
      this.client.getBookOffers(takerGets, takerPays, limit),
      this.client.getBookOffers(takerPays, takerGets, limit),
    ])

    const asks = askRaw.map((o) => this.parseOrderBookEntry(o, false))
    const bids = bidRaw.map((o) => this.parseOrderBookEntry(o, true))

    return { bids, asks, base, quote }
  }

  async getAccountOffers(address: string): Promise<DexOffer[]> {
    try {
      const result = await this.client.request({
        command: 'account_offers',
        account: address,
        ledger_index: 'validated',
      })

      const offers = (result.offers ?? []) as Record<string, unknown>[]
      return offers.map((offer) => ({
        seq: offer.seq as number,
        takerGets: offer.taker_gets as string | { currency: string; issuer: string; value: string },
        takerPays: offer.taker_pays as string | { currency: string; issuer: string; value: string },
        expiration: offer.expiration as number | undefined,
        flags: (offer.flags as number) ?? 0,
      }))
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('actNotFound')) {
        return []
      }
      throw error
    }
  }

  private parseOrderBookEntry(raw: Record<string, unknown>, isBid: boolean): OrderBookEntry {
    const takerGets = raw.TakerGets ?? raw.taker_gets
    const takerPays = raw.TakerPays ?? raw.taker_pays

    const getsValue =
      typeof takerGets === 'string'
        ? (Number(takerGets) / 1_000_000).toString()
        : (takerGets as { value: string }).value

    const paysValue =
      typeof takerPays === 'string'
        ? (Number(takerPays) / 1_000_000).toString()
        : (takerPays as { value: string }).value

    const price = isBid
      ? (Number(getsValue) / Number(paysValue)).toString()
      : (Number(paysValue) / Number(getsValue)).toString()

    return {
      price,
      amount: isBid ? paysValue : getsValue,
      total: isBid ? getsValue : paysValue,
      owner: (raw.Account ?? raw.account) as string,
    }
  }
}
