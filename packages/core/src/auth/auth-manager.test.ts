import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { VaultData } from '@otsu/types'
import { ErrorCodes } from '@otsu/constants'

vi.mock('./auth-password', () => ({
  setupPassword: vi.fn(),
  unlockWithPassword: vi.fn(),
  updatePasswordVault: vi.fn(),
  vaultExists: vi.fn().mockResolvedValue(true),
  destroyVault: vi.fn(),
}))

vi.mock('./auth-passkey', () => ({
  storePasskeyVault: vi.fn(),
  decryptPasskeyVaultWithMetadata: vi.fn(),
  hasPasskey: vi.fn().mockResolvedValue(false),
  destroyPasskeyVault: vi.fn(),
}))

vi.mock('../storage/session', () => ({
  SessionManager: vi.fn().mockImplementation(() => {
    const session = {
      isUnlocked: false,
      unlock: vi.fn(() => {
        session.isUnlocked = true
      }),
      lock: vi.fn(() => {
        session.isUnlocked = false
      }),
      setAutoLockMinutes: vi.fn(),
    }
    return session
  }),
}))

import { destroyVault, unlockWithPassword } from './auth-password'
import {
  decryptPasskeyVaultWithMetadata,
  destroyPasskeyVault,
  storePasskeyVault,
} from './auth-passkey'
import { AuthManager } from './auth-manager'

const mockVaultData: VaultData = {
  mnemonic:
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  accounts: [
    {
      address: 'rTestAddress',
      publicKey: 'ED0000000000000000000000000000000000000000000000000000000000000001',
      privateKey: '0000000000000000000000000000000000000000000000000000000000000001',
      type: 'hd',
    },
  ],
}

describe('AuthManager', () => {
  let auth: AuthManager

  beforeEach(() => {
    vi.mocked(unlockWithPassword).mockReset()
    vi.mocked(decryptPasskeyVaultWithMetadata).mockReset()
    vi.mocked(storePasskeyVault).mockReset()
    vi.mocked(destroyVault).mockReset()
    vi.mocked(destroyPasskeyVault).mockReset()
    auth = new AuthManager()
  })

  it('preserves passkey credential metadata when updating after a fresh unlock', async () => {
    vi.mocked(decryptPasskeyVaultWithMetadata).mockResolvedValue({
      vaultData: mockVaultData,
      credentialId: 'credential-123',
    })

    await auth.unlock('passkey', undefined, 'prf-key')
    const updated = { ...mockVaultData, schemaVersion: 2 as const }
    await auth.updateVaultData(updated)

    expect(storePasskeyVault).toHaveBeenCalledWith(updated, 'credential-123', 'prf-key')
  })

  it('removes both password and passkey vaults on reset', async () => {
    await auth.reset()

    expect(destroyVault).toHaveBeenCalledOnce()
    expect(destroyPasskeyVault).toHaveBeenCalledOnce()
  })

  it('unlock succeeds with valid password', async () => {
    vi.mocked(unlockWithPassword).mockResolvedValue(mockVaultData)

    const result = await auth.unlock('password', 'correct-password')

    expect(result).toEqual(mockVaultData)
    expect(auth.isLockedOut).toBe(false)
    expect(auth.remainingLockoutMs).toBe(0)
  })

  it('increments failed attempts on bad password', async () => {
    vi.mocked(unlockWithPassword).mockRejectedValue(new Error('Invalid password'))

    await expect(auth.unlock('password', 'wrong-password')).rejects.toThrow('Invalid password')
  })

  it('locks out after 5 failures', async () => {
    vi.mocked(unlockWithPassword).mockRejectedValue(new Error('Invalid password'))

    for (let i = 0; i < 5; i++) {
      await expect(auth.unlock('password', 'wrong')).rejects.toThrow()
    }

    await expect(auth.unlock('password', 'wrong')).rejects.toMatchObject({
      code: ErrorCodes.RATE_LIMITED,
    })
    expect(auth.isLockedOut).toBe(true)
  })

  it('progressive lockout increases after more failures', async () => {
    vi.mocked(unlockWithPassword).mockRejectedValue(new Error('Invalid password'))

    for (let i = 0; i < 5; i++) {
      await expect(auth.unlock('password', 'wrong')).rejects.toThrow()
    }

    const firstLockout = auth.remainingLockoutMs

    // Manually advance time by draining the first lockout
    // then cause another failure to trigger a longer lockout
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + firstLockout + 1)
    await expect(auth.unlock('password', 'wrong')).rejects.toThrow('Invalid password')
    nowSpy.mockRestore()

    const secondLockout = auth.remainingLockoutMs
    expect(secondLockout).toBeGreaterThan(firstLockout)
  })

  it('resets after successful unlock', async () => {
    vi.mocked(unlockWithPassword).mockRejectedValue(new Error('Invalid password'))

    for (let i = 0; i < 4; i++) {
      await expect(auth.unlock('password', 'wrong')).rejects.toThrow()
    }

    vi.mocked(unlockWithPassword).mockResolvedValue(mockVaultData)
    await auth.unlock('password', 'correct-password')

    vi.mocked(unlockWithPassword).mockRejectedValue(new Error('Invalid password'))
    await expect(auth.unlock('password', 'wrong')).rejects.toThrow('Invalid password')

    expect(auth.isLockedOut).toBe(false)
  })

  it('isLockedOut getter returns true during lockout', async () => {
    vi.mocked(unlockWithPassword).mockRejectedValue(new Error('Invalid password'))

    expect(auth.isLockedOut).toBe(false)

    for (let i = 0; i < 5; i++) {
      await expect(auth.unlock('password', 'wrong')).rejects.toThrow()
    }

    expect(auth.isLockedOut).toBe(true)
    expect(auth.remainingLockoutMs).toBeGreaterThan(0)
  })
})
