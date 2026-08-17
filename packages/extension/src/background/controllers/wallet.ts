import type {
  WalletState,
  VaultData,
  VaultAccount,
  VaultSeedSource,
  Account,
  AuthMethod,
  ChainType,
  SendPaymentPayload,
  SimulatePaymentPayload,
  SimulationResult,
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
  HardwareAccountCandidate,
  PrepareTransactionPayload,
  ConfirmTransactionPayload,
  TransactionReview,
  OwnedXrplAsset,
  SwapQuote,
  SwapQuoteRequest,
} from '@otsu/types'
import { NETWORKS, OtsuError, ErrorCodes } from '@otsu/constants'
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
  derivedToVaultAccount,
  importAccount as coreImportAccount,
  importedToVaultAccount,
  buildPayment,
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
  evmDerivedToVaultAccount,
  evmParseEther,
  EvmContract,
  EvmJsonRpcProvider,
  isEvmAddress,
  isValidXrplAddress,
  EvmTransaction,
  decodeXrplTransaction,
  compareExactDecimals,
  parseExactDecimal,
  transactionAmountValue,
  xrplAssetAmount,
  xrplAssetKey,
  xrplAssetSymbol,
} from '@otsu/core'
import { TransactionSimulator } from '../services/simulator'
import { AccountTransactionSigner, type PreparedEvmTransaction } from '../services/account-signer'

const STATE_STORAGE_KEY = 'otsu-wallet-state'
const CUSTOM_NETWORKS_KEY = 'otsu-custom-networks'
const VAULT_SCHEMA_VERSION = 2 as const
const TRANSACTION_REVIEW_TTL_MS = 3 * 60 * 1000
const SWAP_QUOTE_TTL_MS = 30 * 1000

type StoredTransactionReview =
  | {
      review: TransactionReview
      transaction: Record<string, unknown>
    }
  | {
      review: TransactionReview
      transaction: PreparedEvmTransaction
    }

function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ')
}

function addressesEqual(left: string, right: string, chainType: ChainType): boolean {
  return chainType === 'evm' ? left.toLowerCase() === right.toLowerCase() : left === right
}

function validateHardwareDerivationPath(account: HardwareAccountCandidate): void {
  const coinType = account.chainType === 'xrpl' ? '144' : '60'
  const match = account.derivationPath.match(new RegExp(`^m/44'/${coinType}'/(\\d+)'/0/0$`))
  if (!match || Number(match[1]) !== account.index) {
    throw new Error(`Invalid ${account.chainType.toUpperCase()} hardware derivation path`)
  }
}

function validateHardwareAddress(account: HardwareAccountCandidate): void {
  const valid =
    account.chainType === 'evm'
      ? isEvmAddress(account.address)
      : isValidXrplAddress(account.address)
  if (!valid) throw new Error(`Invalid ${account.chainType.toUpperCase()} hardware address`)
}

function newSourceId(): string {
  return crypto.randomUUID()
}

