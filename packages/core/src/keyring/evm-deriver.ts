import { HDNodeWallet, Mnemonic } from 'ethers'
import { EVM_DERIVATION_PATH } from '@otsu/constants'
import type { VaultAccount } from '@otsu/types'

export interface EvmDerivedAccount {
  address: string
  publicKey: string
  privateKey: string
  derivationPath: string
  index: number
}

export function deriveEvmAccount(mnemonic: string, index: number): EvmDerivedAccount {
  const path = `${EVM_DERIVATION_PATH}/${index}`
  const mn = Mnemonic.fromPhrase(mnemonic)
  const wallet = HDNodeWallet.fromMnemonic(mn, path)

  return {
    address: wallet.address,
    publicKey: wallet.publicKey,
    privateKey: wallet.privateKey,
    derivationPath: path,
    index,
  }
}

export function deriveEvmAccounts(mnemonic: string, count: number): EvmDerivedAccount[] {
  const accounts: EvmDerivedAccount[] = []
  for (let i = 0; i < count; i++) {
    accounts.push(deriveEvmAccount(mnemonic, i))
  }
  return accounts
}

export function evmDerivedToVaultAccount(derived: EvmDerivedAccount): VaultAccount {
  return {
    address: derived.address,
    publicKey: derived.publicKey,
    privateKey: derived.privateKey,
    derivationPath: derived.derivationPath,
    type: 'hd',
    index: derived.index,
    chainType: 'evm',
  }
}
