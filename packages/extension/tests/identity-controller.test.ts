import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted ensures these are available when vi.mock factories run (hoisted to top)
const {
  browserMock,
  resetStorage,
  mockBuildAuthorizationUrl,
  mockExchangeCode,
  mockRefreshTokens,
  mockGetProfile,
  mockLinkWallet,
  mockUnlinkWallet,
  mockGenerateCodeVerifier,
  mockDeriveCodeChallenge,
} = vi.hoisted(() => {
  const localStorage: Record<string, unknown> = {}
  const sessionStorage: Record<string, unknown> = {}

  const browserMock = {
    storage: {
      local: {
        get: vi.fn(async (keys: string | string[]) => {
          const keyArr = typeof keys === 'string' ? [keys] : keys
          const result: Record<string, unknown> = {}
          for (const key of keyArr) {
            if (localStorage[key] !== undefined) {
              result[key] = localStorage[key]
            }
          }
          return result
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(localStorage, items)
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const arr = typeof keys === 'string' ? [keys] : keys
          for (const key of arr) {
            delete localStorage[key]
          }
        }),
      },
      session: {
        get: vi.fn(async (keys: string | string[]) => {
          const keyArr = typeof keys === 'string' ? [keys] : keys
          const result: Record<string, unknown> = {}
          for (const key of keyArr) {
            if (sessionStorage[key] !== undefined) {
              result[key] = sessionStorage[key]
            }
          }
          return result
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(sessionStorage, items)
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          const arr = typeof keys === 'string' ? [keys] : keys
          for (const key of arr) {
            delete sessionStorage[key]
          }
        }),
      },
    },
    runtime: {
      getURL: vi.fn((path: string) => `chrome-extension://ext-id/${path}`),
    },
  }

  function resetStorage() {
    for (const key of Object.keys(localStorage)) delete localStorage[key]
    for (const key of Object.keys(sessionStorage)) delete sessionStorage[key]
  }

  return {
    browserMock,
    resetStorage,
    mockBuildAuthorizationUrl: vi.fn().mockReturnValue('https://identity.example.com/auth?test=1'),
    mockExchangeCode: vi.fn().mockResolvedValue({
      access_token: 'access-123',
      refresh_token: 'refresh-456',
      token_type: 'Bearer',
      expires_in: 3600,
    }),
    mockRefreshTokens: vi.fn().mockResolvedValue({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
      token_type: 'Bearer',
      expires_in: 3600,
    }),
    mockGetProfile: vi.fn().mockResolvedValue({
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      xrplAddress: undefined,
    }),
    mockLinkWallet: vi.fn(),
    mockUnlinkWallet: vi.fn(),
    mockGenerateCodeVerifier: vi.fn().mockReturnValue('test-verifier'),
    mockDeriveCodeChallenge: vi.fn().mockResolvedValue('test-challenge'),
  }
})

vi.mock('webextension-polyfill', () => ({
  default: browserMock,
}))

vi.mock('@otsu/core', () => ({
  buildAuthorizationUrl: mockBuildAuthorizationUrl,
  exchangeCode: mockExchangeCode,
  refreshTokens: mockRefreshTokens,
  getProfile: mockGetProfile,
  linkWallet: mockLinkWallet,
  unlinkWallet: mockUnlinkWallet,
  generateCodeVerifier: mockGenerateCodeVerifier,
  deriveCodeChallenge: mockDeriveCodeChallenge,
}))

import { IdentityController } from '../src/background/controllers/identity'

