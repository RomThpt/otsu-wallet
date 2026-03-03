import { describe, it, expect } from 'vitest'
import { buildAccountSet, ACCOUNT_SET_FLAGS } from './account-settings'

const ACCOUNT = 'rTestAccount123456789'

describe('Account Settings Builder', () => {
  describe('buildAccountSet', () => {
    it('builds basic AccountSet', () => {
      const tx = buildAccountSet(ACCOUNT, {})

      expect(tx.TransactionType).toBe('AccountSet')
      expect(tx.Account).toBe(ACCOUNT)
    })

    it('sets domain as hex', () => {
      const tx = buildAccountSet(ACCOUNT, { domain: 'example.com' })

      expect(tx.Domain).toBeTruthy()
      expect(typeof tx.Domain).toBe('string')
      // Verify it's hex-encoded
      expect(tx.Domain).toMatch(/^[0-9A-F]+$/)
    })

    it('sets emailHash', () => {
      const tx = buildAccountSet(ACCOUNT, { emailHash: 'ABCDEF1234567890' })

      expect(tx.EmailHash).toBe('ABCDEF1234567890')
    })

    it('sets and clears flags', () => {
      const tx = buildAccountSet(ACCOUNT, {
        setFlag: ACCOUNT_SET_FLAGS.asfRequireDest,
        clearFlag: ACCOUNT_SET_FLAGS.asfDisallowXRP,
      })

      expect(tx.SetFlag).toBe(1)
      expect(tx.ClearFlag).toBe(3)
    })
  })

  describe('ACCOUNT_SET_FLAGS', () => {
    it('exports known flags', () => {
      expect(ACCOUNT_SET_FLAGS.asfRequireDest).toBe(1)
      expect(ACCOUNT_SET_FLAGS.asfDefaultRipple).toBe(8)
      expect(ACCOUNT_SET_FLAGS.asfDepositAuth).toBe(9)
    })
  })
})
