import { Wallet } from '@xrpl-commons/xrpl'
import type { Transaction } from '@xrpl-commons/xrpl'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import type { VaultAccount } from '@otsu/types'
import { OtsuError, ErrorCodes } from '@otsu/constants'

export class Keyring {
  private accounts: Map<string, VaultAccount> = new Map()

  load(accounts: VaultAccount[]): void {
    this.accounts.clear()
    for (const account of accounts) {
      if (account.privateKey && account.publicKey) this.accounts.set(account.address, account)
    }
  }

  addAccount(account: VaultAccount): void {
    if (!account.privateKey || !account.publicKey) {
      throw new Error('Software account key pair is required')
    }
    this.accounts.set(account.address, account)
  }

  removeAccount(address: string): void {
    this.accounts.delete(address)
  }

  getAddresses(): string[] {
    return Array.from(this.accounts.keys())
  }

  hasAccount(address: string): boolean {
    return this.accounts.has(address)
  }

  getPublicKey(address: string): string {
    const account = this.accounts.get(address)
    if (!account) {
      throw new OtsuError(ErrorCodes.INVALID_ADDRESS, `Account not found: ${address}`)
    }
    if (!account.publicKey) {
      throw new OtsuError(ErrorCodes.INVALID_ADDRESS, `Account public key not found: ${address}`)
    }
    return account.publicKey
  }

  sign(address: string, transaction: Transaction): { tx_blob: string; hash: string } {
    const account = this.accounts.get(address)
    if (!account) {
      throw new OtsuError(ErrorCodes.SIGNING_ERROR, `Account not found: ${address}`)
    }

    if (!account.privateKey || !account.publicKey) {
      throw new OtsuError(ErrorCodes.SIGNING_ERROR, 'Account must be signed by its hardware wallet')
    }
    const wallet = new Wallet(account.publicKey, account.privateKey)
    return wallet.sign(transaction)
  }

  signMessage(address: string, message: string): { signature: string; publicKey: string } {
    const account = this.accounts.get(address)
    if (!account) {
      throw new OtsuError(ErrorCodes.SIGNING_ERROR, `Account not found: ${address}`)
    }

    if (!account.privateKey || !account.publicKey) {
      throw new OtsuError(ErrorCodes.SIGNING_ERROR, 'Account must be signed by its hardware wallet')
    }
    const privateKeyHex = account.privateKey.startsWith('00')
      ? account.privateKey.slice(2)
      : account.privateKey
    const privateKeyBytes = hexToBytes(privateKeyHex)
    const messageBytes = new TextEncoder().encode(message)
    const hash = sha256(messageBytes)
    const sig = secp256k1.sign(hash, privateKeyBytes)

    return {
      signature: bytesToHex(sig),
      publicKey: account.publicKey,
    }
  }

  clear(): void {
    this.accounts.clear()
  }
}
