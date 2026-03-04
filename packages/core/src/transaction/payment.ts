import { OtsuError, ErrorCodes } from '@otsu/constants'

export interface PaymentParams {
  account: string
  destination: string
  amount: string
  destinationTag?: number
}

export function buildPayment(params: PaymentParams): Record<string, unknown> {
  validatePayment(params)

  const tx: Record<string, unknown> = {
    TransactionType: 'Payment',
    Account: params.account,
    Destination: params.destination,
    Amount: params.amount,
  }

  if (params.destinationTag !== undefined) {
    tx.DestinationTag = params.destinationTag
  }

  return tx
}

export function validatePayment(params: PaymentParams): void {
  if (!isValidAddress(params.destination)) {
    throw new OtsuError(ErrorCodes.INVALID_ADDRESS, 'Invalid destination address')
  }

  const amount = BigInt(params.amount)
  if (amount <= 0) {
    throw new OtsuError(ErrorCodes.INSUFFICIENT_BALANCE, 'Amount must be positive')
  }

  if (params.account === params.destination) {
    throw new OtsuError(ErrorCodes.INVALID_ADDRESS, 'Cannot send to yourself')
  }
}

export interface TokenPaymentParams {
  account: string
  destination: string
  currency: string
  issuer: string
  value: string
  destinationTag?: number
}

export function buildTokenPayment(params: TokenPaymentParams): Record<string, unknown> {
  if (!isValidAddress(params.destination)) {
    throw new OtsuError(ErrorCodes.INVALID_ADDRESS, 'Invalid destination address')
  }

  if (params.account === params.destination) {
    throw new OtsuError(ErrorCodes.INVALID_ADDRESS, 'Cannot send to yourself')
  }

  const tx: Record<string, unknown> = {
    TransactionType: 'Payment',
    Account: params.account,
    Destination: params.destination,
    Amount: {
      currency: params.currency,
      issuer: params.issuer,
      value: params.value,
    },
  }

  if (params.destinationTag !== undefined) {
    tx.DestinationTag = params.destinationTag
  }

  return tx
}

function isValidAddress(address: string): boolean {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)
}
