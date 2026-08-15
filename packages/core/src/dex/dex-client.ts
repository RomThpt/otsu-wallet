import type {
  DexOffer,
  OrderBook,
  OrderBookEntry,
  SwapQuoteRequest,
  XrplAssetAmount,
} from '@otsu/types'
import { DEX_OFFER_FLAGS, MAX_ORDER_BOOK_DEPTH } from '@otsu/constants'
import type { XrplClient } from '../network/client'
import {
  addExactDecimals,
  applySlippage,
  compareExactDecimals,
  exactDecimalToString,
  multiplyDivideExact,
  parseExactDecimal,
  quoteOutputScale,
  subtractExactDecimals,
  transactionAmountValue,
  transactionValueToDisplay,
  xrplAssetAmount,
  xrplAssetBookSpec,
  xrplAssetKey,
} from '../token/xrpl-assets'

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
        takerGets: offer.taker_gets as XrplAssetAmount,
        takerPays: offer.taker_pays as XrplAssetAmount,
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

  async getSwapQuote(
    request: SwapQuoteRequest,
    taker?: string,
  ): Promise<{
    inputAmount: string
    expectedOutput: string
    minimumOutput: string
    priceImpactBps: number
    takerGets: XrplAssetAmount
    takerPays: XrplAssetAmount
    flags: number
  }> {
    if (xrplAssetKey(request.from) === xrplAssetKey(request.to)) {
      throw new Error('Choose two different assets')
    }

    const takerGets = xrplAssetAmount(request.from, request.amount)
    const inputValue = parseExactDecimal(transactionAmountValue(takerGets))
    if (inputValue.coefficient <= 0n) throw new Error('Swap amount must be greater than zero')

    const offers = await this.client.getBookOffers(
      xrplAssetBookSpec(request.to),
      xrplAssetBookSpec(request.from),
      MAX_ORDER_BOOK_DEPTH,
      taker,
    )
    let remaining = inputValue
    let output = parseExactDecimal('0')
    let firstRate: number | undefined

    for (const offer of offers) {
      if (remaining.coefficient === 0n) break
      const offerGetsAmount = this.getOfferAmount(offer, 'gets')
      const offerPaysAmount = this.getOfferAmount(offer, 'pays')
      const offerGets = parseExactDecimal(transactionAmountValue(offerGetsAmount))
      const offerPays = parseExactDecimal(transactionAmountValue(offerPaysAmount))
      if (offerGets.coefficient <= 0n || offerPays.coefficient <= 0n) continue

      const consumed = compareExactDecimals(remaining, offerPays) <= 0 ? remaining : offerPays
      const received = multiplyDivideExact(
        consumed,
        offerGets,
        offerPays,
        quoteOutputScale(request.to),
      )
      if (received.coefficient <= 0n) continue

      if (firstRate === undefined) {
        const getsDisplay = Number(
          transactionValueToDisplay(request.to, transactionAmountValue(offerGetsAmount)),
        )
        const paysDisplay = Number(
          transactionValueToDisplay(request.from, transactionAmountValue(offerPaysAmount)),
        )
        if (Number.isFinite(getsDisplay / paysDisplay)) firstRate = getsDisplay / paysDisplay
      }
      output = addExactDecimals(output, received)
      remaining = subtractExactDecimals(remaining, consumed)
    }

    if (remaining.coefficient > 0n) throw new Error('Not enough liquidity for this swap')
    const minimum = applySlippage(output, request.slippageBps, quoteOutputScale(request.to))
    if (minimum.coefficient <= 0n) throw new Error('Quoted output is too small')

    const expectedOutput = transactionValueToDisplay(request.to, exactDecimalToString(output))
    const minimumOutput = transactionValueToDisplay(request.to, exactDecimalToString(minimum))
    const averageRate = Number(expectedOutput) / Number(request.amount)
    const priceImpactBps =
      firstRate && firstRate > 0 && Number.isFinite(averageRate)
        ? Math.max(0, Math.round(((firstRate - averageRate) / firstRate) * 10_000))
        : 0

    return {
      inputAmount: transactionValueToDisplay(request.from, transactionAmountValue(takerGets)),
      expectedOutput,
      minimumOutput,
      priceImpactBps,
      takerGets,
      takerPays: xrplAssetAmount(request.to, minimumOutput),
      flags: DEX_OFFER_FLAGS.tfFillOrKill | DEX_OFFER_FLAGS.tfSell,
    }
  }

  private getOfferAmount(offer: Record<string, unknown>, side: 'gets' | 'pays'): XrplAssetAmount {
    const capitalized = side === 'gets' ? 'TakerGets' : 'TakerPays'
    const lower = side === 'gets' ? 'taker_gets' : 'taker_pays'
    const funded = side === 'gets' ? 'taker_gets_funded' : 'taker_pays_funded'
    const amount = offer[funded] ?? offer[capitalized] ?? offer[lower]
    if (
      typeof amount !== 'string' &&
      (!amount || typeof amount !== 'object' || !('value' in amount))
    ) {
      throw new Error('Order book returned an invalid amount')
    }
    return amount as XrplAssetAmount
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
