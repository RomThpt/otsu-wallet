export const NFT_TRANSFER_FEE_MAX = 50000 // 50% (in basis points, 50000/100000)

export const NFT_FLAGS = {
  tfBurnable: 0x00000001,
  tfOnlyXRP: 0x00000002,
  tfTrustLine: 0x00000004,
  tfTransferable: 0x00000008,
} as const

export const NFT_OFFER_FLAGS = {
  tfSellNFToken: 0x00000001,
} as const

export const NFT_METADATA_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
