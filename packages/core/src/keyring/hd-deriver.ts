import { Wallet } from 'xrpl'
import ECDSA from 'xrpl/dist/npm/ECDSA'
import { DERIVATION_PATH } from '@otsu/constants'
import type { VaultAccount } from '@otsu/types'

export interface DerivedAccount {
  address: string
  publicKey: string
  privateKey: string
  derivationPath: string
  index: number
}

export function deriveAccount(mnemonic: string, index: number): DerivedAccount {
  const path = `${DERIVATION_PATH}/${index}`

  const wallet = Wallet.fromMnemonic(mnemonic, {
    derivationPath: path,
    mnemonicEncoding: 'bip39',
    algorithm: ECDSA.secp256k1,
  })

  return {
    address: wallet.classicAddress,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
    derivationPath: path,
    index,
  }
}

export function deriveAccounts(mnemonic: string, count: number): DerivedAccount[] {
  const accounts: DerivedAccount[] = []
  for (let i = 0; i < count; i++) {
    accounts.push(deriveAccount(mnemonic, i))
  }
  return accounts
}

export function derivedToVaultAccount(derived: DerivedAccount): VaultAccount {
  return {
    address: derived.address,
    publicKey: derived.publicKey,
    privateKey: derived.privateKey,
    derivationPath: derived.derivationPath,
    type: 'hd',
    index: derived.index,
  }
}
