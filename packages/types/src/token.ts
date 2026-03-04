export interface TokenBalance {
  currency: string
  issuer: string
  value: string
  limit: string
  noRipple: boolean
}

export interface TokenMetadata {
  currency: string
  issuer: string
  name?: string
  symbol?: string
  icon?: string
  domain?: string
  verified: boolean
}

export interface TrustlineParams {
  currency: string
  issuer: string
  limit: string
  qualityIn?: number
  qualityOut?: number
}
