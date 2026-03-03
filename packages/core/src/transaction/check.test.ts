import { describe, it, expect } from 'vitest'
import { buildCreateCheck, buildCashCheck, buildCancelCheck } from './check'

const ACCOUNT = 'rTestAccount123456789'

describe('Check Builders', () => {
  describe('buildCreateCheck', () => {
    it('builds XRP check', () => {
      const tx = buildCreateCheck(ACCOUNT, {
        destination: 'rDest123',
        sendMax: '10000000',
      })

      expect(tx.TransactionType).toBe('CheckCreate')
      expect(tx.Account).toBe(ACCOUNT)
      expect(tx.Destination).toBe('rDest123')
      expect(tx.SendMax).toBe('10000000')
    })

    it('builds token check', () => {
      const tx = buildCreateCheck(ACCOUNT, {
        destination: 'rDest123',
        sendMax: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        expiration: 750000100,
        destinationTag: 999,
      })

      expect(tx.SendMax).toEqual({ currency: 'USD', issuer: 'rIssuer', value: '100' })
      expect(tx.Expiration).toBe(750000100)
      expect(tx.DestinationTag).toBe(999)
    })
  })

  describe('buildCashCheck', () => {
    it('builds cash with exact amount', () => {
      const tx = buildCashCheck(ACCOUNT, {
        checkID: 'CHECK123',
        amount: '5000000',
      })

      expect(tx.TransactionType).toBe('CheckCash')
      expect(tx.CheckID).toBe('CHECK123')
      expect(tx.Amount).toBe('5000000')
    })

    it('builds cash with deliverMin', () => {
      const tx = buildCashCheck(ACCOUNT, {
        checkID: 'CHECK123',
        deliverMin: '4000000',
      })

      expect(tx.DeliverMin).toBe('4000000')
      expect(tx.Amount).toBeUndefined()
    })
  })

  describe('buildCancelCheck', () => {
    it('builds cancel transaction', () => {
      const tx = buildCancelCheck(ACCOUNT, { checkID: 'CHECK123' })

      expect(tx.TransactionType).toBe('CheckCancel')
      expect(tx.CheckID).toBe('CHECK123')
    })
  })
})
