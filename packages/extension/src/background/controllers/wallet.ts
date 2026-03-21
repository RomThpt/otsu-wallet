import type {
  WalletState,
  VaultData,
  VaultAccount,
  Account,
  AuthMethod,
  ChainType,
  SendPaymentPayload,
  TokenBalance,
  TokenMetadata,
  TransactionHistoryPage,
  TrustlineParams,
  ImportPayload,
  WalletSettings,
  NftBalance,
  NftOffer,
  NftMetadata,
  MintNftParams,
  SellNftParams,
  BuyNftParams,
  CreateDexOfferParams,
  OrderBook,
  DexOffer,
  EscrowRecord,
  CheckRecord,
  CreateEscrowParams,
  FinishEscrowParams,
  CancelEscrowParams,
  CreateCheckParams,
  CashCheckParams,
  CancelCheckParams,
  AccountSettingsParams,
  CustomNetworkConfig,
  NetworkConfig,
  AddCustomNetworkPayload,
  ContractInfo,
  ContractCallParams,
  EvmBalanceInfo,
  EvmTransactionReceipt,
  Erc20Token,
  BridgeDirection,
  BridgeEstimate,
  BridgeTransaction,
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
  SettingsManager,
  generateNewMnemonic,
  deriveAccount,
  deriveAccounts,
  derivedToVaultAccount,
  importAccount as coreImportAccount,
  importedToVaultAccount,
  buildTokenPayment,
  NftClient,
  DexClient,
  buildMintNFT,
  buildBurnNFT,
  buildCreateSellOffer,
  buildCreateBuyOffer,
  buildAcceptOffer,
  buildCancelOffers,
  buildOfferCreate,
  buildOfferCancel,
  buildCreateEscrow,
  buildFinishEscrow,
  buildCancelEscrow,
  buildCreateCheck,
  buildCashCheck,
  buildCancelCheck,
  buildAccountSet,
  parseEscrows,
  parseChecks,
  NftMetadataClient,
  ContractClient,
  buildContractCall,
  EvmKeyring,
  EvmClient,
  Erc20Client,
  BridgeService,
  deriveEvmAccount,
  deriveEvmAccounts,
  evmDerivedToVaultAccount,
  evmParseEther,
  EvmContract,
  EvmJsonRpcProvider,
} from '@otsu/core'

const STATE_STORAGE_KEY = 'otsu-wallet-state'
const CUSTOM_NETWORKS_KEY = 'otsu-custom-networks'

interface PersistedState {
  accounts: Account[]
  activeAccount: string | null
  network: string
  authMethod?: AuthMethod
}

export class WalletController {
  private auth = new AuthManager()
  private keyring = new Keyring()
  private client = new XrplClient('testnet')
  private priceClient = new PriceClient(this.client)
  private tokenClient = new TokenClient(this.client)
  private metadataClient: TokenMetadataClient
  private historyClient = new TransactionHistoryClient(this.client)
  private nftClient = new NftClient(this.client)
  private dexClient = new DexClient(this.client)
  private cache: WalletCache
  private nftMetadataClient: NftMetadataClient
  private contractClient: ContractClient
  private settings = new SettingsManager()
  private evmClient: EvmClient | null = null
  private evmKeyring = new EvmKeyring()
  private erc20Client: Erc20Client | null = null
  private bridgeService: BridgeService | null = null
  private customNetworks: CustomNetworkConfig[] = []
  private state: WalletState = {
    accounts: [],
    activeAccount: null,
    network: 'testnet',
    locked: true,
    authMethod: 'password',
  }
  private initialized = false

  constructor() {
    this.cache = new WalletCache(new ChromeCacheStorage())
    this.metadataClient = new TokenMetadataClient(this.cache)
    this.nftMetadataClient = new NftMetadataClient(this.cache)
    this.contractClient = new ContractClient(this.client, this.cache)
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    await this.restoreCustomNetworks()
    await this.restorePersistedState()
    this.initialized = true
  }

  getState(): WalletState {
    return { ...this.state, locked: !this.auth.isUnlocked }
  }

  async hasWallet(): Promise<boolean> {
    return this.auth.hasWallet()
  }

  get currentChainType(): ChainType {
    const networkConfig = this.getNetworkConfig(this.state.network)
    return networkConfig?.chainType ?? 'xrpl'
  }

  private getNetworkConfig(networkId: string): NetworkConfig | undefined {
    return NETWORKS[networkId] ?? this.customNetworks.find((n) => n.id === networkId)
  }

