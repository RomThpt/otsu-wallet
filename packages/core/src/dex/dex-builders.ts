import type { CreateDexOfferParams } from '@otsu/types'

export function buildOfferCreate(
  account: string,
  params: CreateDexOfferParams,
): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'OfferCreate',
    Account: account,
    TakerGets: params.takerGets,
    TakerPays: params.takerPays,
  }

  if (params.expiration !== undefined) {
    tx.Expiration = params.expiration
  }

  if (params.flags !== undefined) {
    tx.Flags = params.flags
  }

  return tx
}

export function buildOfferCancel(account: string, offerSequence: number): Record<string, unknown> {
  return {
    TransactionType: 'OfferCancel',
    Account: account,
    OfferSequence: offerSequence,
  }
}
