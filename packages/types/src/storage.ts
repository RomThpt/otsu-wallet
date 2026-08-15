export interface EncryptedVault {
  version: number
  ciphertext: string
  iv: string
  salt: string
  iterations: number
  authTag: string
}

export interface VaultData {
  /** Encrypted vault schema. Missing means the legacy single-seed schema. */
  schemaVersion?: 2
  /** @deprecated Read only while migrating legacy vaults. */
  mnemonic?: string
  seedSources?: VaultSeedSource[]
  accounts: VaultAccount[]
}

export interface VaultSeedSource {
  id: string
  type: 'mnemonic'
  label: string
  mnemonic: string
}

export interface VaultAccount {
  address: string
  publicKey?: string
  /** Present only for software accounts. Hardware private keys never leave the device. */
  privateKey?: string
  label?: string
  seedSourceId?: string
  derivationPath?: string
  type: 'hd' | 'imported' | 'hardware'
  index?: number
  chainType?: import('./network').ChainType
  hardware?: HardwareAccountMetadata
}

export type HardwareWalletProvider = 'ledger' | 'trezor'

export interface HardwareAccountMetadata {
  provider: HardwareWalletProvider
  /** Vendor device identity when available. Ledger deliberately exposes only session-scoped IDs. */
  deviceId?: string
  model?: string
  verifiedAt: number
}

export interface SessionState {
  unlocked: boolean
  unlockedAt: number
  autoLockMinutes: number
}