  async createWallet(
    authMethod: AuthMethod,
    password?: string,
    existingMnemonic?: string,
    credentialId?: string,
    prfKey?: string,
  ): Promise<{ mnemonic: string; address: string }> {
    const mnemonic = existingMnemonic ?? generateNewMnemonic()
    const derived = deriveAccount(mnemonic, 0)
    const vaultAccount = derivedToVaultAccount(derived)

    const evmDerived = deriveEvmAccount(mnemonic, 0)
    const evmVaultAccount = evmDerivedToVaultAccount(evmDerived)

    const vaultData: VaultData = {
      mnemonic,
      accounts: [vaultAccount, evmVaultAccount],
    }

    if (authMethod === 'passkey') {
      if (!credentialId || !prfKey) {
        throw new Error('Passkey credential required')
      }
      await this.auth.setup(vaultData, authMethod, undefined, { credentialId, prfKey })
    } else {
      await this.auth.setup(vaultData, authMethod, password)
    }

    this.keyring.load([vaultAccount])
    this.evmKeyring.load([evmVaultAccount])

    const account: Account = {
      address: derived.address,
      label: 'Account 1',
      type: 'hd',
      derivationPath: derived.derivationPath,
      publicKey: derived.publicKey,
      index: 0,
      chainType: 'xrpl',
    }

    const evmAccount: Account = {
      address: evmDerived.address,
      label: 'EVM Account 1',
      type: 'hd',
      derivationPath: evmDerived.derivationPath,
      publicKey: evmDerived.publicKey,
      index: 0,
      chainType: 'evm',
    }

    this.state.accounts = [account, evmAccount]
    this.state.activeAccount = account.address
    this.state.locked = false
    this.state.authMethod = authMethod

    await this.persistState()
    await this.cache.setAccountLabel(account.address, account.label)

    return { mnemonic, address: account.address }
  }

  async unlock(method: AuthMethod, password?: string, passkeyKey?: string): Promise<WalletState> {
    const data = await this.auth.unlock(method, password, passkeyKey)

    // Migrate: derive EVM accounts for pre-existing wallets that lack them
    let evmAccounts = data.accounts.filter((a) => a.chainType === 'evm')
    if (evmAccounts.length === 0 && data.mnemonic) {
      const xrplHdAccounts = data.accounts.filter(
        (a) => (a.chainType ?? 'xrpl') === 'xrpl' && a.type === 'hd',
      )
      const evmVaultAccounts: VaultAccount[] = []
      for (const xrplAcc of xrplHdAccounts) {
        const evmDerived = deriveEvmAccount(data.mnemonic, xrplAcc.index ?? 0)
        evmVaultAccounts.push(evmDerivedToVaultAccount(evmDerived))
      }
      if (evmVaultAccounts.length === 0) {
        const evmDerived = deriveEvmAccount(data.mnemonic, 0)
        evmVaultAccounts.push(evmDerivedToVaultAccount(evmDerived))
      }
      data.accounts.push(...evmVaultAccounts)
      evmAccounts = evmVaultAccounts
      await this.auth.setup(data, method, password)
    }

    const xrplAccounts = data.accounts.filter((a) => (a.chainType ?? 'xrpl') === 'xrpl')

    this.keyring.load(xrplAccounts)
    this.evmKeyring.load(evmAccounts)

    const labels = await this.cache.getAccountLabels()

    this.state.accounts = data.accounts.map((a, i) => ({
      address: a.address,
      label:
        labels[a.address] ??
        (a.chainType === 'evm' ? `EVM Account ${(a.index ?? 0) + 1}` : `Account ${i + 1}`),
      type: a.type === 'hd' ? ('hd' as const) : ('imported' as const),
      derivationPath: a.derivationPath,
      publicKey: a.publicKey,
      index: a.index,
      chainType: a.chainType ?? 'xrpl',
    }))

    this.state.activeAccount = this.state.accounts[0]?.address ?? null
    this.state.locked = false

    await this.persistState()
    return this.getState()
  }

  lock(): void {
    this.auth.lock()
    this.keyring.clear()
    this.evmKeyring.clear()
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

    const { buildPayment } = await import('@otsu/core')
    const tx = buildPayment({
      account: sender,
      destination: payload.destination,
      amount: payload.amount,
      destinationTag: payload.destinationTag,
      memos: payload.memos,
    })

    const prepared = await this.client.prepareTransaction(tx)
    const signed = this.keyring.sign(sender, prepared as never)
    const result = await this.client.submitTransaction(signed.tx_blob)

    return (result.result.tx_json?.hash as string) ?? signed.hash
  }

