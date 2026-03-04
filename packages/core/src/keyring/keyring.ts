import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'
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

  clear(): void {
    this.accounts.clear()
  }
}
