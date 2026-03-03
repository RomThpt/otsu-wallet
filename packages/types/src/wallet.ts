export type AccountType = 'hd' | 'imported' | 'hardware' | 'multisig'

export interface Account {
  address: string
  label: string
  type: AccountType
  derivationPath?: string
  publicKey: string
  index?: number
}

export type NetworkId = 'mainnet' | 'testnet' | 'devnet' | 'alphanet' | string

export interface WalletState {
  accounts: Account[]
  activeAccount: string | null
  network: NetworkId
  locked: boolean
  authMethod: AuthMethod
}

export type AuthMethod = 'password' | 'passkey'

export interface WalletMetadata {
  version: number
  createdAt: number
  authMethod: AuthMethod
  accountCount: number
}

export interface AccountLabels {
  [address: string]: string
}
