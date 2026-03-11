import { IDENTITY_SERVER_URL, IDENTITY_CLIENT_ID, IDENTITY_SCOPES } from '@otsu/constants'
import type { IdentityProfile } from '@otsu/types'

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  id_token?: string
  token_type: string
  expires_in: number
}

export function buildAuthorizationUrl(
  redirectUri: string,
  state: string,
  codeChallenge: string,
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: IDENTITY_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: IDENTITY_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${IDENTITY_SERVER_URL}/auth?${params.toString()}`
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const response = await fetch(`${IDENTITY_SERVER_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: IDENTITY_CLIENT_ID,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed: ${response.status} ${text}`)
  }

  return response.json()
}

export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch(`${IDENTITY_SERVER_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: IDENTITY_CLIENT_ID,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token refresh failed: ${response.status} ${text}`)
  }

  return response.json()
}

export async function getProfile(accessToken: string): Promise<IdentityProfile> {
  const response = await fetch(`${IDENTITY_SERVER_URL}/user/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get profile: ${response.status} ${text}`)
  }

  const data = await response.json()
  const identity = data.identity ?? {}
  const profile = data.profile ?? {}

  return {
    sub: identity._id ?? '',
    email: identity.email,
    emailVerified: identity.email_verified,
    preferredUsername: profile.username,
    name: [profile.firstname, profile.lastname].filter(Boolean).join(' ') || undefined,
    givenName: profile.firstname,
    familyName: profile.lastname,
    picture: profile.picture,
    roles: identity.roles,
    xrplAddress: profile.xrplWallet?.address,
    xrplWalletType: profile.xrplWallet?.walletType,
  }
}

export async function linkWallet(accessToken: string, address: string): Promise<void> {
  const response = await fetch(`${IDENTITY_SERVER_URL}/user/profile/xrpl`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address, walletType: 'otsu' }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to link wallet: ${response.status} ${text}`)
  }
}

export async function unlinkWallet(accessToken: string): Promise<void> {
  const response = await fetch(`${IDENTITY_SERVER_URL}/user/profile/xrpl`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to unlink wallet: ${response.status} ${text}`)
  }
}
