import { describe, it, expect } from 'vitest'
import { deriveAccount, deriveAccounts, derivedToVaultAccount } from './hd-deriver'
import { generateNewMnemonic } from './mnemonic'

describe('hd-deriver', () => {
  const testMnemonic = generateNewMnemonic()

  it('should derive an account from mnemonic', () => {
    const account = deriveAccount(testMnemonic, 0)

    expect(account.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    expect(account.publicKey).toBeTruthy()
    expect(account.privateKey).toBeTruthy()
    expect(account.derivationPath).toBe("m/44'/144'/0'/0/0")
    expect(account.index).toBe(0)
  })

  it('should derive deterministic addresses from same mnemonic', () => {
    const a = deriveAccount(testMnemonic, 0)
    const b = deriveAccount(testMnemonic, 0)

    expect(a.address).toBe(b.address)
    expect(a.publicKey).toBe(b.publicKey)
  })

  it('should derive different addresses for different indices', () => {
    const a = deriveAccount(testMnemonic, 0)
    const b = deriveAccount(testMnemonic, 1)

    expect(a.address).not.toBe(b.address)
  })

  it('should derive multiple accounts', () => {
    const accounts = deriveAccounts(testMnemonic, 3)

    expect(accounts).toHaveLength(3)
    expect(accounts[0].index).toBe(0)
    expect(accounts[1].index).toBe(1)
    expect(accounts[2].index).toBe(2)

    const addresses = accounts.map((a) => a.address)
    expect(new Set(addresses).size).toBe(3)
  })

  it('should convert derived account to vault account', () => {
    const derived = deriveAccount(testMnemonic, 0)
    const vault = derivedToVaultAccount(derived)

    expect(vault.address).toBe(derived.address)
    expect(vault.publicKey).toBe(derived.publicKey)
    expect(vault.privateKey).toBe(derived.privateKey)
    expect(vault.type).toBe('hd')
    expect(vault.index).toBe(0)
  })
})
