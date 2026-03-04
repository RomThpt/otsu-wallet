import type { AuthMethod, VaultData } from '@otsu/types'
import { OtsuError, ErrorCodes } from '@otsu/constants'
import { setupPassword, unlockWithPassword, vaultExists } from './auth-password'
import { registerPasskey, authenticatePasskey, hasPasskey } from './auth-passkey'
import { SessionManager } from '../storage/session'

export class AuthManager {
  private session = new SessionManager()
  private cachedVaultData: VaultData | null = null

  get isUnlocked(): boolean {
    return this.session.isUnlocked
  }

  async hasWallet(): Promise<boolean> {
    return (await vaultExists()) || hasPasskey()
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

    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    this.session.unlock(key)
    this.cachedVaultData = vaultData
  }

  async unlock(method: AuthMethod, password?: string): Promise<VaultData> {
    let data: VaultData

    if (method === 'password') {
      if (!password) {
        throw new OtsuError(ErrorCodes.INVALID_PASSWORD, 'Password is required')
      }
      data = await unlockWithPassword(password)
    } else {
      data = await authenticatePasskey()
    }

    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    this.session.unlock(key)
    this.cachedVaultData = data

    return data
  }

  lock(): void {
    this.session.lock()
    this.cachedVaultData = null
  }

  getVaultData(): VaultData | null {
    if (!this.session.isUnlocked) return null
    return this.cachedVaultData
  }

  setAutoLockMinutes(minutes: number): void {
    this.session.setAutoLockMinutes(minutes)
  }
}
