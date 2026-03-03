import { OtsuError, ErrorCodes } from '@otsu/constants'

export interface MemoEntry {
  type?: string
  data: string
}

export interface PaymentParams {
  account: string
  destination: string
  amount: string
  destinationTag?: number
  memos?: MemoEntry[]
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

  if (params.memos && params.memos.length > 0) {
    tx.Memos = encodeMemos(params.memos)
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
  memos?: MemoEntry[]
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

  if (params.memos && params.memos.length > 0) {
    tx.Memos = encodeMemos(params.memos)
  }

  return tx
}

function toHex(text: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function encodeMemos(memos: MemoEntry[]): Array<{ Memo: Record<string, string> }> {
  return memos.map((m) => {
    const memo: Record<string, string> = {
      MemoData: toHex(m.data),
    }
    if (m.type) {
      memo.MemoType = toHex(m.type)
    }
    return { Memo: memo }
  })
}

function isValidAddress(address: string): boolean {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)
}
