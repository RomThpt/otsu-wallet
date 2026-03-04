import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, encryptWithKey, decryptWithKey, deriveEncryptionKey } from './crypto'

describe('crypto', () => {
  it('should encrypt and decrypt a roundtrip', async () => {
    const plaintext = 'hello world secret data'
    const password = 'test-password-123'

    const encrypted = await encrypt(plaintext, password)

    expect(encrypted.ciphertext).toBeTruthy()
    expect(encrypted.iv).toBeTruthy()
    expect(encrypted.salt).toBeTruthy()
    expect(encrypted.ciphertext).not.toBe(plaintext)

    const decrypted = await decrypt(encrypted, password)
    expect(decrypted).toBe(plaintext)
  })

  it('should fail decryption with wrong password', async () => {
    const encrypted = await encrypt('secret', 'correct-password')

    await expect(decrypt(encrypted, 'wrong-password')).rejects.toThrow()
  })

  it('should produce different ciphertext each time', async () => {
    const plaintext = 'same text'
    const password = 'same-password'

    const a = await encrypt(plaintext, password)
    const b = await encrypt(plaintext, password)

    expect(a.ciphertext).not.toBe(b.ciphertext)
    expect(a.iv).not.toBe(b.iv)
    expect(a.salt).not.toBe(b.salt)
  })

  it('should encrypt and decrypt with a derived key', async () => {
    const password = 'test-key-password'
    const salt = crypto.getRandomValues(new Uint8Array(32))

    const key = await deriveEncryptionKey(password, salt)
    const { ciphertext, iv } = await encryptWithKey('key-encrypted data', key)

    const decrypted = await decryptWithKey(ciphertext, iv, key)
    expect(decrypted).toBe('key-encrypted data')
  })

  it('should handle JSON data roundtrip', async () => {
    const data = { mnemonic: 'word1 word2 word3', accounts: [{ address: 'rTest' }] }
    const plaintext = JSON.stringify(data)
    const password = 'json-password'

    const encrypted = await encrypt(plaintext, password)
    const decrypted = await decrypt(encrypted, password)

    expect(JSON.parse(decrypted)).toEqual(data)
  })
})
