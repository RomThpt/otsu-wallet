import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  buildAuthorizationUrl,
  exchangeCode,
  refreshTokens,
  getProfile,
  linkWallet,
  unlinkWallet,
} from './identity-client'

describe('Identity client', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('buildAuthorizationUrl', () => {
    it('constructs a valid authorization URL', () => {
      const url = buildAuthorizationUrl(
        'https://ext.example/callback',
        'random-state',
        'code-challenge-123',
      )

      expect(url).toContain('/auth?')
      expect(url).toContain('response_type=code')
      expect(url).toContain('redirect_uri=https%3A%2F%2Fext.example%2Fcallback')
      expect(url).toContain('state=random-state')
      expect(url).toContain('code_challenge=code-challenge-123')
      expect(url).toContain('code_challenge_method=S256')
      expect(url).toContain('scope=')
    })
  })

  describe('exchangeCode', () => {
    it('exchanges code for tokens', async () => {
      const tokenResponse = {
        access_token: 'access-123',
        refresh_token: 'refresh-456',
        token_type: 'Bearer',
        expires_in: 3600,
      }

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(tokenResponse),
      })

      const result = await exchangeCode('auth-code', 'https://ext/callback', 'verifier')
      expect(result.access_token).toBe('access-123')
      expect(result.refresh_token).toBe('refresh-456')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/token'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      )
    })

    it('throws on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('invalid_grant'),
      })

      await expect(exchangeCode('bad-code', 'https://ext/callback', 'verifier')).rejects.toThrow(
        'Token exchange failed',
      )
    })
  })

  describe('refreshTokens', () => {
    it('refreshes tokens', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access',
            token_type: 'Bearer',
            expires_in: 3600,
          }),
      })

      const result = await refreshTokens('old-refresh')
      expect(result.access_token).toBe('new-access')
    })

    it('throws on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('invalid_token'),
      })

      await expect(refreshTokens('bad-token')).rejects.toThrow('Token refresh failed')
    })
  })

  describe('getProfile', () => {
    it('fetches and maps profile data', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            identity: {
              _id: 'user-123',
              email: 'test@example.com',
              email_verified: true,
              roles: ['user'],
            },
            profile: {
              username: 'testuser',
              firstname: 'Test',
              lastname: 'User',
              picture: 'https://example.com/avatar.png',
              xrplWallet: {
                address: 'rXRPLAddress',
                walletType: 'otsu',
              },
            },
          }),
      })

      const profile = await getProfile('access-token')
      expect(profile.sub).toBe('user-123')
      expect(profile.email).toBe('test@example.com')
      expect(profile.emailVerified).toBe(true)
      expect(profile.preferredUsername).toBe('testuser')
      expect(profile.name).toBe('Test User')
      expect(profile.xrplAddress).toBe('rXRPLAddress')
      expect(profile.xrplWalletType).toBe('otsu')
    })

    it('handles profile without xrpl wallet', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            identity: {
              _id: 'user-456',
              email: 'no-wallet@example.com',
            },
            profile: {},
          }),
      })

      const profile = await getProfile('access-token')
      expect(profile.sub).toBe('user-456')
      expect(profile.xrplAddress).toBeUndefined()
    })

    it('throws on error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      await expect(getProfile('bad-token')).rejects.toThrow('Failed to get profile')
    })
  })

  describe('linkWallet', () => {
    it('sends PATCH request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

      await linkWallet('access-token', 'rAddress123')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/profile/xrpl'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ address: 'rAddress123', walletType: 'otsu' }),
        }),
      )
    })

    it('throws on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        text: () => Promise.resolve('Already linked'),
      })

      await expect(linkWallet('token', 'rAddr')).rejects.toThrow('Failed to link wallet')
    })
  })

  describe('unlinkWallet', () => {
    it('sends DELETE request', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true })

      await unlinkWallet('access-token')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/profile/xrpl'),
        expect.objectContaining({ method: 'DELETE' }),
      )
    })

    it('throws on failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve('No wallet linked'),
      })

      await expect(unlinkWallet('token')).rejects.toThrow('Failed to unlink wallet')
    })
  })
})