describe('IdentityController', () => {
  let controller: IdentityController

  beforeEach(() => {
    resetStorage()
    vi.clearAllMocks()
    controller = new IdentityController()
  })

  describe('initialize', () => {
    it('restores tokens and profile from storage', async () => {
      await browserMock.storage.local.set({
        'otsu-identity': {
          accessToken: 'stored-access',
          refreshToken: 'stored-refresh',
          expiresAt: Date.now() + 3600_000,
        },
        'otsu-identity-profile': {
          profile: { sub: 'user-1', name: 'Stored User' },
          fetchedAt: Date.now(),
        },
      })

      await controller.initialize()
      const state = controller.getState()

      expect(state.loggedIn).toBe(true)
      expect(state.profile?.name).toBe('Stored User')
    })

    it('starts as logged out when no stored data', async () => {
      await controller.initialize()
      const state = controller.getState()

      expect(state.loggedIn).toBe(false)
      expect(state.profile).toBeNull()
    })

    it('is idempotent', async () => {
      await controller.initialize()
      await controller.initialize()

      // local.get called only once (first init)
      expect(browserMock.storage.local.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('startLogin', () => {
    it('returns authorization URL', async () => {
      await controller.initialize()
      const url = await controller.startLogin()

      expect(url).toContain('https://identity.example.com/auth')
      expect(mockGenerateCodeVerifier).toHaveBeenCalled()
      expect(mockDeriveCodeChallenge).toHaveBeenCalled()
    })

    it('stores PKCE data in session storage', async () => {
      await controller.initialize()
      await controller.startLogin()

      expect(browserMock.storage.session.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'otsu-identity-pkce': expect.objectContaining({
            verifier: 'test-verifier',
          }),
        }),
      )
    })
  })

  describe('handleCallback', () => {
    it('exchanges code and stores tokens + profile', async () => {
      await controller.initialize()

      // Set up PKCE data
      await browserMock.storage.session.set({
        'otsu-identity-pkce': { verifier: 'test-verifier', state: 'test-state' },
      })

      await controller.handleCallback('auth-code', 'test-state')

      expect(mockExchangeCode).toHaveBeenCalledWith(
        'auth-code',
        'chrome-extension://ext-id/identity-callback.html',
        'test-verifier',
      )
      expect(mockGetProfile).toHaveBeenCalledWith('access-123')

      const state = controller.getState()
      expect(state.loggedIn).toBe(true)
      expect(state.profile?.sub).toBe('user-123')
    })

    it('rejects invalid state', async () => {
      await controller.initialize()

      await browserMock.storage.session.set({
        'otsu-identity-pkce': { verifier: 'test-verifier', state: 'correct-state' },
      })

      await expect(controller.handleCallback('code', 'wrong-state')).rejects.toThrow(
        'Invalid state parameter',
      )
    })

    it('rejects when no PKCE data', async () => {
      await controller.initialize()

      await expect(controller.handleCallback('code', 'state')).rejects.toThrow(
        'No pending login found',
      )
    })
  })

  describe('logout', () => {
    it('clears all identity data', async () => {
      await controller.initialize()

      // Simulate logged-in state
      await browserMock.storage.session.set({
        'otsu-identity-pkce': { verifier: 'v', state: 's' },
      })
      await controller.handleCallback('code', 's')

      expect(controller.getState().loggedIn).toBe(true)

      await controller.logout()

      expect(controller.getState().loggedIn).toBe(false)
      expect(controller.getState().profile).toBeNull()
      expect(browserMock.storage.local.remove).toHaveBeenCalledWith([
        'otsu-identity',
        'otsu-identity-profile',
      ])
    })
  })

  describe('getState', () => {
    it('returns linkedAddress from profile', async () => {
      await controller.initialize()

      mockGetProfile.mockResolvedValueOnce({
        sub: 'user-1',
        name: 'Test',
        xrplAddress: 'rLinkedAddr',
      })

      await browserMock.storage.session.set({
        'otsu-identity-pkce': { verifier: 'v', state: 's' },
      })
      await controller.handleCallback('code', 's')

      const state = controller.getState()
      expect(state.linkedAddress).toBe('rLinkedAddr')
    })
  })

  describe('linkWallet', () => {
    it('calls API and refreshes profile', async () => {
      await controller.initialize()

      await browserMock.storage.session.set({
        'otsu-identity-pkce': { verifier: 'v', state: 's' },
      })
      await controller.handleCallback('code', 's')

      mockGetProfile.mockResolvedValueOnce({
        sub: 'user-1',
        xrplAddress: 'rNewAddr',
      })

      await controller.linkWallet('rNewAddr')

      expect(mockLinkWallet).toHaveBeenCalledWith('access-123', 'rNewAddr')
      expect(controller.getState().linkedAddress).toBe('rNewAddr')
    })

    it('throws when not logged in', async () => {
      await controller.initialize()
      await expect(controller.linkWallet('rAddr')).rejects.toThrow('Not logged in')
    })
  })

  describe('unlinkWallet', () => {
    it('calls API and refreshes profile', async () => {
      await controller.initialize()

      await browserMock.storage.session.set({
        'otsu-identity-pkce': { verifier: 'v', state: 's' },
      })
      await controller.handleCallback('code', 's')

      mockGetProfile.mockResolvedValueOnce({
        sub: 'user-1',
        xrplAddress: undefined,
      })

      await controller.unlinkWallet()

      expect(mockUnlinkWallet).toHaveBeenCalledWith('access-123')
      expect(controller.getState().linkedAddress).toBeNull()
    })
  })

  describe('token refresh', () => {
    it('refreshes expired token before API calls', async () => {
      await controller.initialize()

      // Manually set near-expired tokens
      await browserMock.storage.local.set({
        'otsu-identity': {
          accessToken: 'old-access',
          refreshToken: 'old-refresh',
          expiresAt: Date.now() + 30_000, // within 60s buffer
        },
      })

      // Re-initialize to pick up stored tokens
      const ctrl2 = new IdentityController()
      await ctrl2.initialize()

      mockGetProfile.mockResolvedValueOnce({ sub: 'user-1' })

      await ctrl2.refreshProfile()

      expect(mockRefreshTokens).toHaveBeenCalledWith('old-refresh')
      expect(mockGetProfile).toHaveBeenCalledWith('new-access')
    })
  })
})
