import { describe, it, expect } from 'vitest'
import { Keyring } from './keyring'
import { deriveAccount, derivedToVaultAccount } from './hd-deriver'
import { generateNewMnemonic } from './mnemonic'

describe('Keyring', () => {
  const mnemonic = generateNewMnemonic()
  const derived = deriveAccount(mnemonic, 0)
  const vaultAccount = derivedToVaultAccount(derived)

  it('should load accounts', () => {
    const keyring = new Keyring()
    keyring.load([vaultAccount])

    expect(keyring.hasAccount(vaultAccount.address)).toBe(true)
    expect(keyring.getAddresses()).toEqual([vaultAccount.address])
  })

  it('should get public key', () => {
    const keyring = new Keyring()
    keyring.load([vaultAccount])

    expect(keyring.getPublicKey(vaultAccount.address)).toBe(vaultAccount.publicKey)
  })

  it('should throw for unknown address', () => {
    const keyring = new Keyring()
    expect(() => keyring.getPublicKey('rUnknown')).toThrow()
  })

  it('should sign a transaction', () => {
    const keyring = new Keyring()
    keyring.load([vaultAccount])

    const tx = {
      TransactionType: 'Payment' as const,
      Account: vaultAccount.address,
      Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
      Amount: '1000000',
      Sequence: 1,
      Fee: '12',
    }

    const signed = keyring.sign(vaultAccount.address, tx as never)
    expect(signed.tx_blob).toBeTruthy()
    expect(signed.hash).toBeTruthy()
  })

  describe('signMessage', () => {
    it('should sign a message and return signature + publicKey', () => {
      const keyring = new Keyring()
      keyring.load([vaultAccount])

      const result = keyring.signMessage(vaultAccount.address, 'hello world')
      expect(result.signature).toBeTruthy()
      expect(result.signature).toMatch(/^[0-9a-f]{128}$/i)
      expect(result.publicKey).toBe(vaultAccount.publicKey)
    })

    it('should produce different signatures for different messages', () => {
      const keyring = new Keyring()
      keyring.load([vaultAccount])

      const sig1 = keyring.signMessage(vaultAccount.address, 'message one')
      const sig2 = keyring.signMessage(vaultAccount.address, 'message two')
      expect(sig1.signature).not.toBe(sig2.signature)
    })

    it('should produce deterministic signatures for the same message', () => {
      const keyring = new Keyring()
      keyring.load([vaultAccount])

      const sig1 = keyring.signMessage(vaultAccount.address, 'deterministic')
      const sig2 = keyring.signMessage(vaultAccount.address, 'deterministic')
      expect(sig1.signature).toBe(sig2.signature)
    })

    it('should throw for unknown address', () => {
      const keyring = new Keyring()
      expect(() => keyring.signMessage('rUnknown', 'test')).toThrow('Account not found')
    })
  })

  it('should clear all accounts', () => {
    const keyring = new Keyring()
    keyring.load([vaultAccount])
    keyring.clear()

    expect(keyring.getAddresses()).toEqual([])
    expect(keyring.hasAccount(vaultAccount.address)).toBe(false)
  })
})
