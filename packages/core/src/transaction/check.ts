import type { CreateCheckParams, CashCheckParams, CancelCheckParams } from '@otsu/types'

export function buildCreateCheck(
  account: string,
  params: CreateCheckParams,
): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'CheckCreate',
    Account: account,
    Destination: params.destination,
    SendMax: params.sendMax,
  }

  if (params.expiration !== undefined) {
    tx.Expiration = params.expiration
  }

  if (params.destinationTag !== undefined) {
    tx.DestinationTag = params.destinationTag
  }

  return tx
}

export function buildCashCheck(account: string, params: CashCheckParams): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'CheckCash',
    Account: account,
    CheckID: params.checkID,
  }

  if (params.amount !== undefined) {
    tx.Amount = params.amount
  }

  if (params.deliverMin !== undefined) {
    tx.DeliverMin = params.deliverMin
  }

  return tx
}

export function buildCancelCheck(
  account: string,
  params: CancelCheckParams,
): Record<string, unknown> {
  return {
    TransactionType: 'CheckCancel',
    Account: account,
    CheckID: params.checkID,
  }
}
