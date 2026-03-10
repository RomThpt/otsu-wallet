import { describe, it, expect, beforeEach } from 'vitest'
import { EvmKeyring } from './evm-keyring'
import { deriveEvmAccount, evmDerivedToVaultAccount } from './evm-deriver'
import type { VaultAccount } from '@otsu/types'

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

function makeAccount(index: number): VaultAccount {
  return evmDerivedToVaultAccount(deriveEvmAccount(TEST_MNEMONIC, index))
}

describe('EvmKeyring', () => {
  let keyring: EvmKeyring
  let account0: VaultAccount
  let account1: VaultAccount

  beforeEach(() => {
    keyring = new EvmKeyring()
    account0 = makeAccount(0)
    account1 = makeAccount(1)
  })

  describe('load', () => {
    it('should load accounts and make them discoverable', () => {
      keyring.load([account0, account1])

      expect(keyring.hasAccount(account0.address)).toBe(true)
      expect(keyring.hasAccount(account1.address)).toBe(true)
    })

    it('should replace any previously loaded accounts', () => {
      keyring.load([account0])
      keyring.load([account1])

      expect(keyring.hasAccount(account0.address)).toBe(false)
      expect(keyring.hasAccount(account1.address)).toBe(true)
    })

    it('should expose addresses in lowercase', () => {
      keyring.load([account0])

      const addresses = keyring.getAddresses()
      addresses.forEach((addr) => {
        expect(addr).toBe(addr.toLowerCase())
      })
    })

    it('should load an empty array without error', () => {
      expect(() => keyring.load([])).not.toThrow()
      expect(keyring.getAddresses()).toHaveLength(0)
    })
  })

  describe('addAccount', () => {
    it('should add a single account', () => {
      keyring.addAccount(account0)

      expect(keyring.hasAccount(account0.address)).toBe(true)
    })

    it('should add multiple accounts one by one', () => {
      keyring.addAccount(account0)
      keyring.addAccount(account1)

      expect(keyring.getAddresses()).toHaveLength(2)
    })

    it('should overwrite an existing account with the same address', () => {
      keyring.addAccount(account0)
      const modified = { ...account0, publicKey: 'overwritten' }
      keyring.addAccount(modified)

      expect(keyring.getAddresses()).toHaveLength(1)
    })
  })

  describe('removeAccount', () => {
    it('should remove an existing account', () => {
      keyring.load([account0, account1])
      keyring.removeAccount(account0.address)

      expect(keyring.hasAccount(account0.address)).toBe(false)
      expect(keyring.hasAccount(account1.address)).toBe(true)
    })

    it('should not throw when removing a non-existent address', () => {
      expect(() =>
        keyring.removeAccount('0x0000000000000000000000000000000000000000'),
      ).not.toThrow()
    })

    it('should be case-insensitive when removing', () => {
      keyring.load([account0])
      keyring.removeAccount(account0.address.toUpperCase())

      expect(keyring.hasAccount(account0.address)).toBe(false)
    })
  })

  describe('getAddresses', () => {
    it('should return an empty array when no accounts are loaded', () => {
      expect(keyring.getAddresses()).toEqual([])
    })

    it('should return all loaded addresses in lowercase', () => {
      keyring.load([account0, account1])

      const addresses = keyring.getAddresses()
      expect(addresses).toHaveLength(2)
      expect(addresses).toContain(account0.address.toLowerCase())
      expect(addresses).toContain(account1.address.toLowerCase())
    })
  })

  describe('hasAccount', () => {
    it('should return false for unknown addresses', () => {
      expect(keyring.hasAccount('0x0000000000000000000000000000000000000000')).toBe(false)
    })

    it('should return true for a loaded address', () => {
      keyring.load([account0])

      expect(keyring.hasAccount(account0.address)).toBe(true)
    })

    it('should be case-insensitive', () => {
      keyring.load([account0])

      expect(keyring.hasAccount(account0.address.toUpperCase())).toBe(true)
      expect(keyring.hasAccount(account0.address.toLowerCase())).toBe(true)
    })
  })

  describe('clear', () => {
    it('should remove all accounts', () => {
      keyring.load([account0, account1])
      keyring.clear()

      expect(keyring.getAddresses()).toEqual([])
      expect(keyring.hasAccount(account0.address)).toBe(false)
      expect(keyring.hasAccount(account1.address)).toBe(false)
    })

    it('should not throw when called on an empty keyring', () => {
      expect(() => keyring.clear()).not.toThrow()
    })
  })

  describe('signMessage', () => {
    it('should return a hex signature string', async () => {
      keyring.load([account0])

      const sig = await keyring.signMessage(account0.address, 'hello world')

      expect(sig).toMatch(/^0x[0-9a-fA-F]+$/)
    })

    it('should produce a deterministic signature for the same message', async () => {
      keyring.load([account0])

      const sig1 = await keyring.signMessage(account0.address, 'test message')
      const sig2 = await keyring.signMessage(account0.address, 'test message')

      expect(sig1).toBe(sig2)
    })

    it('should produce different signatures for different messages', async () => {
      keyring.load([account0])

      const sig1 = await keyring.signMessage(account0.address, 'message one')
      const sig2 = await keyring.signMessage(account0.address, 'message two')

      expect(sig1).not.toBe(sig2)
    })

    it('should produce different signatures for different accounts', async () => {
      keyring.load([account0, account1])

      const sig0 = await keyring.signMessage(account0.address, 'same message')
      const sig1 = await keyring.signMessage(account1.address, 'same message')

      expect(sig0).not.toBe(sig1)
    })

    it('should throw when the address is not loaded', async () => {
      await expect(
        keyring.signMessage('0x0000000000000000000000000000000000000000', 'msg'),
      ).rejects.toThrow()
    })

    it('should accept a Uint8Array as the message', async () => {
      keyring.load([account0])
      const bytes = new TextEncoder().encode('binary message')

      const sig = await keyring.signMessage(account0.address, bytes)

      expect(sig).toMatch(/^0x[0-9a-fA-F]+$/)
    })
  })
})
