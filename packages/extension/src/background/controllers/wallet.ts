import type {
  WalletState,
  VaultData,
  Account,
  AuthMethod,
  SendPaymentPayload,
  TokenBalance,
  TokenMetadata,
  TransactionHistoryPage,
  TrustlineParams,
  ImportPayload,
} from '@otsu/types'
import { NETWORKS } from '@otsu/constants'
import {
  AuthManager,
  Keyring,
  XrplClient,
  PriceClient,
  TokenClient,
  TokenMetadataClient,
  TransactionHistoryClient,
  WalletCache,
  ChromeCacheStorage,
  generateNewMnemonic,
  deriveAccount,
  deriveAccounts,
  derivedToVaultAccount,
  importAccount as coreImportAccount,
  importedToVaultAccount,
  buildTokenPayment,
} from '@otsu/core'

const STATE_STORAGE_KEY = 'otsu-wallet-state'

interface PersistedState {
  accounts: Account[]
  activeAccount: string | null
  network: string
}

export class WalletController {
  private auth = new AuthManager()
  private keyring = new Keyring()
  private client = new XrplClient('testnet')
  private priceClient = new PriceClient(this.client)
  private tokenClient = new TokenClient(this.client)
  private metadataClient: TokenMetadataClient
  private historyClient = new TransactionHistoryClient(this.client)
  private cache: WalletCache
  private state: WalletState = {
    accounts: [],
    activeAccount: null,
    network: 'testnet',
    locked: true,
  }
  private initialized = false

  constructor() {
    this.cache = new WalletCache(new ChromeCacheStorage())
    this.metadataClient = new TokenMetadataClient(this.cache)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    await this.restorePersistedState()
    this.initialized = true
  }

  getState(): WalletState {
    return { ...this.state, locked: !this.auth.isUnlocked }
  }

  async createWallet(
    authMethod: AuthMethod,
    password?: string,
    existingMnemonic?: string,
  ): Promise<{ mnemonic: string; address: string }> {
    const mnemonic = existingMnemonic ?? generateNewMnemonic()
    const derived = deriveAccount(mnemonic, 0)
    const vaultAccount = derivedToVaultAccount(derived)

    const vaultData: VaultData = {
      mnemonic,
      accounts: [vaultAccount],
    }

    await this.auth.setup(vaultData, authMethod, password)

    this.keyring.load([vaultAccount])

    const account: Account = {
      address: derived.address,
      label: 'Account 1',
      type: 'hd',
      derivationPath: derived.derivationPath,
      publicKey: derived.publicKey,
      index: 0,
    }

    this.state.accounts = [account]
    this.state.activeAccount = account.address
    this.state.locked = false

    await this.persistState()
    await this.cache.setAccountLabel(account.address, account.label)

    return { mnemonic, address: account.address }
  }

  async unlock(method: AuthMethod, password?: string): Promise<WalletState> {
    const data = await this.auth.unlock(method, password)
    this.keyring.load(data.accounts)

    const labels = await this.cache.getAccountLabels()

    this.state.accounts = data.accounts.map((a, i) => ({
      address: a.address,
      label: labels[a.address] ?? `Account ${i + 1}`,
      type: a.type === 'hd' ? ('hd' as const) : ('imported' as const),
      derivationPath: a.derivationPath,
      publicKey: a.publicKey,
      index: a.index,
    }))

    this.state.activeAccount = this.state.accounts[0]?.address ?? null
    this.state.locked = false

    await this.persistState()
    return this.getState()
  }

  lock(): void {
    this.auth.lock()
    this.keyring.clear()
    this.state.locked = true
  }

  async getBalance(
    address?: string,
  ): Promise<{ available: string; total: string; reserved: string }> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    const balance = await this.client.getBalance(addr)

    await this.cache.setCachedBalance(addr, balance.total)

