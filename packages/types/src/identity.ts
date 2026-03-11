export interface IdentityProfile {
  sub: string
  email?: string
  emailVerified?: boolean
  preferredUsername?: string
  name?: string
  givenName?: string
  familyName?: string
  picture?: string
  roles?: string[]
  xrplAddress?: string
  xrplWalletType?: string
}

export interface IdentityState {
  loggedIn: boolean
  profile: IdentityProfile | null
  linkedAddress: string | null
}

export interface IdentityCallbackPayload {
  code: string
  state: string
}

export interface IdentityLinkWalletPayload {
  address: string
}
