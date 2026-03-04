import { describe, it, expect } from 'vitest'
import { buildPayment, validatePayment } from './payment'

describe('payment', () => {
  const validParams = {
    account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
    destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    amount: '1000000',
  }

  it('should build a payment transaction', () => {
    const tx = buildPayment(validParams)

    expect(tx.TransactionType).toBe('Payment')
    expect(tx.Account).toBe(validParams.account)
    expect(tx.Destination).toBe(validParams.destination)
    expect(tx.Amount).toBe('1000000')
  })

  it('should include destination tag when provided', () => {
    const tx = buildPayment({ ...validParams, destinationTag: 12345 })

    expect(tx.DestinationTag).toBe(12345)
  })

  it('should not include destination tag when not provided', () => {
    const tx = buildPayment(validParams)

    expect(tx.DestinationTag).toBeUndefined()
  })

  it('should reject invalid destination address', () => {
    expect(() => validatePayment({ ...validParams, destination: 'invalid' })).toThrow(
      'Invalid destination address',
    )
  })

  it('should reject zero amount', () => {
    expect(() => validatePayment({ ...validParams, amount: '0' })).toThrow(
      'Amount must be positive',
    )
  })

  it('should reject sending to self', () => {
    expect(() =>
      validatePayment({ ...validParams, destination: validParams.account }),
    ).toThrow('Cannot send to yourself')
  })
})
