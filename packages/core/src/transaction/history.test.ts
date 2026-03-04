import { describe, it, expect, vi } from 'vitest'
import { TransactionHistoryClient } from './history'

const VIEWER = 'rViewer1234567890'
const OTHER = 'rOther1234567890'

function createMockClient(transactions: unknown[] = [], marker?: unknown) {
  return {
    getAccountTransactions: vi.fn().mockResolvedValue({ transactions, marker }),
  } as unknown as import('../network/client').XrplClient
}

function makePaymentEntry(opts: {
  account: string
  destination: string
  amount: string | Record<string, string>
  hash?: string
  result?: string
  date?: number
}) {
  return {
    tx_json: {
      TransactionType: 'Payment',
      Account: opts.account,
      Destination: opts.destination,
      Amount: opts.amount,
      Fee: '12',
      Sequence: 1,
      hash: opts.hash ?? 'ABCDEF1234567890',
      ledger_index: 100,
      date: opts.date ?? 750000000,
    },
    meta: {
      TransactionResult: opts.result ?? 'tesSUCCESS',
      delivered_amount: opts.amount,
    },
  }
}

describe('TransactionHistoryClient', () => {
  describe('parseTransaction', () => {
    it('parses XRP payment sent', () => {
      const client = new TransactionHistoryClient(createMockClient())
      const entry = makePaymentEntry({
        account: VIEWER,
        destination: OTHER,
        amount: '1000000',
      })
      const tx = client.parseTransaction(entry, VIEWER)

      expect(tx).not.toBeNull()
      expect(tx!.type).toBe('Payment')
      expect(tx!.direction).toBe('sent')
      expect(tx!.amount).toEqual({ currency: 'XRP', value: '1000000' })
      expect(tx!.successful).toBe(true)
    })

    it('parses XRP payment received', () => {
      const client = new TransactionHistoryClient(createMockClient())
      const entry = makePaymentEntry({
        account: OTHER,
        destination: VIEWER,
        amount: '5000000',
      })
      const tx = client.parseTransaction(entry, VIEWER)

      expect(tx!.direction).toBe('received')
      expect(tx!.amount.value).toBe('5000000')
    })

    it('parses token payment', () => {
      const client = new TransactionHistoryClient(createMockClient())
      const entry = makePaymentEntry({
        account: VIEWER,
        destination: OTHER,
        amount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
      })
      const tx = client.parseTransaction(entry, VIEWER)

      expect(tx!.amount.currency).toBe('USD')
      expect(tx!.amount.issuer).toBe('rIssuer')
      expect(tx!.amount.value).toBe('100')
    })

    it('parses self-payment', () => {
      const client = new TransactionHistoryClient(createMockClient())
      const entry = makePaymentEntry({
        account: VIEWER,
        destination: VIEWER,
        amount: '1000',
      })
      const tx = client.parseTransaction(entry, VIEWER)

      expect(tx!.direction).toBe('self')
    })

    it('parses TrustSet transaction', () => {
      const client = new TransactionHistoryClient(createMockClient())
      const entry = {
        tx_json: {
          TransactionType: 'TrustSet',
          Account: VIEWER,
          LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '1000' },
          Fee: '12',
          Sequence: 2,
          hash: 'TRUSTHASH123',
          ledger_index: 101,
          date: 750000000,
        },
        meta: { TransactionResult: 'tesSUCCESS' },
      }
      const tx = client.parseTransaction(entry, VIEWER)

      expect(tx!.type).toBe('TrustSet')
      expect(tx!.direction).toBe('sent')
    })

    it('marks failed transactions', () => {
      const client = new TransactionHistoryClient(createMockClient())
      const entry = makePaymentEntry({
        account: VIEWER,
        destination: OTHER,
        amount: '1000',
        result: 'tecUNFUNDED_PAYMENT',
      })
      const tx = client.parseTransaction(entry, VIEWER)

      expect(tx!.successful).toBe(false)
      expect(tx!.result).toBe('tecUNFUNDED_PAYMENT')
    })
  })

  describe('getTransactionHistory', () => {
    it('returns empty page for no transactions', async () => {
      const client = new TransactionHistoryClient(createMockClient([]))
      const page = await client.getTransactionHistory(VIEWER)

      expect(page.transactions).toEqual([])
      expect(page.hasMore).toBe(false)
    })

    it('returns transactions with pagination', async () => {
      const entries = [
        makePaymentEntry({ account: VIEWER, destination: OTHER, amount: '1000', hash: 'H1' }),
      ]
      const client = new TransactionHistoryClient(createMockClient(entries, { ledger: 99 }))
      const page = await client.getTransactionHistory(VIEWER)

      expect(page.transactions).toHaveLength(1)
      expect(page.hasMore).toBe(true)
      expect(page.marker).toEqual({ ledger: 99 })
    })

    it('converts timestamp correctly', () => {
      const client = new TransactionHistoryClient(createMockClient())
      const entry = makePaymentEntry({
        account: VIEWER,
        destination: OTHER,
        amount: '1000',
        date: 750000000,
      })
      const tx = client.parseTransaction(entry, VIEWER)
      // 750000000 + 946684800 = 1696684800 seconds -> ms
      expect(tx!.timestamp).toBe(1696684800000)
    })
  })
})
