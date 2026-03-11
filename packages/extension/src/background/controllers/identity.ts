import browser from 'webextension-polyfill'
import type { IdentityProfile, IdentityState } from '@otsu/types'
import {
  IDENTITY_STORAGE_KEY,
  IDENTITY_PROFILE_KEY,
  IDENTITY_TOKEN_REFRESH_BUFFER_MS,
  IDENTITY_PROFILE_CACHE_TTL_MS,
} from '@otsu/constants'
import {
  generateCodeVerifier,
  deriveCodeChallenge,
  buildAuthorizationUrl,
  exchangeCode,
  refreshTokens,
  getProfile,
  linkWallet as apiLinkWallet,
  unlinkWallet as apiUnlinkWallet,
} from '@otsu/core'

interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

interface StoredProfile {
  profile: IdentityProfile
  fetchedAt: number
}

export class IdentityController {
  private tokens: StoredTokens | null = null
  private profile: IdentityProfile | null = null
  private profileFetchedAt = 0
  private initialized = false

  async initialize(): Promise<void> {
    if (this.initialized) return

    const stored = await browser.storage.local.get([IDENTITY_STORAGE_KEY, IDENTITY_PROFILE_KEY])

    if (stored[IDENTITY_STORAGE_KEY]) {
      this.tokens = stored[IDENTITY_STORAGE_KEY] as StoredTokens
    }

    if (stored[IDENTITY_PROFILE_KEY]) {
      const cached = stored[IDENTITY_PROFILE_KEY] as StoredProfile
      this.profile = cached.profile
      this.profileFetchedAt = cached.fetchedAt
    }

    this.initialized = true
  }

  async login(): Promise<void> {
    const verifier = generateCodeVerifier()
    const challenge = await deriveCodeChallenge(verifier)
    const state = generateCodeVerifier(32)
    const redirectUri = browser.identity.getRedirectURL()
    const url = buildAuthorizationUrl(redirectUri, state, challenge)

    // Launch the auth flow in a browser-managed popup
    const callbackUrl = await browser.identity.launchWebAuthFlow({
      url,
      interactive: true,
    })

    if (!callbackUrl) {
      throw new Error('Login was cancelled')
    }

    // Extract code and state from the callback URL
    const params = new URL(callbackUrl).searchParams
    const code = params.get('code')
    const returnedState = params.get('state')

    if (!code || !returnedState) {
      throw new Error('Missing code or state in callback')
    }

    if (returnedState !== state) {
      throw new Error('Invalid state parameter')
    }

    const tokenResponse = await exchangeCode(code, redirectUri, verifier)

    this.tokens = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token ?? '',
      expiresAt: Date.now() + tokenResponse.expires_in * 1000,
    }

    await browser.storage.local.set({ [IDENTITY_STORAGE_KEY]: this.tokens })

    // Fetch profile immediately
    this.profile = await getProfile(this.tokens.accessToken)
    this.profileFetchedAt = Date.now()
    await browser.storage.local.set({
      [IDENTITY_PROFILE_KEY]: { profile: this.profile, fetchedAt: this.profileFetchedAt },
    })
  }

  async logout(): Promise<void> {
    this.tokens = null
    this.profile = null
    this.profileFetchedAt = 0

    await browser.storage.local.remove([IDENTITY_STORAGE_KEY, IDENTITY_PROFILE_KEY])
  }

  getState(): IdentityState {
    return {
      loggedIn: this.tokens !== null,
      profile: this.profile,
      linkedAddress: this.profile?.xrplAddress ?? null,
    }
  }

  async refreshProfile(): Promise<IdentityProfile | null> {
    if (!this.tokens) return null

    const isStale = Date.now() - this.profileFetchedAt > IDENTITY_PROFILE_CACHE_TTL_MS
    if (!isStale && this.profile) return this.profile

    await this.ensureValidToken()
    if (!this.tokens) return null

    this.profile = await getProfile(this.tokens.accessToken)
    this.profileFetchedAt = Date.now()
    await browser.storage.local.set({
      [IDENTITY_PROFILE_KEY]: { profile: this.profile, fetchedAt: this.profileFetchedAt },
    })

    return this.profile
  }

  async linkWallet(address: string): Promise<void> {
    if (!this.tokens) throw new Error('Not logged in')

    await this.ensureValidToken()
    await apiLinkWallet(this.tokens!.accessToken, address)

    // Refresh profile to pick up the linked address
    this.profile = await getProfile(this.tokens!.accessToken)
    this.profileFetchedAt = Date.now()
    await browser.storage.local.set({
      [IDENTITY_PROFILE_KEY]: { profile: this.profile, fetchedAt: this.profileFetchedAt },
    })
  }

  async unlinkWallet(): Promise<void> {
    if (!this.tokens) throw new Error('Not logged in')

    await this.ensureValidToken()
    await apiUnlinkWallet(this.tokens!.accessToken)

    // Refresh profile to clear the linked address
    this.profile = await getProfile(this.tokens!.accessToken)
    this.profileFetchedAt = Date.now()
    await browser.storage.local.set({
      [IDENTITY_PROFILE_KEY]: { profile: this.profile, fetchedAt: this.profileFetchedAt },
    })
  }

  private async ensureValidToken(): Promise<void> {
    if (!this.tokens) return

    const isExpiringSoon = this.tokens.expiresAt - Date.now() < IDENTITY_TOKEN_REFRESH_BUFFER_MS
    if (!isExpiringSoon) return

    if (!this.tokens.refreshToken) {
      await this.logout()
      return
    }

    try {
      const tokenResponse = await refreshTokens(this.tokens.refreshToken)
      this.tokens = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token ?? this.tokens.refreshToken,
        expiresAt: Date.now() + tokenResponse.expires_in * 1000,
      }
      await browser.storage.local.set({ [IDENTITY_STORAGE_KEY]: this.tokens })
    } catch {
      // Refresh failed -- force logout
      await this.logout()
    }
  }
}
