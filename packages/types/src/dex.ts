export interface DexOffer {
  seq: number
  takerGets: string | { currency: string; issuer: string; value: string }
  takerPays: string | { currency: string; issuer: string; value: string }
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
  takerGets: string | { currency: string; issuer: string; value: string }
  takerPays: string | { currency: string; issuer: string; value: string }
  expiration?: number
  flags?: number
}

export interface CancelDexOfferParams {
  offerSequence: number
}
