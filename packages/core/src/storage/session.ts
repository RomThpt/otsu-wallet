import { AUTO_LOCK_DEFAULT_MINUTES } from '@otsu/constants'

export class SessionManager {
  private sessionKey: CryptoKey | null = null
  private unlockedAt = 0
  private autoLockMinutes = AUTO_LOCK_DEFAULT_MINUTES

  get isUnlocked(): boolean {
    if (!this.sessionKey) return false
    if (this.isExpired()) {
      this.lock()
      return false
    }
    return true
  }

  getSessionKey(): CryptoKey | null {
    if (!this.isUnlocked) return null
    return this.sessionKey
  }

  unlock(key: CryptoKey): void {
    this.sessionKey = key
    this.unlockedAt = Date.now()
  }

  lock(): void {
    this.sessionKey = null
    this.unlockedAt = 0
  }

  setAutoLockMinutes(minutes: number): void {
    this.autoLockMinutes = minutes
  }

  getAutoLockMinutes(): number {
    return this.autoLockMinutes
  }

  private isExpired(): boolean {
    if (this.unlockedAt === 0) return true
    const elapsed = Date.now() - this.unlockedAt
    return elapsed > this.autoLockMinutes * 60 * 1000
  }
}
