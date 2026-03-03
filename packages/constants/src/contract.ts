export const CONTRACT_PARAMETER_FLAGS = {
  tfSendAmount: 0x01,
  tfSendNFToken: 0x02,
  tfAuthorizeTokenHolding: 0x04,
} as const

export const CONTRACT_STYPES = [
  'STAmount',
  'AccountID',
  'UInt32',
  'UInt64',
  'Hash256',
  'Blob',
] as const

export const CONTRACT_MAX_PARAMETERS = 4

export const CONTRACT_INFO_CACHE_TTL_MS = 60 * 60 * 1000

export const CONTRACT_DEFAULT_FEE = '50000'
