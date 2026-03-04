import { describe, it, expect } from 'vitest'
import { TransactionSimulator } from './simulator'

describe('TransactionSimulator', () => {
  const simulator = new TransactionSimulator()

  describe('XRP Payment', () => {
    it('should compute correct balance changes for XRP payment', () => {
      const tx = {
        TransactionType: 'Payment',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '5000000', // 5 XRP
        Fee: '12',
      }

      const result = simulator.simulate(tx, '100000000') // 100 XRP balance

      expect(result.success).toBe(true)
      expect(result.balanceChanges).toHaveLength(1)

      const change = result.balanceChanges[0]
      expect(change.currency).toBe('XRP')
      expect(change.before).toBe('100.000000')
      expect(change.delta).toBe('-5.000000')
      // after = 100 - 5 - 0.000012 = 94.999988
      expect(change.after).toBe('94.999988')
    })

    it('should deduct fee from the sender balance', () => {
      const tx = {
        TransactionType: 'Payment',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '1000000', // 1 XRP
        Fee: '1000', // higher fee
      }

      const result = simulator.simulate(tx, '50000000') // 50 XRP

      expect(result.fee).toBe('0.001000')
      const change = result.balanceChanges[0]
      // after = 50 - 1 - 0.001 = 48.999
      expect(change.after).toBe('48.999000')
    })

    it('should default fee to 12 drops when not specified', () => {
      const tx = {
        TransactionType: 'Payment',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '1000000',
      }

      const result = simulator.simulate(tx, '10000000')

      expect(result.fee).toBe('0.000012')
    })

    it('should use zero balance when accountBalance is not provided', () => {
      const tx = {
        TransactionType: 'Payment',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '1000000',
        Fee: '12',
      }

      const result = simulator.simulate(tx)

      const change = result.balanceChanges[0]
      expect(change.before).toBe('0')
    })
  })

  describe('Token Payment', () => {
    it('should compute token delta and XRP fee separately', () => {
      const tx = {
        TransactionType: 'Payment',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: {
          currency: 'USD',
          issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          value: '10.5',
        },
        Fee: '12',
      }

      const result = simulator.simulate(tx, '50000000') // 50 XRP

      expect(result.success).toBe(true)
      expect(result.balanceChanges).toHaveLength(2)

      // Token balance change
      const tokenChange = result.balanceChanges[0]
      expect(tokenChange.currency).toBe('USD')
      expect(tokenChange.issuer).toBe('rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B')
      expect(tokenChange.delta).toBe('-10.5')

      // XRP fee change
      const xrpChange = result.balanceChanges[1]
      expect(xrpChange.currency).toBe('XRP')
      expect(xrpChange.before).toBe('50.000000')
      expect(xrpChange.delta).toBe('-0.000012')
      expect(xrpChange.after).toBe('49.999988')
    })
  })

  describe('TrustSet', () => {
    it('should report objectsCreated=1 when setting a trust line', () => {
      const tx = {
        TransactionType: 'TrustSet',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        LimitAmount: {
          currency: 'USD',
          issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          value: '1000000',
        },
        Fee: '12',
      }

      const result = simulator.simulate(tx, '20000000') // 20 XRP

      expect(result.success).toBe(true)
      expect(result.objectsCreated).toBe(1)
      expect(result.objectsDeleted).toBe(0)
      expect(result.fee).toBe('0.000012')

      const change = result.balanceChanges[0]
      expect(change.currency).toBe('XRP')
      expect(change.before).toBe('20.000000')
      expect(change.after).toBe('19.999988')
    })

    it('should report objectsDeleted=1 when removing a trust line', () => {
      const tx = {
        TransactionType: 'TrustSet',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        LimitAmount: {
          currency: 'USD',
          issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          value: '0',
        },
        Fee: '12',
      }

      const result = simulator.simulate(tx, '20000000')

      expect(result.objectsCreated).toBe(0)
      expect(result.objectsDeleted).toBe(1)
    })
  })

  describe('OfferCreate', () => {
    it('should report objectsCreated=1 and deduct fee', () => {
      const tx = {
        TransactionType: 'OfferCreate',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        TakerPays: '5000000',
        TakerGets: {
          currency: 'USD',
          issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
          value: '10',
        },
        Fee: '12',
      }

      const result = simulator.simulate(tx, '30000000') // 30 XRP

      expect(result.success).toBe(true)
      expect(result.objectsCreated).toBe(1)
      expect(result.objectsDeleted).toBe(0)

      const change = result.balanceChanges[0]
      expect(change.currency).toBe('XRP')
      expect(change.before).toBe('30.000000')
      expect(change.after).toBe('29.999988')
      expect(change.delta).toBe('-0.000012')
    })
  })

  describe('Unknown transaction type', () => {
    it('should only show fee for unknown transaction types', () => {
      const tx = {
        TransactionType: 'AccountSet',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Fee: '12',
      }

      const result = simulator.simulate(tx, '10000000') // 10 XRP

      expect(result.success).toBe(true)
      expect(result.balanceChanges).toHaveLength(1)
      expect(result.objectsCreated).toBe(0)
      expect(result.objectsDeleted).toBe(0)

      const change = result.balanceChanges[0]
      expect(change.currency).toBe('XRP')
      expect(change.delta).toBe('-0.000012')
    })
  })

  describe('error handling', () => {
    it('should return success=false with error message on failure', () => {
      // Force an error by passing a tx that causes Number() to throw
      // We need to create a scenario where the code throws
      const original = Number
      // @ts-expect-error - intentionally override for test
      globalThis.Number = () => {
        throw new Error('numeric conversion failed')
      }

      const tx = {
        TransactionType: 'Payment',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '1000000',
        Fee: '12',
      }

      const result = simulator.simulate(tx, '10000000')

      expect(result.success).toBe(false)
      expect(result.error).toBe('numeric conversion failed')
      expect(result.balanceChanges).toEqual([])
      expect(result.fee).toBe('0')
      expect(result.objectsCreated).toBe(0)
      expect(result.objectsDeleted).toBe(0)

      // Restore
      globalThis.Number = original
    })
  })
})