function formatAtomicUnits(value: bigint, decimals: number): string {
  const negative = value < 0n
  const absolute = negative ? -value : value
  const base = 10n ** BigInt(decimals)
  const whole = absolute / base
  const fraction = (absolute % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !['TxnSignature', 'SigningPubKey', 'Signers', 'hash'].includes(key))
      .sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

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
  private simulator = new TransactionSimulator()
  private nftMetadataClient: NftMetadataClient
  private contractClient: ContractClient
  private settings = new SettingsManager()
  private evmClient: EvmClient | null = null
  private evmKeyring = new EvmKeyring()
  private transactionSigner = new AccountTransactionSigner(this.keyring, this.evmKeyring)
  private transactionReviews = new Map<string, StoredTransactionReview>()
  private swapQuotes = new Map<string, SwapQuote>()
  private signingContextVersion = 0
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

  getSigningContextVersion(): number {
    return this.signingContextVersion
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

  private getXrpPriceOverride(): string | null {
    const network = this.getNetworkConfig(this.state.network)
    return network?.chainType === 'xrpl' && network.type !== 'mainnet' ? '1' : null
  }

  private accountCacheKey(address: string): string {
    return `${this.state.network}:${address}`
  }

  async createWallet(
    authMethod: AuthMethod,
    password?: string,
    existingMnemonic?: string,
    credentialId?: string,
    prfKey?: string,
  ): Promise<{ mnemonic: string; address: string }> {
    if (await this.auth.hasWallet()) {
      throw new Error('A wallet already exists')
    }

    const mnemonic = normalizeMnemonic(existingMnemonic ?? generateNewMnemonic())
    const sourceId = newSourceId()
    const source: VaultSeedSource = {
      id: sourceId,
      type: 'mnemonic',
      label: 'Wallet 1',
      mnemonic,
    }
    const derived = deriveAccount(mnemonic, 0)
    const vaultAccount: VaultAccount = {
      ...derivedToVaultAccount(derived),
      label: 'Wallet 1',
      seedSourceId: sourceId,
    }

    const evmDerived = deriveEvmAccount(mnemonic, 0)
    const evmVaultAccount: VaultAccount = {
      ...evmDerivedToVaultAccount(evmDerived),
      label: 'Wallet 1 · EVM',
      seedSourceId: sourceId,
    }

    const vaultData: VaultData = {
      schemaVersion: VAULT_SCHEMA_VERSION,
      seedSources: [source],
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
      label: vaultAccount.label ?? 'Wallet 1',
      type: 'hd',
      derivationPath: derived.derivationPath,
      publicKey: derived.publicKey,
      index: 0,
      chainType: 'xrpl',
      seedSourceId: sourceId,
    }

    const evmAccount: Account = {
      address: evmDerived.address,
      label: evmVaultAccount.label ?? 'Wallet 1 · EVM',
      type: 'hd',
      derivationPath: evmDerived.derivationPath,
      publicKey: evmDerived.publicKey,
      index: 0,
      chainType: 'evm',
      seedSourceId: sourceId,
    }

    this.state.accounts = [account, evmAccount]
    this.state.activeAccount = account.address
    this.state.locked = false
    this.state.authMethod = authMethod

    await this.persistState()
    await this.cache.setAccountLabel(account.address, account.label)

    return { mnemonic, address: account.address }
  }

  async createImportedWallet(
    payload: ImportPayload,
    authMethod: AuthMethod,
    password?: string,
    credentialId?: string,
    prfKey?: string,
  ): Promise<Account> {
    if (payload.format === 'mnemonic') {
      throw new Error('Recovery phrases must use the seed import flow')
    }
    if (await this.auth.hasWallet()) {
      throw new Error('A wallet already exists')
    }

    // Validate and derive before creating persistent storage. An invalid import
    // must never leave behind an unrelated generated wallet.
    const imported = coreImportAccount(payload)
    const label = payload.label?.trim() || 'Imported Wallet'
    const vaultAccount: VaultAccount = { ...importedToVaultAccount(imported), label }
    const vaultData: VaultData = {
      schemaVersion: VAULT_SCHEMA_VERSION,
      seedSources: [],
      accounts: [vaultAccount],
    }

    if (authMethod === 'passkey') {
      if (!credentialId || !prfKey) throw new Error('Passkey credential required')
      await this.auth.setup(vaultData, authMethod, undefined, { credentialId, prfKey })
    } else {
      await this.auth.setup(vaultData, authMethod, password)
    }

    this.keyring.load([vaultAccount])
    this.evmKeyring.load([])
    const account: Account = {
      address: imported.address,
      label,
      type: imported.type,
      derivationPath: imported.derivationPath,
      publicKey: imported.publicKey,
      index: imported.index,
      chainType: 'xrpl',
    }
    this.state.accounts = [account]
    this.state.activeAccount = account.address
    this.state.locked = false
    this.state.authMethod = authMethod

    await this.persistState()
    await this.cache.setAccountLabel(account.address, label)
    return account
  }

  async unlock(method: AuthMethod, password?: string, passkeyKey?: string): Promise<WalletState> {
    const persistedActiveAccount = this.state.activeAccount
    const unlockedData = await this.auth.unlock(method, password, passkeyKey)
    const labels = await this.cache.getAccountLabels()
    const { data, changed } = this.migrateVaultData(unlockedData, labels)
    if (changed) await this.auth.updateVaultData(data)

    const xrplAccounts = data.accounts.filter((a) => (a.chainType ?? 'xrpl') === 'xrpl')
    const evmAccounts = data.accounts.filter((a) => a.chainType === 'evm')

    this.keyring.load(xrplAccounts)
    this.evmKeyring.load(evmAccounts)

    this.state.accounts = data.accounts.map((a, i) => ({
      address: a.address,
      label:
        a.label ??
        labels[a.address] ??
        (a.chainType === 'evm' ? `EVM Account ${(a.index ?? 0) + 1}` : `Account ${i + 1}`),
      type: a.type,
      derivationPath: a.derivationPath,
      publicKey: a.publicKey,
      index: a.index,
      chainType: a.chainType ?? 'xrpl',
      seedSourceId: a.seedSourceId,
      hardware: a.hardware,
    }))

    this.state.activeAccount = this.state.accounts.some(
      (account) => account.address === persistedActiveAccount,
    )
      ? persistedActiveAccount
      : (this.state.accounts[0]?.address ?? null)
    this.state.locked = false

    await this.persistState()
    return this.getState()
  }

  private migrateVaultData(
    input: VaultData,
    labels: Record<string, string>,
  ): { data: VaultData; changed: boolean } {
    const data: VaultData = {
      ...input,
      seedSources: input.seedSources?.map((source) => ({ ...source })),
      accounts: input.accounts.map((account) => ({ ...account })),
    }
    let changed = data.schemaVersion !== VAULT_SCHEMA_VERSION || 'mnemonic' in data

    if (!data.seedSources) {
      data.seedSources = []
      changed = true
    }

    const legacyMnemonic = data.mnemonic ? normalizeMnemonic(data.mnemonic) : null
    let legacySource: VaultSeedSource | undefined
    if (legacyMnemonic) {
      legacySource = {
        id: 'primary',
        type: 'mnemonic',
        label: 'Wallet 1',
        mnemonic: legacyMnemonic,
      }
      data.seedSources.push(legacySource)
    }

    for (const account of data.accounts) {
      const chainType = account.chainType ?? 'xrpl'
      if (!account.chainType) {
        account.chainType = chainType
        changed = true
      }

      if (legacySource && account.type === 'hd' && !account.seedSourceId) {
        const index = account.index ?? 0
        const expectedAddress =
          chainType === 'evm'
            ? deriveEvmAccount(legacySource.mnemonic, index).address
            : deriveAccount(legacySource.mnemonic, index).address
        if (addressesEqual(account.address, expectedAddress, chainType)) {
          account.seedSourceId = legacySource.id
        } else {
          // Older versions discarded secondary mnemonic imports. Preserve their
          // signing key, but do not let them corrupt primary-seed derivation.
          account.type = 'imported'
        }
        changed = true
      }

      const fallbackLabel =
        chainType === 'evm' ? `EVM Account ${(account.index ?? 0) + 1}` : 'Account'
      const label = account.label ?? labels[account.address] ?? fallbackLabel
      if (account.label !== label) {
        account.label = label
        changed = true
      }
    }

    for (const source of data.seedSources) {
      const sourceXrplAccounts = data.accounts.filter(
        (account) =>
          account.seedSourceId === source.id &&
          account.type === 'hd' &&
          (account.chainType ?? 'xrpl') === 'xrpl',
      )
      for (const xrplAccount of sourceXrplAccounts) {
        const index = xrplAccount.index ?? 0
        const derived = deriveEvmAccount(source.mnemonic, index)
        const exists = data.accounts.some(
          (account) =>
            account.chainType === 'evm' && addressesEqual(account.address, derived.address, 'evm'),
        )
        if (!exists) {
          data.accounts.push({
            ...evmDerivedToVaultAccount(derived),
            label: `${source.label} · EVM${index === 0 ? '' : ` ${index + 1}`}`,
            seedSourceId: source.id,
          })
          changed = true
        }
      }
    }

    data.schemaVersion = VAULT_SCHEMA_VERSION
    delete data.mnemonic
    return { data, changed }
  }

  lock(): void {
    this.auth.lock()
    this.keyring.clear()
    this.evmKeyring.clear()
    this.invalidateSigningContext()
    this.state.locked = true
  }

  async getBalance(
    address?: string,
  ): Promise<{ available: string; total: string; reserved: string }> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    const balance = await this.client.getBalance(addr)

    await this.cache.setCachedBalance(this.accountCacheKey(addr), {
      available: balance.available,
      total: balance.total,
      reserved: balance.reserved,
    })

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
    const review = await this.prepareTransactionReview({
      intent: { chainType: 'xrpl', kind: 'payment', ...payload },
    })
    return this.confirmTransactionReview({ reviewId: review.reviewId })
  }

  async simulatePayment(payload: SimulatePaymentPayload): Promise<SimulationResult> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const transaction =
      payload.currency && payload.issuer
        ? buildTokenPayment({
            account: sender,
            destination: payload.destination,
            currency: payload.currency,
            issuer: payload.issuer,
            value: payload.amount,
            destinationTag: payload.destinationTag,
            memos: payload.memos,
          })
        : buildPayment({
            account: sender,
            destination: payload.destination,
            amount: payload.amount,
            destinationTag: payload.destinationTag,
            memos: payload.memos,
          })

    const ledgerResult = await this.client.request({
      command: 'simulate',
      tx_json: transaction,
      binary: false,
    })
    const simulatedTransaction =
      (ledgerResult.tx_json as Record<string, unknown> | undefined) ?? transaction
    const balance = await this.client.getBalance(sender)
    const preview = this.simulator.simulate(simulatedTransaction, balance.total)
    const engineResult = String(ledgerResult.engine_result ?? 'unknown')
    const engineResultMessage = String(
      ledgerResult.engine_result_message ?? 'The ledger did not return a simulation result.',
    )
    const affectedNodes =
      ((ledgerResult.meta as Record<string, unknown> | undefined)?.AffectedNodes as
        Array<Record<string, unknown>> | undefined) ?? []

    return {
      ...preview,
      success: engineResult === 'tesSUCCESS',
      engineResult,
      engineResultMessage,
      objectsCreated: affectedNodes.filter((node) => 'CreatedNode' in node).length,
      objectsDeleted: affectedNodes.filter((node) => 'DeletedNode' in node).length,
      error: engineResult === 'tesSUCCESS' ? undefined : engineResultMessage,
    }
  }

  async prepareTransactionReview(payload: PrepareTransactionPayload): Promise<TransactionReview> {
    const network = this.state.network
    const contextVersion = this.signingContextVersion
    const account = this.getActiveAccountForSigning(payload.intent.chainType)
    if (payload.intent.chainType !== this.currentChainType) {
      throw new Error(`Switch to a ${payload.intent.chainType.toUpperCase()} network first`)
    }

    const now = Date.now()
    for (const [reviewId, stored] of this.transactionReviews) {
      if (stored.review.expiresAt <= now) this.transactionReviews.delete(reviewId)
    }

    const stored =
      payload.intent.chainType === 'xrpl'
        ? await this.prepareXrplReview(account, payload, network)
        : await this.prepareEvmReview(account, payload, network)
    this.assertReviewPreparationContext(
      account.address,
      network,
      payload.intent.chainType,
      contextVersion,
    )
    this.transactionReviews.set(stored.review.reviewId, stored)
    return stored.review
  }

  async confirmTransactionReview(payload: ConfirmTransactionPayload): Promise<string> {
    const contextVersion = this.signingContextVersion
    const stored = this.transactionReviews.get(payload.reviewId)
    if (!stored) throw new Error('Transaction review expired. Review the transaction again.')

    // Consume before any device interaction or broadcast so a review cannot be replayed.
    this.transactionReviews.delete(payload.reviewId)
    const { review } = stored
    if (review.expiresAt <= Date.now()) {
      throw new Error('Transaction review expired. Review the transaction again.')
    }
    if (review.network !== this.state.network || review.account !== this.state.activeAccount) {
      throw new Error('Account or network changed. Review the transaction again.')
    }
    const account = this.getActiveAccountForSigning(review.chainType)
    const signingNetwork = review.network

    if (review.chainType === 'xrpl') {
      const transaction = stored.transaction as Record<string, unknown>
      const simulation = await this.simulatePreparedXrpl(transaction, account.address)
      if (!simulation.success) {
        throw new Error(simulation.error ?? 'XRPL simulation failed')
      }
      this.assertSigningContext(account.address, signingNetwork, 'xrpl', contextVersion)
      let signedBlob: string
      if (account.type === 'hardware') {
        if (!payload.externalSignedTransaction) {
          throw new Error('Confirm this transaction on your hardware wallet')
        }
        const decoded = decodeXrplTransaction(
          payload.externalSignedTransaction,
        ) as unknown as Record<string, unknown>
        if (
          decoded.Account !== account.address ||
          canonicalJson(decoded) !== canonicalJson(transaction)
        ) {
          throw new Error(
            'Hardware wallet signed a transaction different from the reviewed payload',
          )
        }
        signedBlob = payload.externalSignedTransaction
      } else {
        signedBlob = await this.transactionSigner.signXrpl(account, transaction)
      }
      this.assertSigningContext(account.address, signingNetwork, 'xrpl', contextVersion)
      const result = await this.client.submitTransaction(signedBlob)
      return this.acceptedXrplSubmissionHash(result)
    }

    if (!this.evmClient?.isConnected) throw new Error('EVM client not connected')
    const transaction = stored.transaction as PreparedEvmTransaction
    const simulation = await this.evmClient.simulateTransaction({
      ...transaction,
      from: account.address,
    })
    if (!simulation.success) throw new Error(simulation.error ?? 'EVM simulation failed')
    this.assertSigningContext(account.address, signingNetwork, 'evm', contextVersion)
    const signed = await this.transactionSigner.signEvm(
      account,
      transaction,
      payload.externalSignature,
    )
    this.assertSigningContext(account.address, signingNetwork, 'evm', contextVersion)
    const response = await this.evmClient.sendRawTransaction(signed)
    return response.hash
  }

  async prepareExternalXrplTransaction(
    transactionInput: Record<string, unknown>,
    expectedAccount: string,
  ): Promise<{ transaction: Record<string, unknown>; simulation: SimulationResult }> {
    const contextVersion = this.signingContextVersion
    const account = this.getActiveAccountForSigning('xrpl')
    const signingNetwork = this.state.network
    if (account.address !== expectedAccount) {
      throw new Error('The connected dApp account is no longer active')
    }
    if (transactionInput.Account && transactionInput.Account !== account.address) {
      throw new Error('The transaction account does not match the connected account')
    }
    const transaction = structuredClone(transactionInput)
    for (const field of ['TxnSignature', 'SigningPubKey', 'Signers', 'hash'])
      delete transaction[field]
    transaction.Account = account.address
    const prepared = await this.client.prepareTransaction(transaction)
    this.assertSigningContext(account.address, signingNetwork, 'xrpl', contextVersion)
    const simulation = await this.simulatePreparedXrpl(prepared, account.address)
    if (!simulation.success) throw new Error(simulation.error ?? 'XRPL simulation failed')
    this.assertSigningContext(account.address, signingNetwork, 'xrpl', contextVersion)
    return { transaction: prepared, simulation }
  }

  async signExternalXrplTransaction(
    transaction: Record<string, unknown>,
    submit: boolean,
  ): Promise<{ txBlob: string; hash: string }> {
    const contextVersion = this.signingContextVersion
    const account = this.getActiveAccountForSigning('xrpl')
    const signingNetwork = this.state.network
    if (transaction.Account !== account.address) {
      throw new Error('The reviewed transaction account is no longer active')
    }
    const simulation = await this.simulatePreparedXrpl(transaction, account.address)
    if (!simulation.success) throw new Error(simulation.error ?? 'XRPL simulation failed')
    this.assertSigningContext(account.address, signingNetwork, 'xrpl', contextVersion)
    if (account.type === 'hardware') {
      throw new Error('dApp hardware signing must be confirmed from the hardware review window')
    }
    const signed = this.keyring.sign(account.address, transaction as never)
    const txBlob = signed.tx_blob
    const decoded = decodeXrplTransaction(txBlob) as unknown as Record<string, unknown>
    if (canonicalJson(decoded) !== canonicalJson(transaction)) {
      throw new Error('Signed transaction differs from the reviewed payload')
    }
    this.assertSigningContext(account.address, signingNetwork, 'xrpl', contextVersion)
    if (!submit) return { txBlob, hash: signed.hash }
    const result = await this.client.submitTransaction(txBlob)
    const hash = this.acceptedXrplSubmissionHash(result)
    return { txBlob, hash }
  }

  private getActiveAccountForSigning(chainType: ChainType): Account {
    if (this.state.locked || !this.auth.isUnlocked) {
      this.auth.lock()
      this.keyring.clear()
      this.evmKeyring.clear()
      this.invalidateSigningContext()
      this.state.locked = true
      throw new Error('Wallet is locked')
    }
    const account = this.state.accounts.find((item) => item.address === this.state.activeAccount)
    if (!account) throw new Error('No active account')
    if (account.chainType !== chainType) {
      throw new Error(`Active account is not a ${chainType.toUpperCase()} account`)
    }
    return account
  }

  private assertSigningContext(
    accountAddress: string,
    network: string,
    chainType: ChainType,
    contextVersion?: number,
  ): Account {
    if (contextVersion !== undefined && contextVersion !== this.signingContextVersion) {
      throw new Error('Account or network changed. Review the transaction again.')
    }
    const account = this.getActiveAccountForSigning(chainType)
    if (account.address !== accountAddress || this.state.network !== network) {
      throw new Error('Account or network changed. Review the transaction again.')
    }
    return account
  }

  private assertReviewPreparationContext(
    accountAddress: string,
    network: string,
    chainType: ChainType,
    contextVersion: number,
  ): void {
    if (contextVersion !== this.signingContextVersion) {
      throw new Error('Account or network changed. Review the transaction again.')
    }
    this.assertSigningContext(accountAddress, network, chainType)
  }

  private invalidateSigningContext(): void {
    this.signingContextVersion += 1
    this.transactionReviews.clear()
    this.swapQuotes.clear()
  }

  private async prepareXrplReview(
    account: Account,
    payload: PrepareTransactionPayload,
    network: string,
  ): Promise<StoredTransactionReview> {
    const intent = payload.intent
    if (intent.chainType !== 'xrpl') throw new Error('Unsupported XRPL transaction intent')

    let transaction: Record<string, unknown>
    let title: string
    let description: string
    let details: TransactionReview['details']
    let destination: string | undefined
    let amount: string | undefined
    let asset: string | undefined

    if (intent.kind === 'payment') {
      if (Boolean(intent.currency) !== Boolean(intent.issuer)) {
        throw new Error('Issued-currency payments require both currency and issuer')
      }
      transaction =
        intent.currency && intent.issuer
          ? buildTokenPayment({
              account: account.address,
              destination: intent.destination,
              currency: intent.currency,
              issuer: intent.issuer,
              value: intent.amount,
              destinationTag: intent.destinationTag,
              memos: intent.memos,
            })
          : buildPayment({
              account: account.address,
              destination: intent.destination,
              amount: intent.amount,
              destinationTag: intent.destinationTag,
              memos: intent.memos,
            })
      destination = intent.destination
      amount = intent.currency ? intent.amount : formatAtomicUnits(BigInt(intent.amount), 6)
      asset = intent.currency ?? 'XRP'
      title = 'Review payment'
      description = 'Confirm the recipient and predicted balance changes.'
      details = [
        { label: 'To', value: intent.destination, monospace: true },
        { label: 'Amount', value: `${amount} ${asset}` },
      ]
      if (intent.destinationTag !== undefined) {
        details.push({ label: 'Destination tag', value: String(intent.destinationTag) })
      }
    } else if (intent.kind === 'trustline') {
      if (!/^(?:[A-Za-z0-9]{3}|[A-Fa-f0-9]{40})$/.test(intent.currency)) {
        throw new Error('Currency must be a 3-character code or 40-character hex value')
      }
      if (!isValidXrplAddress(intent.issuer) || intent.issuer === account.address) {
        throw new Error('Enter a valid issuer address')
      }
      if (intent.action === 'remove') {
        await this.assertTrustlineCanBeRemoved(account.address, intent.currency, intent.issuer)
        transaction = this.tokenClient.buildRemoveTrustline(
          account.address,
          intent.currency,
          intent.issuer,
        )
        title = 'Remove trustline'
        description = 'This removes the asset from your wallet and releases its owner reserve.'
      } else {
        if (!intent.limit || parseExactDecimal(intent.limit).coefficient <= 0n) {
          throw new Error('Trustline limit must be greater than zero')
        }
        transaction = this.tokenClient.buildSetTrustline(account.address, {
          currency: intent.currency,
          issuer: intent.issuer,
          limit: intent.limit,
        })
        title = 'Add trustline'
        description = 'This authorizes your account to hold the selected issued currency.'
      }
      asset = intent.currency
      details = [
        { label: 'Asset', value: intent.currency },
        { label: 'Issuer', value: intent.issuer, monospace: true },
        {
          label: 'Limit',
          value: intent.action === 'remove' ? '0' : String(intent.limit),
        },
      ]
    } else if (intent.kind === 'mpt-authorization') {
      if (!/^[A-Fa-f0-9]{48}$/.test(intent.issuanceId)) {
        throw new Error('MPT issuance ID must be 48 hexadecimal characters')
      }
      if (intent.action === 'unauthorize') {
        const holding = (await this.tokenClient.getMptTokens(account.address)).find(
          (item) => item.asset.type === 'mpt' && item.asset.issuanceId === intent.issuanceId,
        )
        if (!holding) throw new Error('MPT authorization not found')
        if (parseExactDecimal(holding.transactionBalance).coefficient !== 0n) {
          throw new Error('Move or trade the remaining MPT balance before removing it')
        }
        const offers = await this.dexClient.getAccountOffers(account.address)
        const issuanceId = intent.issuanceId.toUpperCase()
        const hasOpenOffer = offers.some((offer) =>
          [offer.takerGets, offer.takerPays].some(
            (amount) =>
              typeof amount !== 'string' &&
              'mpt_issuance_id' in amount &&
              amount.mpt_issuance_id.toUpperCase() === issuanceId,
          ),
        )
        if (hasOpenOffer) {
          throw new Error('Cancel open offers for this MPT before removing its authorization')
        }
      }
      transaction = {
        TransactionType: 'MPTokenAuthorize',
        Account: account.address,
        MPTokenIssuanceID: intent.issuanceId.toUpperCase(),
        ...(intent.action === 'unauthorize' ? { Flags: 1 } : {}),
      }
      title = intent.action === 'authorize' ? 'Add MPT' : 'Remove MPT'
      description =
        intent.action === 'authorize'
          ? 'This authorizes your account to hold this multi-purpose token.'
          : 'This removes the zero-balance MPT authorization from your account.'
      asset = `MPT ${intent.issuanceId.slice(0, 6)}`
      details = [
        { label: 'Asset', value: asset },
        { label: 'Issuance ID', value: intent.issuanceId.toUpperCase(), monospace: true },
      ]
    } else if (intent.kind === 'swap') {
      const quote = this.swapQuotes.get(intent.quoteId)
      if (!quote || quote.expiresAt <= Date.now()) throw new Error('Swap quote expired')
      this.swapQuotes.delete(intent.quoteId)
      if (quote.account !== account.address || quote.network !== network) {
        throw new Error('Account or network changed. Request a new swap quote.')
      }
      transaction = buildOfferCreate(account.address, {
        takerGets: quote.takerGets,
        takerPays: quote.takerPays,
        flags: quote.flags,
      })
      const fromSymbol = xrplAssetSymbol(quote.from)
      const toSymbol = xrplAssetSymbol(quote.to)
      title = 'Review swap'
      description = 'The order fills completely at the reviewed rate or is cancelled.'
      amount = quote.expectedOutput
      asset = toSymbol
      details = [
        { label: 'You pay', value: `${quote.inputAmount} ${fromSymbol}` },
        { label: 'Expected', value: `${quote.expectedOutput} ${toSymbol}` },
        { label: 'Minimum received', value: `${quote.minimumOutput} ${toSymbol}` },
        { label: 'Price impact', value: `${(quote.priceImpactBps / 100).toFixed(2)}%` },
        { label: 'Slippage', value: `${(quote.slippageBps / 100).toFixed(2)}%` },
      ]
    } else {
      throw new Error('Unsupported XRPL transaction intent')
    }

    const prepared = await this.client.prepareTransaction(transaction)
    const simulation = await this.simulatePreparedXrpl(prepared, account.address)
    const review: TransactionReview = {
      reviewId: crypto.randomUUID(),
      chainType: 'xrpl',
      account: account.address,
      network,
      expiresAt: Date.now() + TRANSACTION_REVIEW_TTL_MS,
      transactionType: String(prepared.TransactionType ?? 'Transaction'),
      destination,
      amount,
      asset,
      networkFee: formatAtomicUnits(BigInt(String(prepared.Fee ?? '0')), 6),
      simulation,
      title,
      description,
      details,
      hardwareProvider: account.hardware?.provider,
      derivationPath: account.derivationPath,
      deviceTransaction: account.type === 'hardware' ? prepared : undefined,
    }
    return { review, transaction: prepared }
  }

  private async simulatePreparedXrpl(
    transaction: Record<string, unknown>,
    sender: string,
  ): Promise<SimulationResult> {
    const ledgerResult = await this.client.request({
      command: 'simulate',
      tx_json: transaction,
      binary: false,
    })
    const engineResult = String(ledgerResult.engine_result ?? 'unknown')
    const engineResultMessage = String(
      ledgerResult.engine_result_message ?? 'The ledger did not return a simulation result.',
    )
    const simulatedTransaction = ledgerResult.tx_json as Record<string, unknown> | undefined
    if (
      engineResult === 'tesSUCCESS' &&
      simulatedTransaction &&
      canonicalJson(simulatedTransaction) !== canonicalJson(transaction)
    ) {
      throw new Error(
        'Ledger simulation returned a transaction different from the reviewed payload',
      )
    }
    const balance = await this.client.getBalance(sender)
    const preview = this.simulator.simulate(transaction, balance.total)
    const affectedNodes =
      ((ledgerResult.meta as Record<string, unknown> | undefined)?.AffectedNodes as
        Array<Record<string, unknown>> | undefined) ?? []
    return {
      ...preview,
      success: engineResult === 'tesSUCCESS',
      engineResult,
      engineResultMessage,
      objectsCreated: affectedNodes.filter((node) => 'CreatedNode' in node).length,
      objectsDeleted: affectedNodes.filter((node) => 'DeletedNode' in node).length,
      error: engineResult === 'tesSUCCESS' ? undefined : engineResultMessage,
    }
  }

  private async prepareEvmReview(
    account: Account,
    payload: PrepareTransactionPayload,
    network: string,
  ): Promise<StoredTransactionReview> {
    const intent = payload.intent
    if (intent.chainType !== 'evm' || intent.kind !== 'transaction') {
      throw new Error('Unsupported EVM transaction intent')
    }
    if (account.type === 'hardware' && intent.data && intent.data !== '0x') {
      throw new Error(
        'Hardware wallet contract interactions are not supported until the calldata can be safely reviewed.',
      )
    }
    if (!this.evmClient?.isConnected) throw new Error('EVM client not connected')
    const config = this.getNetworkConfig(network)
    if (!config?.chainId) throw new Error('EVM network is missing a chain ID')

    const nonce = await this.evmClient.getNonce(account.address)
    const feeData = await this.evmClient.getFeeData()
    const base = this.evmClient.buildTransaction({
      to: intent.to,
      value: intent.value,
      data: intent.data,
      gasLimit: intent.gasLimit,
      nonce,
    })
    const simulation = await this.evmClient.simulateTransaction({ ...base, from: account.address })
    const gasLimit = intent.gasLimit
      ? BigInt(intent.gasLimit)
      : simulation.gasEstimate
        ? BigInt(simulation.gasEstimate)
        : 0n
    const common = {
      to: intent.to,
      value: intent.value ? evmParseEther(intent.value) : 0n,
      data: intent.data ?? '0x',
      gasLimit,
      nonce,
      chainId: BigInt(config.chainId),
    }
    let transaction: PreparedEvmTransaction
    let maxFeePerGas: bigint
    if (feeData.maxFeePerGas !== null && feeData.maxPriorityFeePerGas !== null) {
      maxFeePerGas = feeData.maxFeePerGas
      transaction = {
        ...common,
        type: 2,
        maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      }
    } else if (feeData.gasPrice !== null) {
      maxFeePerGas = feeData.gasPrice
      transaction = { ...common, type: 0, gasPrice: feeData.gasPrice }
    } else {
      throw new Error('Network did not return usable EVM fee data')
    }
    const unsignedSerialized = EvmTransaction.from(transaction).unsignedSerialized
    const review: TransactionReview = {
      reviewId: crypto.randomUUID(),
      chainType: 'evm',
      account: account.address,
      network,
      expiresAt: Date.now() + TRANSACTION_REVIEW_TTL_MS,
      transactionType: intent.data && intent.data !== '0x' ? 'Contract interaction' : 'Transfer',
      destination: intent.to,
      amount: intent.value ?? '0',
      asset: 'XRP',
      networkFee: formatAtomicUnits(gasLimit * maxFeePerGas, 18),
      title: 'Review transaction',
      description: 'Confirm the destination, value, and simulated result.',
      details: [
        { label: 'To', value: intent.to, monospace: true },
        { label: 'Amount', value: `${intent.value ?? '0'} XRP` },
        { label: 'Network', value: config.name },
      ],
      simulation: {
        success: simulation.success,
        returnData: simulation.returnData,
        error: simulation.error,
      },
      unsignedSerialized,
      hardwareProvider: account.hardware?.provider,
      derivationPath: account.derivationPath,
    }
    return { review, transaction }
  }

  async switchNetwork(networkId: string): Promise<void> {
    this.invalidateSigningContext()
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
        const pairedAccount =
          this.state.accounts.find(
            (account) =>
              account.chainType === config.chainType &&
              currentAccount.seedSourceId !== undefined &&
              account.seedSourceId === currentAccount.seedSourceId &&
              account.index === currentAccount.index,
          ) ??
          this.state.accounts.find(
            (account) =>
              account.chainType === config.chainType &&
              currentAccount.hardware?.provider === 'trezor' &&
              account.hardware?.provider === currentAccount.hardware.provider &&
              account.hardware.deviceId !== undefined &&
              account.hardware.deviceId === currentAccount.hardware.deviceId &&
              account.index === currentAccount.index,
          )
        const matchingAccount =
          pairedAccount ??
          (currentAccount.type === 'hardware'
            ? undefined
            : this.state.accounts.find((account) => account.chainType === config.chainType))
        this.state.activeAccount = matchingAccount?.address ?? null
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

  async importSeed(
    mnemonicInput: string,
    requestedLabel?: string,
  ): Promise<{ xrpl: Account; evm: Account }> {
    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')

    const mnemonic = normalizeMnemonic(mnemonicInput)
    const xrplDerived = deriveAccount(mnemonic, 0)
    const evmDerived = deriveEvmAccount(mnemonic, 0)
    const existingSources = data.seedSources ?? []
    if (existingSources.some((source) => normalizeMnemonic(source.mnemonic) === mnemonic)) {
      throw new Error('Seed already exists')
    }
    if (
      this.state.accounts.some(
        (account) =>
          addressesEqual(account.address, xrplDerived.address, 'xrpl') ||
          addressesEqual(account.address, evmDerived.address, 'evm'),
      )
    ) {
      throw new Error('Account already exists')
    }

    const sourceId = newSourceId()
    const sourceLabel =
      requestedLabel?.trim().slice(0, 48) || `Wallet ${existingSources.length + 1}`
    const source: VaultSeedSource = {
      id: sourceId,
      type: 'mnemonic',
      label: sourceLabel,
      mnemonic,
    }
    const xrplVault: VaultAccount = {
      ...derivedToVaultAccount(xrplDerived),
      label: sourceLabel,
      seedSourceId: sourceId,
    }
    const evmVault: VaultAccount = {
      ...evmDerivedToVaultAccount(evmDerived),
      label: `${sourceLabel} · EVM`,
      seedSourceId: sourceId,
    }
    const nextData: VaultData = {
      ...data,
      schemaVersion: VAULT_SCHEMA_VERSION,
      seedSources: [...existingSources.map((item) => ({ ...item })), source],
      accounts: [...data.accounts.map((account) => ({ ...account })), xrplVault, evmVault],
    }
    delete nextData.mnemonic

    await this.auth.updateVaultData(nextData)

    const xrpl: Account = {
      address: xrplDerived.address,
      label: sourceLabel,
      type: 'hd',
      derivationPath: xrplDerived.derivationPath,
      publicKey: xrplDerived.publicKey,
      index: 0,
      chainType: 'xrpl',
      seedSourceId: sourceId,
    }
    const evm: Account = {
      address: evmDerived.address,
      label: `${sourceLabel} · EVM`,
      type: 'hd',
      derivationPath: evmDerived.derivationPath,
      publicKey: evmDerived.publicKey,
      index: 0,
      chainType: 'evm',
      seedSourceId: sourceId,
    }
    this.keyring.addAccount(xrplVault)
    this.evmKeyring.addAccount(evmVault)
    this.state.accounts.push(xrpl, evm)
    this.invalidateSigningContext()
    this.state.activeAccount = this.currentChainType === 'evm' ? evm.address : xrpl.address
    await this.persistState()
    await Promise.all([
      this.cache.setAccountLabel(xrpl.address, xrpl.label),
      this.cache.setAccountLabel(evm.address, evm.label),
    ])
    return { xrpl, evm }
  }

  async addHardwareAccounts(candidates: HardwareAccountCandidate[]): Promise<Account[]> {
    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')
    if (candidates.length === 0 || candidates.length > 10) {
      throw new Error('Select between 1 and 10 hardware accounts')
    }

    const seen = new Set<string>()
    for (const candidate of candidates) {
      validateHardwareDerivationPath(candidate)
      validateHardwareAddress(candidate)
      const key =
        candidate.chainType === 'evm' ? candidate.address.toLowerCase() : candidate.address
      if (seen.has(key)) throw new Error('Duplicate hardware account')
      seen.add(key)
      if (
        this.state.accounts.some((account) =>
          addressesEqual(account.address, candidate.address, candidate.chainType),
        )
      ) {
        throw new Error('Account already exists')
      }
    }

    const verifiedAt = Date.now()
    const vaultAccounts: VaultAccount[] = candidates.map((candidate) => ({
      address: candidate.address,
      publicKey: candidate.publicKey,
      label:
        candidate.label?.trim().slice(0, 48) ||
        `${candidate.provider === 'ledger' ? 'Ledger' : 'Trezor'} ${candidate.chainType.toUpperCase()} ${candidate.index + 1}`,
      derivationPath: candidate.derivationPath,
      type: 'hardware',
      index: candidate.index,
      chainType: candidate.chainType,
      hardware: {
        provider: candidate.provider,
        deviceId: candidate.deviceId,
        model: candidate.model,
        verifiedAt,
      },
    }))
    const nextData: VaultData = {
      ...data,
      accounts: [...data.accounts.map((account) => ({ ...account })), ...vaultAccounts],
    }
    await this.auth.updateVaultData(nextData)

    const accounts: Account[] = vaultAccounts.map((account) => ({
      address: account.address,
      label: account.label!,
      type: 'hardware',
      derivationPath: account.derivationPath,
      publicKey: account.publicKey,
      index: account.index,
      chainType: account.chainType!,
      hardware: account.hardware,
    }))
    this.state.accounts.push(...accounts)
    const active = accounts.find((account) => account.chainType === this.currentChainType)
    if (active) {
      this.invalidateSigningContext()
      this.state.activeAccount = active.address
    }
    await this.persistState()
    await Promise.all(
      accounts.map((account) => this.cache.setAccountLabel(account.address, account.label)),
    )
    return accounts
  }

  async importAccount(payload: ImportPayload): Promise<Account> {
    if (payload.format === 'mnemonic') {
      return (await this.importSeed(payload.value, payload.label)).xrpl
    }
    const imported = coreImportAccount(payload)

    const existing = this.state.accounts.find((a) => a.address === imported.address)
    if (existing) throw new Error('Account already exists')

    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')

    const label = payload.label ?? `Imported ${this.state.accounts.length + 1}`
    const vaultAccount: VaultAccount = { ...importedToVaultAccount(imported), label }
    const nextData: VaultData = {
      ...data,
      accounts: [...data.accounts.map((account) => ({ ...account })), vaultAccount],
    }
    await this.auth.updateVaultData(nextData)

    this.keyring.addAccount(vaultAccount)
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
    if (this.currentChainType === 'xrpl') {
      this.invalidateSigningContext()
      this.state.activeAccount = account.address
    }

    await this.persistState()
    await this.cache.setAccountLabel(account.address, label)

    return account
  }

  async deriveMoreAccounts(count: number, requestedSourceId?: string): Promise<Account[]> {
    if (!Number.isInteger(count) || count < 1 || count > 25) {
      throw new Error('Account count must be between 1 and 25')
    }
    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')
    const activeAccount = this.state.accounts.find(
      (account) => account.address === this.state.activeAccount,
    )
    const sourceId = requestedSourceId ?? activeAccount?.seedSourceId
    if (!sourceId) throw new Error('Select a seed-backed account to derive more accounts')
    const source = data.seedSources?.find((item) => item.id === sourceId)
    if (!source) throw new Error('Seed source not found')

    const existingIndexes = data.accounts
      .filter((account) => account.seedSourceId === sourceId && account.type === 'hd')
      .map((account) => account.index ?? 0)
    const nextIndex = existingIndexes.length > 0 ? Math.max(...existingIndexes) + 1 : 0
    const vaultAccounts: VaultAccount[] = []
    const result: Account[] = []

    for (let offset = 0; offset < count; offset++) {
      const index = nextIndex + offset
      const xrplDerived = deriveAccount(source.mnemonic, index)
      const evmDerived = deriveEvmAccount(source.mnemonic, index)
      const suffix = ` ${index + 1}`
      const xrplLabel = `${source.label}${suffix}`
      const evmLabel = `${source.label} · EVM${suffix}`
      const xrplVault: VaultAccount = {
        ...derivedToVaultAccount(xrplDerived),
        label: xrplLabel,
        seedSourceId: sourceId,
      }
      const evmVault: VaultAccount = {
        ...evmDerivedToVaultAccount(evmDerived),
        label: evmLabel,
        seedSourceId: sourceId,
      }
      vaultAccounts.push(xrplVault, evmVault)
      result.push(
        {
          address: xrplDerived.address,
          label: xrplLabel,
          type: 'hd',
          derivationPath: xrplDerived.derivationPath,
          publicKey: xrplDerived.publicKey,
          index,
          chainType: 'xrpl',
          seedSourceId: sourceId,
        },
        {
          address: evmDerived.address,
          label: evmLabel,
          type: 'hd',
          derivationPath: evmDerived.derivationPath,
          publicKey: evmDerived.publicKey,
          index,
          chainType: 'evm',
          seedSourceId: sourceId,
        },
      )
    }

    const nextData: VaultData = {
      ...data,
      accounts: [...data.accounts.map((account) => ({ ...account })), ...vaultAccounts],
    }
    await this.auth.updateVaultData(nextData)
    for (const account of vaultAccounts) {
      if (account.chainType === 'evm') this.evmKeyring.addAccount(account)
      else this.keyring.addAccount(account)
    }
    this.state.accounts.push(...result)
    await this.persistState()
    await Promise.all(
      result.map((account) => this.cache.setAccountLabel(account.address, account.label)),
    )

    return result
  }

  async setActiveAccount(address: string): Promise<void> {
    const account = this.state.accounts.find((a) => a.address === address)
    if (!account) throw new Error('Account not found')
    if (this.state.activeAccount === address) return
    this.invalidateSigningContext()
    this.state.activeAccount = address
    await this.persistState()
  }

  async updateAccountLabel(address: string, label: string): Promise<void> {
    const account = this.state.accounts.find((a) => a.address === address)
    if (!account) throw new Error('Account not found')
    const nextLabel = label.trim().slice(0, 48)
    if (!nextLabel) throw new Error('Account label is required')
    const data = this.auth.getVaultData()
    if (!data) throw new Error('Wallet is locked')
    const vaultAccount = data.accounts.find((item) => item.address === address)
    if (!vaultAccount) throw new Error('Account not found in vault')
    const nextData: VaultData = {
      ...data,
      accounts: data.accounts.map((item) =>
        item.address === address ? { ...item, label: nextLabel } : { ...item },
      ),
    }
    await this.auth.updateVaultData(nextData)
    account.label = nextLabel
    await this.persistState()
    await this.cache.setAccountLabel(address, nextLabel)
  }

  // --- Phase 2: Tokens ---

  async getTokens(
    address?: string,
  ): Promise<{ tokens: TokenBalance[]; metadata: TokenMetadata[] }> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')

    try {
      const tokens = await this.tokenClient.getAccountTokens(addr)
      await this.cache.setCachedTokens(this.accountCacheKey(addr), tokens)

      const metadata = await this.metadataClient.getTokenMetadataBatch(
        tokens.map((t) => ({ currency: t.currency, issuer: t.issuer })),
      )

      return { tokens, metadata }
    } catch {
      const cached = await this.cache.getCachedTokens(this.accountCacheKey(addr))
      return { tokens: cached ?? [], metadata: [] }
    }
  }

  async getOwnedAssets(address?: string): Promise<OwnedXrplAsset[]> {
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    const account = this.state.accounts.find((item) => item.address === addr)
    if (account?.chainType !== 'xrpl') throw new Error('Owned XRPL assets require an XRPL account')

    const [balance, tokenResult, mptTokens] = await Promise.all([
      this.getBalance(addr),
      this.getTokens(addr),
      this.tokenClient.getMptTokens(addr),
    ])
    const metadata = new Map(
      tokenResult.metadata.map((item) => [`${item.currency}:${item.issuer}`, item]),
    )
    const xrpAsset = { type: 'native' as const, currency: 'XRP' as const }
    const issuedAssets: OwnedXrplAsset[] = tokenResult.tokens.map((token) => {
      const asset = {
        type: 'issued' as const,
        currency: token.currency,
        issuer: token.issuer,
      }
      const tokenMetadata = metadata.get(`${token.currency}:${token.issuer}`)
      return {
        key: xrplAssetKey(asset),
        asset,
        symbol: tokenMetadata?.symbol || token.currency,
        name: tokenMetadata?.name || token.currency,
        balance: token.value,
        transactionBalance: token.value,
        authorized: token.authorized !== false,
        tradeable: token.authorized !== false && token.frozen !== true,
        disabledReason: token.disabledReason,
      }
    })

    return [
      {
        key: xrplAssetKey(xrpAsset),
        asset: xrpAsset,
        symbol: 'XRP',
        name: 'XRP',
        balance: formatAtomicUnits(BigInt(balance.available), 6),
        transactionBalance: balance.available,
        authorized: true,
        tradeable: true,
      },
      ...issuedAssets,
      ...mptTokens,
    ]
  }

  async setTrustline(params: TrustlineParams): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    const tx = this.tokenClient.buildSetTrustline(sender, params)
    return this.signAndSubmit(tx, sender)
  }

  async removeTrustline(currency: string, issuer: string): Promise<string> {
    const sender = this.state.activeAccount
    if (!sender) throw new Error('No active account')

    await this.assertTrustlineCanBeRemoved(sender, currency, issuer)
    const tx = this.tokenClient.buildRemoveTrustline(sender, currency, issuer)
    return this.signAndSubmit(tx, sender)
  }

  private async assertTrustlineCanBeRemoved(
    address: string,
    currency: string,
    issuer: string,
  ): Promise<void> {
    const tokens = await this.tokenClient.getAccountTokens(address)
    const token = tokens.find((item) => item.currency === currency && item.issuer === issuer)
    if (!token) throw new Error('Trustline not found')
    if (!/^-?0(?:\.0+)?$/.test(token.value.trim())) {
      throw new Error('Move or trade the remaining balance before removing this trustline')
    }
    const offers = await this.dexClient.getAccountOffers(address)
    const hasOpenOffer = offers.some((offer) =>
      [offer.takerGets, offer.takerPays].some(
        (amount) =>
          typeof amount !== 'string' &&
          'currency' in amount &&
          amount.currency === currency &&
          amount.issuer === issuer,
      ),
    )
    if (hasOpenOffer) {
      throw new Error('Cancel open offers for this asset before removing its trustline')
    }
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

    return this.signAndSubmit(tx, sender)
  }

  // --- Phase 2: Transaction History ---

  async getTransactionHistory(marker?: unknown, limit?: number): Promise<TransactionHistoryPage> {
    const addr = this.state.activeAccount
    if (!addr) throw new Error('No active account')

    try {
      const page = await this.historyClient.getTransactionHistory(addr, { marker, limit })

      if (!marker) {
        await this.cache.setCachedTransactions(this.accountCacheKey(addr), page.transactions)
      } else {
        await this.cache.appendCachedTransactions(this.accountCacheKey(addr), page.transactions)
      }

      return page
    } catch {
      const cached = await this.cache.getCachedTransactions(this.accountCacheKey(addr))
      return {
        transactions: cached ?? [],
        hasMore: false,
      }
    }
  }

  // --- Phase 2: Price ---

  async getXrpPrice(): Promise<string> {
    const fixedPrice = this.getXrpPriceOverride()
    if (fixedPrice) return fixedPrice

    try {
      const price = await this.priceClient.getXrpUsdPrice()
      if (Number.isFinite(Number(price)) && Number(price) > 0) {
        await this.cache.setCachedPrice(price)
        return price
      }

      const cached = await this.cache.getCachedPrice()
      return cached?.xrpUsd ?? '0'
    } catch {
      const cached = await this.cache.getCachedPrice()
      return cached?.xrpUsd ?? '0'
    }
  }

  // --- Phase 2: Cached Data ---

  async getCachedData(address?: string): Promise<{
    balance: import('@otsu/types').CachedBalance | null
    tokens: TokenBalance[] | null
    transactions: import('@otsu/types').TransactionRecord[] | null
    price: string | null
    lastUpdated: number | null
  }> {
    if (this.state.locked) throw new Error('Wallet is locked')
    const addr = address ?? this.state.activeAccount
    if (!addr) throw new Error('No active account')
    const cacheKey = this.accountCacheKey(addr)

    const [balance, tokens, transactions, price, lastUpdated] = await Promise.all([
      this.cache.getCachedBalance(cacheKey),
      this.cache.getCachedTokens(cacheKey),
      this.cache.getCachedTransactions(cacheKey),
      this.cache.getCachedPrice(),
      this.cache.getLastUpdated(cacheKey),
    ])

    return {
      balance,
      tokens,
      transactions,
      price: this.getXrpPriceOverride() ?? price?.xrpUsd ?? null,
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
      await this.cache.setCachedNFTs(this.accountCacheKey(addr), nfts)
      return nfts
    } catch {
      const cached = await this.cache.getCachedNFTs(this.accountCacheKey(addr))
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

  async getSwapQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    const account = this.getActiveAccountForSigning('xrpl')
    const assets = await this.getOwnedAssets(account.address)
    const from = assets.find((item) => item.key === xrplAssetKey(request.from))
    const to = assets.find((item) => item.key === xrplAssetKey(request.to))
    if (!from || !to) throw new Error('Add both assets to this wallet before swapping')
    if (!from.tradeable || !to.tradeable) throw new Error('This asset is not enabled for trading')

    const requestedAmount = xrplAssetAmount(from.asset, request.amount)
    if (from.transactionBalance.startsWith('-')) {
      throw new Error(`Insufficient ${from.symbol} balance`)
    }
    if (
      compareExactDecimals(
        parseExactDecimal(transactionAmountValue(requestedAmount)),
        parseExactDecimal(from.transactionBalance),
      ) > 0
    ) {
      throw new Error(`Insufficient ${from.symbol} balance`)
    }

    const now = Date.now()
    for (const [quoteId, quote] of this.swapQuotes) {
      if (quote.expiresAt <= now) this.swapQuotes.delete(quoteId)
    }
    const execution = await this.dexClient.getSwapQuote(
      {
        from: from.asset,
        to: to.asset,
        amount: request.amount,
        slippageBps: request.slippageBps,
      },
      account.address,
    )
    const quote: SwapQuote = {
      quoteId: crypto.randomUUID(),
      account: account.address,
      network: this.state.network,
      from: from.asset,
      to: to.asset,
      slippageBps: request.slippageBps,
      expiresAt: Date.now() + SWAP_QUOTE_TTL_MS,
      ...execution,
    }
    this.swapQuotes.set(quote.quoteId, quote)
    return quote
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
    address?: string,
    requestedSourceId?: string,
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

    const accountAddress = address ?? this.state.activeAccount
    const sourceId =
      requestedSourceId ??
      data.accounts.find((account) =>
        accountAddress
          ? addressesEqual(account.address, accountAddress, account.chainType ?? 'xrpl')
          : false,
      )?.seedSourceId
    const source = data.seedSources?.find((item) => item.id === sourceId)
    if (!source) throw new Error('This account does not have a recovery phrase')
    return source.mnemonic
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
    const account = this.getActiveAccountForSigning('evm')
    if (account.type === 'hardware') {
      throw new Error(
        'Use the Otsu Send screen to review and confirm hardware wallet transactions.',
      )
    }
    const review = await this.prepareTransactionReview({
      intent: { chainType: 'evm', kind: 'transaction', ...params },
    })
    return this.confirmTransactionReview({ reviewId: review.reviewId })
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

    const expectedSourceChain: 'xrpl' | 'evm' = params.direction === 'xrpl-to-evm' ? 'xrpl' : 'evm'
    const activeAccountAddress = this.state.activeAccount
    const activeAccount = this.state.accounts.find((a) => a.address === activeAccountAddress)
    const activeChain = activeAccount?.chainType ?? 'xrpl'
    if (activeChain !== expectedSourceChain) {
      throw new OtsuError(
        ErrorCodes.SIGNING_ERROR,
        `Active account is on ${activeChain}; switch to a ${expectedSourceChain} account before bridging`,
      )
    }
    if (activeAccount?.type === 'hardware') {
      throw new OtsuError(
        ErrorCodes.SIGNING_ERROR,
        'Hardware wallet bridge transfers are not supported yet.',
      )
    }

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
    const contextVersion = this.signingContextVersion
    const account = this.getActiveAccountForSigning('xrpl')
    if (account.address !== sender) throw new Error('Signing account is no longer active')
    if (account.type === 'hardware') {
      throw new Error(
        'This hardware wallet action is not supported yet. Use a reviewed transaction flow.',
      )
    }
    const signingNetwork = this.state.network
    const prepared = await this.client.prepareTransaction(tx)
    this.assertSigningContext(sender, signingNetwork, 'xrpl', contextVersion)
    const simulation = await this.simulatePreparedXrpl(prepared, sender)
    if (!simulation.success) throw new Error(simulation.error ?? 'XRPL simulation failed')
    this.assertSigningContext(sender, signingNetwork, 'xrpl', contextVersion)
    const signedBlob = await this.transactionSigner.signXrpl(account, prepared)
    this.assertSigningContext(sender, signingNetwork, 'xrpl', contextVersion)
    const result = await this.client.submitTransaction(signedBlob)
    return this.acceptedXrplSubmissionHash(result)
  }

  private acceptedXrplSubmissionHash(result: unknown): string {
    const envelope = result as { result?: Record<string, unknown> }
    const body = envelope.result ?? (result as Record<string, unknown>)
    const engineResult = String(body.engine_result ?? '')
    if (engineResult !== 'tesSUCCESS' && engineResult !== 'terQUEUED') {
      const message = String(
        body.engine_result_message ?? (engineResult || 'XRPL rejected the transaction'),
      )
      throw new Error(message)
    }
    const hash = (body.tx_json as Record<string, unknown> | undefined)?.hash
    if (typeof hash !== 'string' || !hash) throw new Error('XRPL did not return a transaction hash')
    return hash
  }

  async resetWallet(): Promise<void> {
    await this.auth.reset()
    await this.cache.clearAllCache()
    this.keyring.clear()
    this.evmKeyring.clear()
    this.invalidateSigningContext()
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