    return {
      available: balance.available,
      total: balance.total,
      reserved: balance.reserved,
    }
  }

  async getAccountInfo(address?: string) {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    return this.client.getAccountInfo(addr)
  }

  async sendPayment(payload: SendPaymentPayload): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx: Record<string, unknown> = {
      TransactionType: 'Payment',
      Account: sender,
      Destination: payload.destination,
      Amount: payload.amount,
    }

    if (payload.destinationTag !== undefined) {
      tx.DestinationTag = payload.destinationTag
    }

    const prepared = await this.client.prepareTransaction(tx)
    const signed = this.keyring.sign(sender, prepared as never)
    const result = await this.client.submitTransaction(signed.tx_blob)

    return (result.result.tx_json?.hash as string) ?? signed.hash
  }

  async switchNetwork(networkId: string): Promise<void> {
    await this.client.switchNetwork(networkId)
    this.state.network = networkId
    await this.persistState()
  }

  async requestFaucet(address?: string): Promise<void> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    await this.client.fundWallet(addr)
  }

  getNetworks() {
    return NETWORKS
  }

  // --- Phase 2: Import ---

  async importAccount(payload: ImportPayload): Promise<Account> {
    const imported = coreImportAccount(payload)

    const existing = this.state.accounts.find((a) => a.address === imported.address)
    if (existing) throw new Error('Account already exists')

    const vaultAccount = importedToVaultAccount(imported)

    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')

    data.accounts.push(vaultAccount)
    await this.auth.setup(data, 'password')

    this.keyring.addAccount(vaultAccount)

    const label = payload.label ?? `Imported ${this.state.accounts.length + 1}`
    const account: Account = {
      address: imported.address,
      label,
      type: imported.type,
      derivationPath: imported.derivationPath,
      publicKey: imported.publicKey,
      index: imported.index,
    }

    this.state.accounts.push(account)
    this.state.activeAccount = account.address

    await this.persistState()
    await this.cache.setAccountLabel(account.address, label)

    return account
  }

  async deriveMoreAccounts(count: number): Promise<Account[]> {
    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')

    const existingHdCount = this.state.accounts.filter((a) => a.type === 'hd').length
    const newAccounts = deriveAccounts(data.mnemonic, existingHdCount + count).slice(
      existingHdCount,
    )

    const labels = await this.cache.getAccountLabels()
    const result: Account[] = []

    for (const derived of newAccounts) {
      const vaultAccount = derivedToVaultAccount(derived)
      data.accounts.push(vaultAccount)
      this.keyring.addAccount(vaultAccount)

      const label = labels[derived.address] ?? `Account ${this.state.accounts.length + 1}`
      const account: Account = {
        address: derived.address,
        label,
        type: 'hd',
        derivationPath: derived.derivationPath,
        publicKey: derived.publicKey,
        index: derived.index,
      }

      this.state.accounts.push(account)
      result.push(account)
    }

    await this.auth.setup(data, 'password')
    await this.persistState()

    return result
  }

  async setActiveAccount(address: string): Promise<void> {
    const account = this.state.accounts.find((a) => a.address === address)
    if (!account) throw new Error('Account not found')
    this.state.activeAccount = address
    await this.persistState()
  }

  async updateAccountLabel(address: string, label: string): Promise<void> {
    const account = this.state.accounts.find((a) => a.address === address)
    if (!account) throw new Error('Account not found')
    account.label = label
    await this.persistState()
    await this.cache.setAccountLabel(address, label)
  }

  // --- Phase 2: Tokens ---

  async getTokens(address?: string): Promise<{ tokens: TokenBalance[]; metadata: TokenMetadata[] }> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    try {
      const tokens = await this.tokenClient.getAccountTokens(addr)
      await this.cache.setCachedTokens(addr, tokens)

      const metadata = await this.metadataClient.getTokenMetadataBatch(
        tokens.map((t) => ({ currency: t.currency, issuer: t.issuer })),
      )

      return { tokens, metadata }
    } catch {
      const cached = await this.cache.getCachedTokens(addr)
      return { tokens: cached ?? [], metadata: [] }
    }
  }

  async setTrustline(params: TrustlineParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = this.tokenClient.buildSetTrustline(sender, params)
    const prepared = await this.client.prepareTransaction(tx)
    const signed = this.keyring.sign(sender, prepared as never)
    const result = await this.client.submitTransaction(signed.tx_blob)

    return (result.result.tx_json?.hash as string) ?? signed.hash
  }

  async removeTrustline(currency: string, issuer: string): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = this.tokenClient.buildRemoveTrustline(sender, currency, issuer)
    const prepared = await this.client.prepareTransaction(tx)
    const signed = this.keyring.sign(sender, prepared as never)
    const result = await this.client.submitTransaction(signed.tx_blob)

    return (result.result.tx_json?.hash as string) ?? signed.hash
  }

  async sendTokenPayment(params: {
    destination: string
    currency: string
    issuer: string
    value: string
    destinationTag?: number
  }): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildTokenPayment({
      account: sender,
      destination: params.destination,
      currency: params.currency,
      issuer: params.issuer,
      value: params.value,
      destinationTag: params.destinationTag,
    })

    const prepared = await this.client.prepareTransaction(tx)
    const signed = this.keyring.sign(sender, prepared as never)
    const result = await this.client.submitTransaction(signed.tx_blob)

    return (result.result.tx_json?.hash as string) ?? signed.hash
  }

  // --- Phase 2: Transaction History ---

  async getTransactionHistory(
    marker?: unknown,
    limit?: number,
  ): Promise<TransactionHistoryPage> {
    const addr = this.state.activeAccount
    if (!addr) throw new Error('No active account')

    try {
      const page = await this.historyClient.getTransactionHistory(addr, { marker, limit })

      if (!marker) {
        await this.cache.setCachedTransactions(addr, page.transactions)
      } else {
        await this.cache.appendCachedTransactions(addr, page.transactions)
      }

      return page
    } catch {
      const cached = await this.cache.getCachedTransactions(addr)
      return {
        transactions: cached ?? [],
        hasMore: false,
      }
    }
  }

  // --- Phase 2: Price ---

  async getXrpPrice(): Promise<string> {
    try {
      const price = await this.priceClient.getXrpUsdPrice()
      await this.cache.setCachedPrice(price)
      return price
    } catch {
      const cached = await this.cache.getCachedPrice()
      return cached?.xrpUsd ?? '0'
    }
  }

  // --- Phase 2: Cached Data ---

  async getCachedData(address?: string): Promise<{
    balance: string | null
    tokens: TokenBalance[] | null
    transactions: import('@otsu/types').TransactionRecord[] | null
    price: string | null
    lastUpdated: number | null
  }> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    const [balance, tokens, transactions, price, lastUpdated] = await Promise.all([
      this.cache.getCachedBalance(addr),
      this.cache.getCachedTokens(addr),
      this.cache.getCachedTransactions(addr),
      this.cache.getCachedPrice(),
      this.cache.getLastUpdated(addr),
    ])

    return {
      balance,
      tokens,
      transactions,
      price: price?.xrpUsd ?? null,
      lastUpdated,
    }
  }

  // --- Persistence ---

  private async persistState(): Promise<void> {
    try {
      const persisted: PersistedState = {
        accounts: this.state.accounts,
        activeAccount: this.state.activeAccount,
        network: this.state.network,
      }
      await chrome.storage.local.set({ [STATE_STORAGE_KEY]: persisted })
    } catch {
      // Storage may not be available in tests
    }
  }

  private async restorePersistedState(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(STATE_STORAGE_KEY)
      const persisted = result[STATE_STORAGE_KEY] as PersistedState | undefined
      if (persisted) {
        this.state.accounts = persisted.accounts
        this.state.activeAccount = persisted.activeAccount
        this.state.network = persisted.network
        if (persisted.network !== 'testnet') {
          await this.client.switchNetwork(persisted.network)
        }
      }
    } catch {
      // Storage may not be available
    }
  }
}
