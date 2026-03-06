import type { AuthMethod, VaultData } from '@otsu/types'
import { OtsuError, ErrorCodes } from '@otsu/constants'
import { setupPassword, unlockWithPassword, vaultExists, destroyVault } from './auth-password'
import { storePasskeyVault, decryptPasskeyVault, hasPasskey } from './auth-passkey'
import { SessionManager } from '../storage/session'

const LOCKOUT_STORAGE_KEY = 'otsu-lockout'

export class AuthManager {
  private session = new SessionManager()
  private cachedVaultData: VaultData | null = null
  private failedAttempts = 0
  private lockedUntil = 0
  private lockoutLoaded = false
  private static readonly MAX_ATTEMPTS = 5
  private static readonly BASE_LOCKOUT_MS = 30_000

  get isUnlocked(): boolean {
    return this.session.isUnlocked
  }

  get isLockedOut(): boolean {
    return Date.now() < this.lockedUntil
  }

  get remainingLockoutMs(): number {
    return Math.max(0, this.lockedUntil - Date.now())
  }

  async hasWallet(): Promise<boolean> {
    return (await vaultExists()) || (await hasPasskey())
  }

  async setup(
    vaultData: VaultData,
    method: AuthMethod,
    password?: string,
    passkeyCredential?: { credentialId: string; prfKey: string },
  ): Promise<void> {
    if (method === 'password') {
      if (!password) {
        throw new OtsuError(ErrorCodes.INVALID_PASSWORD, 'Password is required')
      }
      await setupPassword(vaultData, password)
    } else {
      if (!passkeyCredential) {
        throw new OtsuError(
          ErrorCodes.PASSKEY_REGISTRATION_FAILED,
          'Passkey credential required for passkey setup',
        )
      }
      await storePasskeyVault(vaultData, passkeyCredential.credentialId, passkeyCredential.prfKey)
    }

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
    this.session.unlock(key)
    this.cachedVaultData = vaultData
  }

  async unlock(method: AuthMethod, password?: string, passkeyKey?: string): Promise<VaultData> {
    await this.loadLockout()

    if (this.isLockedOut) {
      throw new OtsuError(
        ErrorCodes.RATE_LIMITED,
        `Too many failed attempts. Try again in ${Math.ceil(this.remainingLockoutMs / 1000)} seconds`,
      )
    }

    let data: VaultData

    try {
      if (method === 'password') {
        if (!password) {
          throw new OtsuError(ErrorCodes.INVALID_PASSWORD, 'Password is required')
        }
        data = await unlockWithPassword(password)
      } else {
        if (!passkeyKey) {
          throw new OtsuError(ErrorCodes.PASSKEY_NOT_SUPPORTED, 'Passkey decryption key required')
        }
        data = await decryptPasskeyVault(passkeyKey)
      }

      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ])
      this.session.unlock(key)
      this.cachedVaultData = data
      this.failedAttempts = 0
      this.lockedUntil = 0
      await this.persistLockout()

      return data
    } catch (err) {
      this.failedAttempts++
      if (this.failedAttempts >= AuthManager.MAX_ATTEMPTS) {
        this.lockedUntil =
          Date.now() +
          AuthManager.BASE_LOCKOUT_MS * Math.pow(2, this.failedAttempts - AuthManager.MAX_ATTEMPTS)
      }
      await this.persistLockout()
      throw err
    }
  }

  lock(): void {
    this.session.lock()
    this.cachedVaultData = null
  }

  async reset(): Promise<void> {
    this.lock()
    this.failedAttempts = 0
    this.lockedUntil = 0
    await this.persistLockout()
    await destroyVault()
  }

  getVaultData(): VaultData | null {
    if (!this.session.isUnlocked) return null
    return this.cachedVaultData
  }

  setAutoLockMinutes(minutes: number): void {
    this.session.setAutoLockMinutes(minutes)
  }

  private async persistLockout(): Promise<void> {
    try {
      await chrome.storage.session.set({
        [LOCKOUT_STORAGE_KEY]: {
          failedAttempts: this.failedAttempts,
          lockedUntil: this.lockedUntil,
        },
      })
    } catch {
      // chrome.storage.session may not be available in tests
    }
  }

  private async loadLockout(): Promise<void> {
    if (this.lockoutLoaded) return
    try {
      const result = await chrome.storage.session.get(LOCKOUT_STORAGE_KEY)
      const stored = result[LOCKOUT_STORAGE_KEY] as
        | { failedAttempts: number; lockedUntil: number }
        | undefined
      if (stored) {
        this.failedAttempts = stored.failedAttempts
        this.lockedUntil = stored.lockedUntil
      }
    } catch {
      // chrome.storage.session may not be available in tests
    }
    this.lockoutLoaded = true
  }
}
