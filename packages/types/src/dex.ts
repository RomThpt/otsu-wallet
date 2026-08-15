import type { XrplAsset, XrplAssetAmount } from './token'

export interface DexOffer {
  seq: number
  takerGets: XrplAssetAmount
  takerPays: XrplAssetAmount
  expiration?: number
  flags: number
}

export interface OrderBookEntry {
  price: string
  amount: string
  total: string
  owner: string
}

export interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  base: { currency: string; issuer?: string }
  quote: { currency: string; issuer?: string }
}

export interface CreateDexOfferParams {
  takerGets: XrplAssetAmount
  takerPays: XrplAssetAmount
  expiration?: number
  flags?: number
}

export interface CancelDexOfferParams {
  offerSequence: number
}

export interface SwapQuote {
  quoteId: string
  account: string
  network: string
  from: XrplAsset
  to: XrplAsset
  inputAmount: string
  expectedOutput: string
  minimumOutput: string
  priceImpactBps: number
  slippageBps: number
  expiresAt: number
  takerGets: XrplAssetAmount
  takerPays: XrplAssetAmount
  flags: number
}

export interface SwapQuoteRequest {
  from: XrplAsset
  to: XrplAsset
  amount: string
  slippageBps: number
}
