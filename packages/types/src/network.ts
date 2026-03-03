export interface NetworkConfig {
  id: string
  name: string
  url: string
  explorer?: string
  faucet?: string
  networkId?: number
  features?: string[]
  type: 'mainnet' | 'testnet' | 'devnet' | 'custom'
}

export interface CustomNetworkConfig extends NetworkConfig {
  addedAt: number
}

export interface AccountInfo {
  address: string
  balance: string
  sequence: number
  ownerCount: number
  isActivated: boolean
}

export interface BalanceInfo {
  available: string
  reserved: string
  total: string
  baseReserve: string
  ownerReserve: string
  ownerCount: number
}
