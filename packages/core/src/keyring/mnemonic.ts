import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from 'bip39'
import { MNEMONIC_STRENGTH } from '@otsu/constants'

export function generateNewMnemonic(): string {
  return generateMnemonic(MNEMONIC_STRENGTH)
}

export function isValidMnemonic(mnemonic: string): boolean {
  return validateMnemonic(mnemonic.trim().toLowerCase())
}

export function mnemonicToSeed(mnemonic: string): Uint8Array {
  return mnemonicToSeedSync(mnemonic.trim().toLowerCase())
}

export function mnemonicToWordArray(mnemonic: string): string[] {
  return mnemonic.trim().toLowerCase().split(/\s+/)
}
