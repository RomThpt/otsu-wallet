import { describe, it, expect } from 'vitest'
import { buildContractCall, validateContractCall } from './contract-builder'
import { CONTRACT_DEFAULT_FEE } from '@otsu/constants'
import type { ContractCallParams } from '@otsu/types'

const ACCOUNT = 'rAccount123'

describe('buildContractCall', () => {
  it('builds basic contract call', () => {
    const tx = buildContractCall(ACCOUNT, {
      contractAddress: 'rContract456',
      functionName: 'transfer',
    })

    expect(tx.TransactionType).toBe('ContractCall')
    expect(tx.Account).toBe(ACCOUNT)
    expect(tx.Destination).toBe('rContract456')
    expect(tx.ContractFunction).toBe('transfer')
    expect(tx.Fee).toBe(CONTRACT_DEFAULT_FEE)
    expect(tx.Parameters).toBeUndefined()
  })

  it('builds contract call with parameters', () => {
    const tx = buildContractCall(ACCOUNT, {
      contractAddress: 'rContract456',
      functionName: 'transfer',
      parameters: [
        { sType: 'STAmount', value: '1000000', flags: 1 },
        { sType: 'AccountID', value: 'rRecipient', flags: 0 },
      ],
    })

    expect(tx.Parameters).toEqual([
      { ContractParameter: { SType: 'STAmount', Value: '1000000', Flags: 1 } },
      { ContractParameter: { SType: 'AccountID', Value: 'rRecipient', Flags: 0 } },
    ])
  })

  it('uses custom fee when provided', () => {
    const tx = buildContractCall(ACCOUNT, {
      contractAddress: 'rContract456',
      functionName: 'transfer',
      fee: '100000',
    })

    expect(tx.Fee).toBe('100000')
  })

  it('uses default fee when not provided', () => {
    const tx = buildContractCall(ACCOUNT, {
      contractAddress: 'rContract456',
      functionName: 'transfer',
    })

    expect(tx.Fee).toBe(CONTRACT_DEFAULT_FEE)
  })
})

describe('validateContractCall', () => {
  it('throws on missing contract address', () => {
    expect(() =>
      validateContractCall({
        contractAddress: '',
        functionName: 'transfer',
      }),
    ).toThrow('Contract address is required')
  })

  it('throws on missing function name', () => {
    expect(() =>
      validateContractCall({
        contractAddress: 'rContract',
        functionName: '',
      }),
    ).toThrow('Function name is required')
  })

  it('throws on too many parameters', () => {
    const params: ContractCallParams = {
      contractAddress: 'rContract',
      functionName: 'transfer',
      parameters: [
        { sType: 'Blob', value: '1', flags: 0 },
        { sType: 'Blob', value: '2', flags: 0 },
        { sType: 'Blob', value: '3', flags: 0 },
        { sType: 'Blob', value: '4', flags: 0 },
        { sType: 'Blob', value: '5', flags: 0 },
      ],
    }

    expect(() => validateContractCall(params)).toThrow('Maximum 4 parameters allowed')
  })

  it('passes for valid params', () => {
    expect(() =>
      validateContractCall({
        contractAddress: 'rContract',
        functionName: 'transfer',
        parameters: [{ sType: 'STAmount', value: '1000', flags: 0 }],
      }),
    ).not.toThrow()
  })
})
