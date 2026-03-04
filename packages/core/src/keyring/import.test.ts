import { describe, it, expect } from 'vitest'
import {
  importFromMnemonic,
  importFromSecretKey,
  importFromFamilySeed,
  importFromPrivateKeyHex,
  importFromXummSecretNumbers,
  importAccount,
} from './import'

const TEST_MNEMONIC_24 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'

const TEST_MNEMONIC_12 =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('importFromMnemonic', () => {
  it('imports from 24-word mnemonic', () => {
    const result = importFromMnemonic(TEST_MNEMONIC_24)
    expect(result.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    expect(result.type).toBe('hd')
    expect(result.index).toBe(0)
    expect(result.derivationPath).toBeDefined()
  })

  it('imports from 12-word mnemonic', () => {
    const result = importFromMnemonic(TEST_MNEMONIC_12)
    expect(result.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    expect(result.type).toBe('hd')
  })

  it('derives different accounts for different indices', () => {
    const a0 = importFromMnemonic(TEST_MNEMONIC_24, 0)
    const a1 = importFromMnemonic(TEST_MNEMONIC_24, 1)
    expect(a0.address).not.toBe(a1.address)
  })

  it('rejects invalid mnemonic', () => {
    expect(() => importFromMnemonic('invalid words here')).toThrow('Invalid mnemonic')
  })
})

describe('importFromSecretKey', () => {
  it('imports from valid secret key', () => {
    const result = importFromSecretKey('snoPBrXtMeMyMHUVTgbuqAfg1SUTb')
    expect(result.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    expect(result.type).toBe('imported')
    expect(result.publicKey).toBeTruthy()
    expect(result.privateKey).toBeTruthy()
  })

  it('rejects invalid secret key format', () => {
    expect(() => importFromSecretKey('abc')).toThrow('Invalid XRPL secret key')
  })

  it('rejects corrupted secret key', () => {
    expect(() => importFromSecretKey('sXXXXXXXXXXXXXXXXXXXXXXXXXXXX')).toThrow()
  })
})

describe('importFromFamilySeed', () => {
  it('imports from valid family seed', () => {
    const result = importFromFamilySeed('snoPBrXtMeMyMHUVTgbuqAfg1SUTb')
    expect(result.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    expect(result.type).toBe('imported')
  })

  it('produces same address as secret key import for same seed', () => {
    const seed = 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb'
    const fromSecret = importFromSecretKey(seed)
    const fromSeed = importFromFamilySeed(seed)
    expect(fromSecret.address).toBe(fromSeed.address)
  })

  it('rejects invalid format', () => {
    expect(() => importFromFamilySeed('abc')).toThrow('Invalid family seed')
  })
})

describe('importFromPrivateKeyHex', () => {
  it('imports from 64-char hex private key', () => {
    const mnemonic = importFromMnemonic(TEST_MNEMONIC_24)
    const rawKey = mnemonic.privateKey.startsWith('00')
      ? mnemonic.privateKey.slice(2)
      : mnemonic.privateKey
    const result = importFromPrivateKeyHex(rawKey)
    expect(result.address).toBe(mnemonic.address)
    expect(result.type).toBe('imported')
  })

  it('imports from 66-char hex with 00 prefix', () => {
    const mnemonic = importFromMnemonic(TEST_MNEMONIC_24)
    const result = importFromPrivateKeyHex(mnemonic.privateKey)
    expect(result.address).toBe(mnemonic.address)
  })

  it('handles 0x prefix', () => {
    const mnemonic = importFromMnemonic(TEST_MNEMONIC_24)
    const rawKey = mnemonic.privateKey.startsWith('00')
      ? mnemonic.privateKey.slice(2)
      : mnemonic.privateKey
    const result = importFromPrivateKeyHex(`0x${rawKey}`)
    expect(result.address).toBe(mnemonic.address)
  })

  it('rejects invalid hex length', () => {
    expect(() => importFromPrivateKeyHex('ABCDEF')).toThrow('64 or 66 hex characters')
  })

  it('rejects invalid hex characters', () => {
    expect(() => importFromPrivateKeyHex('g'.repeat(64))).toThrow('64 or 66 hex characters')
  })
})

describe('importFromXummSecretNumbers', () => {
  it('imports from valid Xumm secret numbers', () => {
    const numbers = '000000 000000 000000 000000 000000 000000 000000 000000'
    const result = importFromXummSecretNumbers(numbers)
    expect(result.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    expect(result.type).toBe('imported')
  })

  it('rejects wrong digit count', () => {
    expect(() => importFromXummSecretNumbers('12345')).toThrow('48 digits total')
  })

  it('rejects invalid checksum', () => {
    const numbers = '000001 000000 000000 000000 000000 000000 000000 000000'
    expect(() => importFromXummSecretNumbers(numbers)).toThrow('Checksum mismatch')
  })
})

describe('importAccount dispatcher', () => {
  it('routes mnemonic format', () => {
    const result = importAccount({ format: 'mnemonic', value: TEST_MNEMONIC_24 })
    expect(result.type).toBe('hd')
  })

  it('routes secret_key format', () => {
    const result = importAccount({ format: 'secret_key', value: 'snoPBrXtMeMyMHUVTgbuqAfg1SUTb' })
    expect(result.type).toBe('imported')
  })

  it('rejects unsupported format', () => {
    expect(() => importAccount({ format: 'unknown' as never, value: 'test' })).toThrow(
      'Unsupported import format',
    )
  })
})
