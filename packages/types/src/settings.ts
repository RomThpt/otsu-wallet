export interface WalletSettings {
  blindSigningEnabled: boolean
  autoLockMinutes: number
  theme: 'light' | 'dark' | 'system' | 'evangelion'
}

export const DEFAULT_SETTINGS: WalletSettings = {
  blindSigningEnabled: false,
  autoLockMinutes: 5,
  theme: 'system',
}
