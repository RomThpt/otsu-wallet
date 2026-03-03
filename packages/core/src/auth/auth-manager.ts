import type { AuthMethod, VaultData } from '@otsu/types'
import { OtsuError, ErrorCodes } from '@otsu/constants'
import { setupPassword, unlockWithPassword, vaultExists, destroyVault } from './auth-password'
import { registerPasskey, authenticatePasskey, hasPasskey } from './auth-passkey'
import { SessionManager } from '../storage/session'

export class AuthManager {
  private session = new SessionManager()
  private cachedVaultData: VaultData | null = null
  private failedAttempts = 0
  private lockedUntil = 0
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

  async setup(vaultData: VaultData, method: AuthMethod, password?: string): Promise<void> {
    if (method === 'password') {
      if (!password) {
        throw new OtsuError(ErrorCodes.INVALID_PASSWORD, 'Password is required')
      }
      await setupPassword(vaultData, password)
    } else {
      await registerPasskey(vaultData)
    }

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
    this.session.unlock(key)
    this.cachedVaultData = vaultData
  }

  async unlock(method: AuthMethod, password?: string): Promise<VaultData> {
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
        data = await authenticatePasskey()
      }

      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ])
      this.session.unlock(key)
      this.cachedVaultData = data
      this.failedAttempts = 0
      this.lockedUntil = 0

      return data
    } catch (err) {
      this.failedAttempts++
      if (this.failedAttempts >= AuthManager.MAX_ATTEMPTS) {
        this.lockedUntil =
          Date.now() +
          AuthManager.BASE_LOCKOUT_MS * Math.pow(2, this.failedAttempts - AuthManager.MAX_ATTEMPTS)
      }
      throw err
    }
  }

  async unlockWithData(data: VaultData): Promise<void> {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])
    this.session.unlock(key)
    this.cachedVaultData = data
    this.failedAttempts = 0
    this.lockedUntil = 0
  }

  lock(): void {
    this.session.lock()
    this.cachedVaultData = null
  }

  async reset(): Promise<void> {
    this.lock()
    this.failedAttempts = 0
    this.lockedUntil = 0
    await destroyVault()
  }

  getVaultData(): VaultData | null {
    if (!this.session.isUnlocked) return null
    return this.cachedVaultData
  }

  setAutoLockMinutes(minutes: number): void {
    this.session.setAutoLockMinutes(minutes)
  }
}
