export const EVM_CHAIN_IDS = {
  MAINNET: 1440002,
  TESTNET: 1449000,
} as const

export const XRP_DECIMALS_XRPL = 6
export const XRP_DECIMALS_EVM = 18

export const AXELAR_GATEWAY = {
  mainnet: {
    xrplGateway: 'rGMGg6nbzmEypjBbAT4GmXRE76jat3DPXE',
    evmGateway: '0xe432150cce91c13a887f7D836923d5597adD8E31',
  },
  testnet: {
    xrplGateway: 'rfEf91bLxrTVC76vw1W3Ur34Yod4TYBM4R',
    evmGateway: '0xe432150cce91c13a887f7D836923d5597adD8E31',
  },
} as const

export const BRIDGE_POLL_INTERVAL_MS = 15_000
export const BRIDGE_TIMEOUT_MS = 30 * 60 * 1000
export const BRIDGE_MIN_AMOUNT = '1'
export const BRIDGE_MAX_AMOUNT = '1000000'

export const EVM_DEFAULT_GAS_LIMIT = '21000'
export const EVM_ERC20_GAS_LIMIT = '100000'

export const BLOCKSCOUT_API = {
  mainnet: 'https://explorer.xrplevm.org/api',
  testnet: 'https://explorer.testnet.xrplevm.org/api',
} as const
