import { describe, it, expect } from 'vitest'
import { SessionManager } from './session'

describe('SessionManager', () => {
  it('should start locked', () => {
    const session = new SessionManager()
    expect(session.isUnlocked).toBe(false)
    expect(session.getSessionKey()).toBeNull()
  })

  it('should unlock with a key', async () => {
    const session = new SessionManager()
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])

    session.unlock(key)
    expect(session.isUnlocked).toBe(true)
    expect(session.getSessionKey()).toBe(key)
  })

  it('should lock', async () => {
    const session = new SessionManager()
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])

    session.unlock(key)
    session.lock()
    expect(session.isUnlocked).toBe(false)
    expect(session.getSessionKey()).toBeNull()
  })

  it('should auto-lock after expiry', async () => {
    const session = new SessionManager()
    session.setAutoLockMinutes(0) // Expire immediately

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ])

    session.unlock(key)

    // Wait a tick for expiry
    await new Promise((r) => setTimeout(r, 10))

    expect(session.isUnlocked).toBe(false)
  })
})
