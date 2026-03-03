import { describe, it, expect } from 'vitest'
import { buildCreateEscrow, buildFinishEscrow, buildCancelEscrow } from './escrow'

const ACCOUNT = 'rTestAccount123456789'

describe('Escrow Builders', () => {
  describe('buildCreateEscrow', () => {
    it('builds basic escrow', () => {
      const tx = buildCreateEscrow(ACCOUNT, {
        destination: 'rDest123',
        amount: '10000000',
      })

      expect(tx.TransactionType).toBe('EscrowCreate')
      expect(tx.Account).toBe(ACCOUNT)
      expect(tx.Destination).toBe('rDest123')
      expect(tx.Amount).toBe('10000000')
    })

    it('includes optional fields', () => {
      const tx = buildCreateEscrow(ACCOUNT, {
        destination: 'rDest123',
        amount: '10000000',
        condition: 'A0258020...',
        cancelAfter: 750000100,
        finishAfter: 750000050,
        destinationTag: 12345,
      })

      expect(tx.Condition).toBe('A0258020...')
      expect(tx.CancelAfter).toBe(750000100)
      expect(tx.FinishAfter).toBe(750000050)
      expect(tx.DestinationTag).toBe(12345)
    })
  })

  describe('buildFinishEscrow', () => {
    it('builds basic finish', () => {
      const tx = buildFinishEscrow(ACCOUNT, {
        owner: 'rOwner123',
        offerSequence: 5,
      })

      expect(tx.TransactionType).toBe('EscrowFinish')
      expect(tx.Owner).toBe('rOwner123')
      expect(tx.OfferSequence).toBe(5)
    })

    it('includes condition and fulfillment', () => {
      const tx = buildFinishEscrow(ACCOUNT, {
        owner: 'rOwner123',
        offerSequence: 5,
        condition: 'A0258020...',
        fulfillment: 'A0028020...',
      })

      expect(tx.Condition).toBe('A0258020...')
      expect(tx.Fulfillment).toBe('A0028020...')
    })
  })

  describe('buildCancelEscrow', () => {
    it('builds cancel transaction', () => {
      const tx = buildCancelEscrow(ACCOUNT, {
        owner: 'rOwner123',
        offerSequence: 5,
      })

      expect(tx.TransactionType).toBe('EscrowCancel')
      expect(tx.Owner).toBe('rOwner123')
      expect(tx.OfferSequence).toBe(5)
    })
  })
})
