import type {
  TransactionRecord,
  TransactionHistoryPage,
  TransactionDirection,
  TransactionType,
  TransactionAmount,
} from '@otsu/types'
import { HISTORY_PAGE_SIZE } from '@otsu/constants'
import type { XrplClient } from '../network/client'

const RIPPLE_EPOCH_OFFSET = 946684800

export class TransactionHistoryClient {
  constructor(private client: XrplClient) {}

  async getTransactionHistory(
    address: string,
    options?: { marker?: unknown; limit?: number },
  ): Promise<TransactionHistoryPage> {
    const limit = options?.limit ?? HISTORY_PAGE_SIZE
    const result = await this.client.getAccountTransactions(address, options?.marker, limit)

    const transactions = result.transactions
      .map((entry) => this.parseTransaction(entry, address))
      .filter((tx): tx is TransactionRecord => tx !== null)

    return {
      transactions,
      marker: result.marker,
      hasMore: result.marker !== undefined,
    }
  }

  parseTransaction(entry: Record<string, unknown>, address: string): TransactionRecord | null {
    const tx = entry.tx_json ?? entry.tx
    if (!tx) return null

    const txData = tx as Record<string, unknown>
    const meta = entry.meta as Record<string, unknown> | undefined

    const txType = txData.TransactionType as string
    const account = txData.Account as string
    const destination = txData.Destination as string | undefined
    const hash = (txData.hash ?? entry.hash) as string
    const fee = (txData.Fee as string) ?? '0'
    const sequence = (txData.Sequence as number) ?? 0
    const ledgerIndex = ((txData.ledger_index ?? entry.ledger_index) as number) ?? 0

    const rawDate = txData.date as number | undefined
    const timestamp = rawDate ? (rawDate + RIPPLE_EPOCH_OFFSET) * 1000 : 0

    const result = (meta?.TransactionResult as string) ?? 'unknown'
    const successful = result === 'tesSUCCESS'

    const direction = this.determineDirection(txType, account, destination, address)
    const amount = this.parseAmount(txData, meta, direction)
    const type = this.mapTransactionType(txType)

    const record: TransactionRecord = {
      hash,
      type,
      direction,
      account,
      destination,
      amount,
      fee,
      timestamp,
      ledgerIndex,
      sequence,
      result,
      successful,
    }

    if (type === 'ContractCall') {
      record.contractCall = {
        contractAddress: destination ?? '',
        functionName: (txData.ContractFunction as string) ?? '',
        parameters: this.parseContractParameters(txData),
      }
    }

    return record
  }

  private determineDirection(
    txType: string,
    account: string,
    destination: string | undefined,
    viewerAddress: string,
  ): TransactionDirection {
    if (txType === 'Payment') {
      if (account === viewerAddress && destination === viewerAddress) return 'self'
      if (account === viewerAddress) return 'sent'
      if (destination === viewerAddress) return 'received'
      return 'other'
    }
    if (account === viewerAddress) return 'sent'
    return 'other'
  }

  private parseAmount(
    txData: Record<string, unknown>,
    meta: Record<string, unknown> | undefined,
    direction: TransactionDirection,
  ): TransactionAmount {
    const rawAmount =
      direction === 'received' && meta ? (meta.delivered_amount ?? txData.Amount) : txData.Amount

    if (typeof rawAmount === 'string') {
      return { currency: 'XRP', value: rawAmount }
    }

    if (rawAmount && typeof rawAmount === 'object') {
      const obj = rawAmount as Record<string, string>
      return {
        currency: obj.currency,
        value: obj.value,
        issuer: obj.issuer,
      }
    }

    return { currency: 'XRP', value: '0' }
  }

  private parseContractParameters(
    txData: Record<string, unknown>,
  ): Array<{ sType: string; value: string; flags: number }> | undefined {
    const params = txData.Parameters as Array<Record<string, unknown>> | undefined
    if (!params || params.length === 0) return undefined

    return params.map((p) => {
      const inner = (p.ContractParameter ?? p) as Record<string, unknown>
      return {
        sType: (inner.SType as string) ?? 'Blob',
        value: (inner.Value as string) ?? '',
        flags: (inner.Flags as number) ?? 0,
      }
    })
  }

  private mapTransactionType(type: string): TransactionType {
    const known: Record<string, TransactionType> = {
      Payment: 'Payment',
      TrustSet: 'TrustSet',
      OfferCreate: 'OfferCreate',
      OfferCancel: 'OfferCancel',
      AccountSet: 'AccountSet',
      EscrowCreate: 'EscrowCreate',
      EscrowFinish: 'EscrowFinish',
      EscrowCancel: 'EscrowCancel',
      NFTokenMint: 'NFTokenMint',
      NFTokenBurn: 'NFTokenBurn',
      NFTokenCreateOffer: 'NFTokenCreateOffer',
      NFTokenAcceptOffer: 'NFTokenAcceptOffer',
      NFTokenCancelOffer: 'NFTokenCancelOffer',
      CheckCreate: 'CheckCreate',
      CheckCash: 'CheckCash',
      CheckCancel: 'CheckCancel',
      ContractCall: 'ContractCall',
    }
    return known[type] ?? 'Other'
  }
}
