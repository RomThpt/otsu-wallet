export interface TokenBalance {
  currency: string
  issuer: string
  value: string
  limit: string
  noRipple: boolean
  authorized?: boolean
  frozen?: boolean
  disabledReason?: string
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

export type XrplAsset =
  | { type: 'native'; currency: 'XRP' }
  | { type: 'issued'; currency: string; issuer: string }
  | {
      type: 'mpt'
      issuanceId: string
      assetScale: number
      issuer?: string
    }

export type XrplAssetAmount =
  | string
  | { currency: string; issuer: string; value: string }
  | { mpt_issuance_id: string; value: string }

export interface OwnedXrplAsset {
  key: string
  asset: XrplAsset
  symbol: string
  name: string
  balance: string
  transactionBalance: string
  lockedBalance?: string
  authorized: boolean
  tradeable: boolean
  disabledReason?: string
}