  async switchNetwork(networkId: string): Promise<void> {
    const config = this.getNetworkConfig(networkId)

    if (config?.chainType === 'evm') {
      if (!this.evmClient) {
        this.evmClient = new EvmClient()
      }
      this.evmClient.switchNetwork(config)

      this.erc20Client = Erc20Client.create(config.url, config.chainId)

      const env = config.type === 'mainnet' ? 'mainnet' : 'testnet'
      this.bridgeService = new BridgeService(env as 'mainnet' | 'testnet')

      const bridgeTxs = await this.cache.getBridgeTransactions()
      this.bridgeService.loadTransactions(bridgeTxs)
    } else {
      const custom = this.customNetworks.find((n) => n.id === networkId)
      if (custom) {
        await this.client.switchToConfig(custom)
      } else {
        await this.client.switchNetwork(networkId)
      }
    }

    this.state.network = networkId

    // Auto-switch active account to matching chain type
    if (config) {
      const currentAccount = this.state.accounts.find((a) => a.address === this.state.activeAccount)
      if (currentAccount && currentAccount.chainType !== config.chainType) {
        const matchingAccount = this.state.accounts.find((a) => a.chainType === config.chainType)
        if (matchingAccount) {
          this.state.activeAccount = matchingAccount.address
        }
      }
    }

    await this.persistState()
  }

