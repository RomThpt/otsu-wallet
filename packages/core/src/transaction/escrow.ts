import type { CreateEscrowParams, FinishEscrowParams, CancelEscrowParams } from '@otsu/types'

export function buildCreateEscrow(
  account: string,
  params: CreateEscrowParams,
): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'EscrowCreate',
    Account: account,
    Destination: params.destination,
    Amount: params.amount,
  }

  if (params.condition) {
    tx.Condition = params.condition
  }

  if (params.cancelAfter !== undefined) {
    tx.CancelAfter = params.cancelAfter
  }

  if (params.finishAfter !== undefined) {
    tx.FinishAfter = params.finishAfter
  }

  if (params.destinationTag !== undefined) {
    tx.DestinationTag = params.destinationTag
  }

  return tx
}

export function buildFinishEscrow(
  account: string,
  params: FinishEscrowParams,
): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'EscrowFinish',
    Account: account,
    Owner: params.owner,
    OfferSequence: params.offerSequence,
  }

  if (params.condition) {
    tx.Condition = params.condition
  }

  if (params.fulfillment) {
    tx.Fulfillment = params.fulfillment
  }

  return tx
}

export function buildCancelEscrow(
  account: string,
  params: CancelEscrowParams,
): Record<string, unknown> {
  return {
    TransactionType: 'EscrowCancel',
    Account: account,
    Owner: params.owner,
    OfferSequence: params.offerSequence,
  }
}
