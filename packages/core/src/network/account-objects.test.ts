import { describe, it, expect } from 'vitest'
import { parseEscrows, parseChecks } from './account-objects'

describe('parseEscrows', () => {
  it('should parse escrow fields correctly', () => {
    const objects = [
      {
        LedgerEntryType: 'Escrow',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '1000000',
        Sequence: 42,
        Condition: 'A0258020E3B0C44298FC1C149AFBF4C8996FB924',
        FinishAfter: 700000000,
        CancelAfter: 700100000,
        PreviousTxnID: 'ABCDEF1234567890',
      },
    ]

    const result = parseEscrows(objects)
    expect(result).toHaveLength(1)
    expect(result[0].account).toBe('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')
    expect(result[0].destination).toBe('rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe')
    expect(result[0].amount).toBe('1000000')
    expect(result[0].seq).toBe(42)
    expect(result[0].condition).toBe('A0258020E3B0C44298FC1C149AFBF4C8996FB924')
    expect(result[0].finishAfter).toBe(700000000)
    expect(result[0].cancelAfter).toBe(700100000)
    expect(result[0].previousTxnID).toBe('ABCDEF1234567890')
  })

  it('should parse escrow without optional fields', () => {
    const objects = [
      {
        LedgerEntryType: 'Escrow',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '500000',
        Sequence: 10,
      },
    ]

    const result = parseEscrows(objects)
    expect(result).toHaveLength(1)
    expect(result[0].condition).toBeUndefined()
    expect(result[0].finishAfter).toBeUndefined()
    expect(result[0].cancelAfter).toBeUndefined()
  })

  it('should return empty array for empty input', () => {
    expect(parseEscrows([])).toEqual([])
  })

  it('should filter out non-escrow objects', () => {
    const objects = [
      { LedgerEntryType: 'Check', Account: 'rTest' },
      {
        LedgerEntryType: 'Escrow',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        Amount: '100',
        Sequence: 1,
      },
      { LedgerEntryType: 'Offer', Account: 'rOther' },
    ]

    const result = parseEscrows(objects)
    expect(result).toHaveLength(1)
    expect(result[0].seq).toBe(1)
  })
})

describe('parseChecks', () => {
  it('should parse check with string sendMax', () => {
    const objects = [
      {
        LedgerEntryType: 'Check',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        SendMax: '5000000',
        Sequence: 15,
        index: 'ABC123',
        Expiration: 700200000,
      },
    ]

    const result = parseChecks(objects)
    expect(result).toHaveLength(1)
    expect(result[0].sendMax).toBe('5000000')
    expect(result[0].account).toBe('rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh')
    expect(result[0].destination).toBe('rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe')
    expect(result[0].index).toBe('ABC123')
    expect(result[0].sequence).toBe(15)
    expect(result[0].expiration).toBe(700200000)
  })

  it('should parse check with object sendMax', () => {
    const objects = [
      {
        LedgerEntryType: 'Check',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        SendMax: { currency: 'USD', issuer: 'rIssuer123', value: '100' },
        Sequence: 20,
        index: 'DEF456',
      },
    ]

    const result = parseChecks(objects)
    expect(result).toHaveLength(1)
    expect(result[0].sendMax).toEqual({
      currency: 'USD',
      issuer: 'rIssuer123',
      value: '100',
    })
    expect(result[0].expiration).toBeUndefined()
  })

  it('should return empty array for empty input', () => {
    expect(parseChecks([])).toEqual([])
  })

  it('should filter out non-check objects', () => {
    const objects = [
      { LedgerEntryType: 'Escrow', Account: 'rTest' },
      {
        LedgerEntryType: 'Check',
        Account: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh',
        Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        SendMax: '1000',
        Sequence: 5,
        index: 'GHI789',
      },
    ]

    const result = parseChecks(objects)
    expect(result).toHaveLength(1)
    expect(result[0].sequence).toBe(5)
  })
})
