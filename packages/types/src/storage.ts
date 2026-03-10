export interface EncryptedVault {
  version: number
  ciphertext: string
  iv: string
  salt: string
  iterations: number
  authTag: string
}

export interface VaultData {
  mnemonic: string
  accounts: VaultAccount[]
}

export interface VaultAccount {
  address: string
  publicKey: string
  privateKey: string
  derivationPath?: string
  type: 'hd' | 'imported'
  index?: number
  chainType?: import('./network').ChainType
}

export interface SessionState {
  unlocked: boolean
  unlockedAt: number
  autoLockMinutes: number
}
