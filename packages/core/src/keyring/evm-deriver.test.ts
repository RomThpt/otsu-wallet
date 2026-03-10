import { describe, it, expect } from 'vitest'
import { deriveEvmAccount, deriveEvmAccounts, evmDerivedToVaultAccount } from './evm-deriver'

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('evm-deriver', () => {
  describe('deriveEvmAccount', () => {
    it('should derive an account with a 0x-prefixed address', () => {
      const account = deriveEvmAccount(TEST_MNEMONIC, 0)

      expect(account.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })

    it('should include a public key and private key', () => {
      const account = deriveEvmAccount(TEST_MNEMONIC, 0)

      expect(account.publicKey).toBeTruthy()
      expect(account.privateKey).toBeTruthy()
    })

    it('should set the correct derivation path for index 0', () => {
      const account = deriveEvmAccount(TEST_MNEMONIC, 0)

      expect(account.derivationPath).toBe("m/44'/60'/0'/0/0")
    })

    it('should set the correct derivation path for index 3', () => {
      const account = deriveEvmAccount(TEST_MNEMONIC, 3)

      expect(account.derivationPath).toBe("m/44'/60'/0'/0/3")
    })

    it('should set the index on the returned account', () => {
      const account = deriveEvmAccount(TEST_MNEMONIC, 5)

      expect(account.index).toBe(5)
    })

    it('should derive the same address deterministically from the same mnemonic and index', () => {
      const a = deriveEvmAccount(TEST_MNEMONIC, 0)
      const b = deriveEvmAccount(TEST_MNEMONIC, 0)

      expect(a.address).toBe(b.address)
      expect(a.publicKey).toBe(b.publicKey)
      expect(a.privateKey).toBe(b.privateKey)
    })

    it('should derive different addresses for different indices', () => {
      const a = deriveEvmAccount(TEST_MNEMONIC, 0)
      const b = deriveEvmAccount(TEST_MNEMONIC, 1)

      expect(a.address).not.toBe(b.address)
      expect(a.privateKey).not.toBe(b.privateKey)
    })

    it('should produce a known address for the standard test mnemonic at index 0', () => {
      const account = deriveEvmAccount(TEST_MNEMONIC, 0)

      // Known address for "abandon x11 about" at m/44'/60'/0'/0/0
      expect(account.address.toLowerCase()).toBe('0x9858effd232b4033e47d90003d41ec34ecaeda94')
    })
  })

  describe('deriveEvmAccounts', () => {
    it('should derive the requested number of accounts', () => {
      const accounts = deriveEvmAccounts(TEST_MNEMONIC, 3)

      expect(accounts).toHaveLength(3)
    })

    it('should assign sequential indices starting from 0', () => {
      const accounts = deriveEvmAccounts(TEST_MNEMONIC, 4)

      expect(accounts[0].index).toBe(0)
      expect(accounts[1].index).toBe(1)
      expect(accounts[2].index).toBe(2)
      expect(accounts[3].index).toBe(3)
    })

    it('should produce unique addresses for each account', () => {
      const accounts = deriveEvmAccounts(TEST_MNEMONIC, 5)
      const addresses = accounts.map((a) => a.address)

      expect(new Set(addresses).size).toBe(5)
    })

    it('should derive accounts matching individual deriveEvmAccount calls', () => {
      const accounts = deriveEvmAccounts(TEST_MNEMONIC, 3)

      for (let i = 0; i < 3; i++) {
        const single = deriveEvmAccount(TEST_MNEMONIC, i)
        expect(accounts[i].address).toBe(single.address)
        expect(accounts[i].derivationPath).toBe(single.derivationPath)
      }
    })

    it('should return an empty array when count is 0', () => {
      const accounts = deriveEvmAccounts(TEST_MNEMONIC, 0)

      expect(accounts).toHaveLength(0)
    })

    it('should return a single account when count is 1', () => {
      const accounts = deriveEvmAccounts(TEST_MNEMONIC, 1)

      expect(accounts).toHaveLength(1)
      expect(accounts[0].index).toBe(0)
    })
  })

  describe('evmDerivedToVaultAccount', () => {
    it('should map address, publicKey, and privateKey', () => {
      const derived = deriveEvmAccount(TEST_MNEMONIC, 0)
      const vault = evmDerivedToVaultAccount(derived)

      expect(vault.address).toBe(derived.address)
      expect(vault.publicKey).toBe(derived.publicKey)
      expect(vault.privateKey).toBe(derived.privateKey)
    })

    it('should set type to "hd"', () => {
      const derived = deriveEvmAccount(TEST_MNEMONIC, 0)
      const vault = evmDerivedToVaultAccount(derived)

      expect(vault.type).toBe('hd')
    })

    it('should set chainType to "evm"', () => {
      const derived = deriveEvmAccount(TEST_MNEMONIC, 0)
      const vault = evmDerivedToVaultAccount(derived)

      expect(vault.chainType).toBe('evm')
    })

    it('should preserve the derivation path and index', () => {
      const derived = deriveEvmAccount(TEST_MNEMONIC, 2)
      const vault = evmDerivedToVaultAccount(derived)

      expect(vault.derivationPath).toBe(derived.derivationPath)
      expect(vault.index).toBe(2)
    })
  })
})
