import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'
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
      this.accounts.set(account.address, account)
    }
  }

  addAccount(account: VaultAccount): void {
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
    return account.publicKey
  }

  sign(address: string, transaction: Transaction): { tx_blob: string; hash: string } {
    const account = this.accounts.get(address)
    if (!account) {
      throw new OtsuError(ErrorCodes.SIGNING_ERROR, `Account not found: ${address}`)
    }

    const wallet = new Wallet(account.publicKey, account.privateKey)
    return wallet.sign(transaction)
  }

  signMessage(address: string, message: string): { signature: string; publicKey: string } {
    const account = this.accounts.get(address)
    if (!account) {
      throw new OtsuError(ErrorCodes.SIGNING_ERROR, `Account not found: ${address}`)
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
