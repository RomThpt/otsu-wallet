// NFT from account_nfts RPC
export interface NftBalance {
  nftId: string
  issuer: string
  owner: string
  tokenId: string // hex NFTokenID
  uri: string // IPFS or HTTP URI
  flags: number
  transferFee: number
  taxon: number
}

// NFT metadata from XRPL Meta API
export interface NftMetadata {
  nftId: string
  name?: string
  description?: string
  image?: string
  animationUrl?: string
  backgroundColor?: string
  externalUrl?: string
  attributes?: Record<string, string>[]
}

// NFT offer
export interface NftOffer {
  offerId: string
  nftId: string
  owner: string
  amount: string // XRP drops or token
  destination?: string // for directed offers
  flags: number
  expiration?: number
}

// Transaction params
export interface MintNftParams {
  uri: string
  taxon?: number
  flags?: number
  transferFee?: number
}

export interface SellNftParams {
  nftId: string
  amount: string // XRP drops
  destination?: string // optional, for directed offers
}

export interface BuyNftParams {
  nftId: string
  amount: string // XRP drops
  owner: string // NFT owner
}

export interface AcceptNftOfferParams {
  offerId: string
}
