import { describe, it, expect } from 'vitest'
import { generateNewMnemonic, isValidMnemonic, mnemonicToWordArray } from './mnemonic'

describe('mnemonic', () => {
  it('should generate a 24-word mnemonic', () => {
    const mnemonic = generateNewMnemonic()
    const words = mnemonic.split(' ')
    expect(words).toHaveLength(24)
  })

  it('should validate a correct mnemonic', () => {
    const mnemonic = generateNewMnemonic()
    expect(isValidMnemonic(mnemonic)).toBe(true)
  })

  it('should reject an invalid mnemonic', () => {
    expect(isValidMnemonic('invalid words that are not a real mnemonic phrase')).toBe(false)
  })

  it('should split mnemonic to word array', () => {
    const mnemonic = generateNewMnemonic()
    const words = mnemonicToWordArray(mnemonic)
    expect(words).toHaveLength(24)
    words.forEach((word) => {
      expect(word).toMatch(/^[a-z]+$/)
    })
  })

  it('should produce different mnemonics each time', () => {
    const a = generateNewMnemonic()
    const b = generateNewMnemonic()
    expect(a).not.toBe(b)
  })
})