  async requestFaucet(address?: string): Promise<void> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    await this.client.fundWallet(addr)
  }

  getNetworks(): { predefined: Record<string, NetworkConfig>; custom: CustomNetworkConfig[] } {
    return { predefined: NETWORKS, custom: this.customNetworks }
  }

  async addCustomNetwork(payload: AddCustomNetworkPayload): Promise<CustomNetworkConfig> {
    const config: CustomNetworkConfig = {
      id: `custom-${Date.now()}`,
      name: payload.name,
      url: payload.url,
      explorer: payload.explorer,
      faucet: payload.faucet,
      type: 'custom',
      chainType: 'xrpl',
      addedAt: Date.now(),
    }
    this.customNetworks.push(config)
    await this.persistCustomNetworks()
    return config
  }

  async removeCustomNetwork(networkId: string): Promise<void> {
    this.customNetworks = this.customNetworks.filter((n) => n.id !== networkId)
    await this.persistCustomNetworks()
    if (this.state.network === networkId) {
      await this.switchNetwork('testnet')
    }
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
      chainType: 'xrpl',
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

    const existingXrplHdCount = this.state.accounts.filter(
      (a) => a.type === 'hd' && a.chainType === 'xrpl',
    ).length
    const existingEvmHdCount = this.state.accounts.filter(
      (a) => a.type === 'hd' && a.chainType === 'evm',
    ).length

    const newXrplAccounts = deriveAccounts(data.mnemonic, existingXrplHdCount + count).slice(
      existingXrplHdCount,
    )
    const newEvmAccounts = deriveEvmAccounts(data.mnemonic, existingEvmHdCount + count).slice(
      existingEvmHdCount,
    )

    const labels = await this.cache.getAccountLabels()
    const result: Account[] = []

    for (const derived of newXrplAccounts) {
      const vaultAccount = derivedToVaultAccount(derived)
      data.accounts.push(vaultAccount)
      this.keyring.addAccount(vaultAccount)

      const label =
        labels[derived.address] ??
        `Account ${existingXrplHdCount + result.filter((a) => a.chainType === 'xrpl').length + 1}`
      const account: Account = {
        address: derived.address,
        label,
        type: 'hd',
        derivationPath: derived.derivationPath,
        publicKey: derived.publicKey,
        index: derived.index,
        chainType: 'xrpl',
      }

      this.state.accounts.push(account)
      result.push(account)
    }

    for (const derived of newEvmAccounts) {
      const vaultAccount = evmDerivedToVaultAccount(derived)
      data.accounts.push(vaultAccount)
      this.evmKeyring.addAccount(vaultAccount)

      const label =
        labels[derived.address] ??
        `EVM Account ${existingEvmHdCount + result.filter((a) => a.chainType === 'evm').length + 1}`
      const account: Account = {
        address: derived.address,
        label,
        type: 'hd',
        derivationPath: derived.derivationPath,
        publicKey: derived.publicKey,
        index: derived.index,
        chainType: 'evm',
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

  async getTokens(
    address?: string,
  ): Promise<{ tokens: TokenBalance[]; metadata: TokenMetadata[] }> {
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
    memos?: Array<{ type?: string; data: string }>
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
      memos: params.memos,
    })

    const prepared = await this.client.prepareTransaction(tx)
    const signed = this.keyring.sign(sender, prepared as never)
    const result = await this.client.submitTransaction(signed.tx_blob)

    return (result.result.tx_json?.hash as string) ?? signed.hash
  }

  // --- Phase 2: Transaction History ---

  async getTransactionHistory(marker?: unknown, limit?: number): Promise<TransactionHistoryPage> {
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

  // --- Phase 3: Settings ---

  async getSettings(): Promise<WalletSettings> {
    return this.settings.getSettings()
  }

  async updateSettings(partial: Partial<WalletSettings>): Promise<WalletSettings> {
    return this.settings.updateSettings(partial)
  }

  // --- Phase 4: NFTs ---

  async getNFTs(address?: string): Promise<NftBalance[]> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    try {
      const nfts = await this.nftClient.getAccountNFTs(addr)
      await this.cache.setCachedNFTs(addr, nfts)
      return nfts
    } catch {
      const cached = await this.cache.getCachedNFTs(addr)
      return cached ?? []
    }
  }

  async mintNFT(params: MintNftParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildMintNFT(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async burnNFT(tokenId: string): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildBurnNFT(sender, tokenId)
    return this.signAndSubmit(tx, sender)
  }

  async createNFTSellOffer(params: SellNftParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCreateSellOffer(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async createNFTBuyOffer(params: BuyNftParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCreateBuyOffer(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async acceptNFTOffer(offerId: string, isSellOffer: boolean): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildAcceptOffer(sender, offerId, isSellOffer)
    return this.signAndSubmit(tx, sender)
  }

  async cancelNFTOffer(offerIds: string[]): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCancelOffers(sender, offerIds)
    return this.signAndSubmit(tx, sender)
  }

  async getNFTOffers(tokenId: string): Promise<{ sell: NftOffer[]; buy: NftOffer[] }> {
    const [sell, buy] = await Promise.all([
      this.nftClient.getNFTSellOffers(tokenId),
      this.nftClient.getNFTBuyOffers(tokenId),
    ])
    return { sell, buy }
  }

  // --- Phase 4: DEX ---

  async getOrderBook(
    base: { currency: string; issuer?: string },
    quote: { currency: string; issuer?: string },
  ): Promise<OrderBook> {
    return this.dexClient.getOrderBook(base, quote)
  }

  async getAccountOffers(address?: string): Promise<DexOffer[]> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    return this.dexClient.getAccountOffers(addr)
  }

  async createDexOffer(params: CreateDexOfferParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildOfferCreate(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async cancelDexOffer(offerSequence: number): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildOfferCancel(sender, offerSequence)
    return this.signAndSubmit(tx, sender)
  }

  // --- Phase 4: Advanced ---

  async createEscrow(params: CreateEscrowParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCreateEscrow(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async finishEscrow(params: FinishEscrowParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildFinishEscrow(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async cancelEscrow(params: CancelEscrowParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCancelEscrow(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async createCheck(params: CreateCheckParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCreateCheck(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async cashCheck(params: CashCheckParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCashCheck(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async cancelCheck(params: CancelCheckParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildCancelCheck(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async updateAccountSettings(params: AccountSettingsParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildAccountSet(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  // --- Phase 6: Account Objects ---

  async getAccountEscrows(address?: string): Promise<EscrowRecord[]> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    const { objects } = await this.client.getAccountObjects(addr, 'escrow')
    return parseEscrows(objects)
  }

  async getAccountChecks(address?: string): Promise<CheckRecord[]> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    const { objects } = await this.client.getAccountObjects(addr, 'check')
    return parseChecks(objects)
  }

  // --- Phase 6: NFT Metadata ---

  async getNftMetadata(nftId: string, uri: string): Promise<NftMetadata> {
    return this.nftMetadataClient.fetchMetadata(nftId, uri)
  }

  // --- Change Auth Method ---

  async changeAuthMethod(
    method: AuthMethod,
    password?: string,
    credentialId?: string,
    prfKey?: string,
  ): Promise<void> {
    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')

    if (method === 'passkey') {
      if (!credentialId || !prfKey) {
        throw new Error('Passkey credential required')
      }
      await this.auth.setup(data, method, undefined, { credentialId, prfKey })
    } else {
      await this.auth.setup(data, method, password)
    }

    this.state.authMethod = method
    await this.persistState()
  }

  // --- Phase 6: Export Mnemonic ---

  async exportMnemonic(
    method: AuthMethod,
    password?: string,
    passkeyKey?: string,
  ): Promise<string> {
    let data: import('@otsu/types').VaultData | null

    if (method === 'passkey') {
      // For passkey, the user already authenticated via WebAuthn in the
      // popup before sending this message. Use cached vault data when
      // available. Fall back to vault decryption if the service worker
      // restarted and the cache was lost.
      data = this.auth.getVaultData()
      if (!data && passkeyKey) {
        data = await this.auth.unlock(method, password, passkeyKey)
      }
      if (!data) {
        throw new Error('Wallet session expired. Please lock and unlock to continue.')
      }
    } else {
      // For password, always re-verify to confirm the user knows it.
      data = await this.auth.unlock(method, password)
    }

    if (!data.mnemonic) {
      throw new Error('No mnemonic available (imported-only wallet)')
    }
    return data.mnemonic
  }

  // --- Phase 6: Transaction Status ---

  async getTransactionStatus(hash: string): Promise<{
    hash: string
    validated: boolean
    result: string
    ledgerIndex: number
  }> {
    return this.client.getTransaction(hash)
  }

  // --- Phase 3: Signing ---

  getKeyring(): Keyring {
    return this.keyring
  }

  getClient(): XrplClient {
    return this.client
  }

  // --- Smart Contracts ---

  async getContractInfo(address: string): Promise<ContractInfo> {
    return this.contractClient.getContractInfo(address)
  }

  async callContract(params: ContractCallParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = buildContractCall(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  // --- EVM Methods ---

  getEvmClient(): EvmClient | null {
    return this.evmClient
  }

  getEvmKeyring(): EvmKeyring {
    return this.evmKeyring
  }

  async evmGetBalance(address?: string): Promise<EvmBalanceInfo> {
    if (!this.evmClient?.isConnected) throw new Error('EVM client not connected')
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    return this.evmClient.getBalance(addr)
  }

  async evmSendTransaction(params: {
    to: string
    value?: string
    data?: string
    gasLimit?: string
  }): Promise<string> {
    if (!this.evmClient?.isConnected) throw new Error('EVM client not connected')
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const nonce = await this.evmClient.getNonce(sender)
    const feeData = await this.evmClient.getFeeData()

    const tx = this.evmClient.buildTransaction({
      to: params.to,
      value: params.value,
      data: params.data,
      gasLimit: params.gasLimit,
      nonce,
    })

    tx.maxFeePerGas = feeData.maxFeePerGas
    tx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas

    const signedTx = await this.evmKeyring.signTransaction(sender, tx)
    const response = await this.evmClient.sendRawTransaction(signedTx)
    return response.hash
  }

  async evmEstimateGas(params: { to: string; value?: string; data?: string }): Promise<string> {
    if (!this.evmClient?.isConnected) throw new Error('EVM client not connected')
    return this.evmClient.estimateGas({
      to: params.to,
      value: params.value ? evmParseEther(params.value) : undefined,
      data: params.data,
    })
  }

  async evmGetTokens(address?: string): Promise<Erc20Token[]> {
    if (!this.erc20Client) throw new Error('ERC-20 client not initialized')
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    return this.erc20Client.getTokenList(addr)
  }

  async evmAddToken(contractAddress: string): Promise<Erc20Token> {
    if (!this.erc20Client) throw new Error('ERC-20 client not initialized')
    const addr = this.state.activeAccount
    if (!addr) throw new Error('No active account')
    return this.erc20Client.getBalance(contractAddress, addr)
  }

  async evmCallContract(params: {
    contractAddress: string
    abi: string
    functionName: string
    args?: unknown[]
    value?: string
  }): Promise<string> {
    if (!this.evmClient?.isConnected) throw new Error('EVM client not connected')
    const config = this.getNetworkConfig(this.state.network)
    if (!config) throw new Error('No network config')

    const provider = new EvmJsonRpcProvider(config.url, config.chainId)
    const abi = JSON.parse(params.abi) as string[]
    const contract = new EvmContract(params.contractAddress, abi, provider)
    const data = contract.interface.encodeFunctionData(params.functionName, params.args ?? [])

    return this.evmSendTransaction({
      to: params.contractAddress,
      data,
      value: params.value,
    })
  }

  async evmGetTransactionHistory(address?: string): Promise<EvmTransactionReceipt[]> {
    if (!this.evmClient?.isConnected) throw new Error('EVM client not connected')
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    return this.evmClient.getTransactionHistory(addr)
  }

  // --- Bridge Methods ---

  async bridgeEstimate(direction: BridgeDirection, amount: string): Promise<BridgeEstimate> {
    if (!this.bridgeService) throw new Error('Bridge service not initialized')
    return this.bridgeService.estimateBridgeFee(direction, amount)
  }

  async bridgeTransfer(params: {
    direction: BridgeDirection
    amount: string
    sourceAddress: string
    destinationAddress: string
  }): Promise<BridgeTransaction> {
    if (!this.bridgeService) throw new Error('Bridge service not initialized')

    const estimate = await this.bridgeService.estimateBridgeFee(params.direction, params.amount)

    let sourceTxHash: string | undefined

    if (params.direction === 'xrpl-to-evm') {
      const memos = this.bridgeService.buildXrplBridgeMemo(params.destinationAddress)
      const gateway = this.bridgeService.gatewayAddresses.xrplGateway
      sourceTxHash = await this.sendPayment({
        destination: gateway,
        amount: params.amount,
        memos,
      })
    } else {
      sourceTxHash = await this.evmSendTransaction({
        to: this.bridgeService.gatewayAddresses.evmGateway,
        value: params.amount,
      })
    }

    const bridgeTx = this.bridgeService.createBridgeTransaction({
      direction: params.direction,
      sourceAddress: params.sourceAddress,
      destinationAddress: params.destinationAddress,
      sourceAmount: params.amount,
      destinationAmount: estimate.destinationAmount,
      sourceTxHash,
    })

    await this.cache.addBridgeTransaction(bridgeTx)
    return bridgeTx
  }

  async bridgeGetStatus(txHash: string): Promise<import('@otsu/types').BridgeStatus> {
    if (!this.bridgeService) throw new Error('Bridge service not initialized')
    return this.bridgeService.pollBridgeStatus(txHash)
  }

  async bridgeGetHistory(): Promise<BridgeTransaction[]> {
    return this.cache.getBridgeTransactions()
  }

  // --- Common transaction flow ---

  private async signAndSubmit(tx: Record<string, unknown>, sender: string): Promise<string> {
    const prepared = await this.client.prepareTransaction(tx)
    const signed = this.keyring.sign(sender, prepared as never)
    const result = await this.client.submitTransaction(signed.tx_blob)
    return (result.result.tx_json?.hash as string) ?? signed.hash
  }

  async resetWallet(): Promise<void> {
    await this.auth.reset()
    this.keyring.clear()
    this.evmKeyring.clear()
    this.state = {
      accounts: [],
      activeAccount: null,
      network: 'testnet',
      locked: true,
      authMethod: 'password',
    }
    try {
      await chrome.storage.local.remove(STATE_STORAGE_KEY)
    } catch {
      // Storage may not be available in tests
    }
  }

  // --- Persistence ---

  private async persistState(): Promise<void> {
    try {
      const persisted: PersistedState = {
        accounts: this.state.accounts,
        activeAccount: this.state.activeAccount,
        network: this.state.network,
        authMethod: this.state.authMethod,
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
        this.state.authMethod = persisted.authMethod ?? 'password'

        const config = this.getNetworkConfig(persisted.network)
        if (config?.chainType === 'evm') {
          if (!this.evmClient) {
            this.evmClient = new EvmClient()
          }
          this.evmClient.switchNetwork(config)
          this.erc20Client = Erc20Client.create(config.url, config.chainId)
        } else if (persisted.network !== 'testnet') {
          const custom = this.customNetworks.find((n) => n.id === persisted.network)
          if (custom) {
            await this.client.switchToConfig(custom)
          } else {
            await this.client.switchNetwork(persisted.network)
          }
        }
      }
    } catch {
      // Storage may not be available
    }
  }

  private async restoreCustomNetworks(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(CUSTOM_NETWORKS_KEY)
      this.customNetworks = (result[CUSTOM_NETWORKS_KEY] as CustomNetworkConfig[]) ?? []
    } catch {
      // Storage may not be available
    }
  }

  private async persistCustomNetworks(): Promise<void> {
    try {
      await chrome.storage.local.set({ [CUSTOM_NETWORKS_KEY]: this.customNetworks })
    } catch {
      // Storage may not be available in tests
    }
  }
}
