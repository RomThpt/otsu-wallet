import { describe, it, expect } from 'vitest'
import { buildOfferCreate, buildOfferCancel } from './dex-builders'

const ACCOUNT = 'rTestAccount123456789'

describe('DEX Builders', () => {
  describe('buildOfferCreate', () => {
    it('builds XRP-for-token offer', () => {
      const tx = buildOfferCreate(ACCOUNT, {
        takerGets: { currency: 'USD', issuer: 'rIssuer', value: '10' },
        takerPays: '5000000',
      })

      expect(tx.TransactionType).toBe('OfferCreate')
      expect(tx.Account).toBe(ACCOUNT)
      expect(tx.TakerGets).toEqual({ currency: 'USD', issuer: 'rIssuer', value: '10' })
      expect(tx.TakerPays).toBe('5000000')
    })

    it('includes optional fields', () => {
      const tx = buildOfferCreate(ACCOUNT, {
        takerGets: '1000000',
        takerPays: '2000000',
        expiration: 750000000,
        flags: 0x00080000,
      })

      expect(tx.Expiration).toBe(750000000)
      expect(tx.Flags).toBe(0x00080000)
    })

    it('omits undefined optional fields', () => {
      const tx = buildOfferCreate(ACCOUNT, {
        takerGets: '1000000',
        takerPays: '2000000',
      })

      expect(tx.Expiration).toBeUndefined()
      expect(tx.Flags).toBeUndefined()
    })
  })

  describe('buildOfferCancel', () => {
    it('builds cancel transaction', () => {
      const tx = buildOfferCancel(ACCOUNT, 42)

      expect(tx.TransactionType).toBe('OfferCancel')
      expect(tx.Account).toBe(ACCOUNT)
      expect(tx.OfferSequence).toBe(42)
    })
  })
})
