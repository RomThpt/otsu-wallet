import { Wallet, type TransactionRequest, type TypedDataDomain, type TypedDataField } from 'ethers'
import type { VaultAccount } from '@otsu/types'

export class EvmKeyring {
  private accounts = new Map<string, VaultAccount>()

  load(accounts: VaultAccount[]): void {
    this.accounts.clear()
    for (const account of accounts) {
      this.accounts.set(account.address.toLowerCase(), account)
    }
  }

  addAccount(account: VaultAccount): void {
    this.accounts.set(account.address.toLowerCase(), account)
  }

  removeAccount(address: string): void {
    this.accounts.delete(address.toLowerCase())
  }

  getAddresses(): string[] {
    return Array.from(this.accounts.keys())
  }

  hasAccount(address: string): boolean {
    return this.accounts.has(address.toLowerCase())
  }

  clear(): void {
    this.accounts.clear()
  }

  async signTransaction(address: string, tx: TransactionRequest): Promise<string> {
    const wallet = this.getWallet(address)
    return wallet.signTransaction(tx)
  }

  async signMessage(address: string, message: string | Uint8Array): Promise<string> {
    const wallet = this.getWallet(address)
    return wallet.signMessage(message)
  }

  async signTypedData(
    address: string,
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    value: Record<string, unknown>,
  ): Promise<string> {
    const wallet = this.getWallet(address)
    return wallet.signTypedData(domain, types, value)
  }

  private getWallet(address: string): Wallet {
    const account = this.accounts.get(address.toLowerCase())
    if (!account) {
      throw new Error(`EVM account not found: ${address}`)
    }
    return new Wallet(account.privateKey)
  }
}
