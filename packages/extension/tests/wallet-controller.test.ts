import { describe, it, expect, vi, beforeEach } from 'vitest'
import './mocks/chrome'
import { resetChromeMock } from './mocks/chrome'
import type { VaultData, AuthMethod } from '@otsu/types'

// ---------------------------------------------------------------------------
// Module mocks — must be declared before any imports that pull in @otsu/core
// ---------------------------------------------------------------------------

// In-memory vault that replaces idb-keyval / VaultManager inside AuthManager.
// AuthManager is mocked entirely with a lightweight implementation that keeps
// its own in-memory store so we never touch IndexedDB.
const vaultStore: { data: VaultData | null } = { data: null }
const sessionStore: { unlocked: boolean; key: CryptoKey | null } = {
  unlocked: false,
  key: null,
}
const cloneVaultData = (data: VaultData): VaultData => structuredClone(data)

vi.mock('@otsu/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@otsu/core')>()

  // ---------- AuthManager mock ----------
  // Keeps real crypto derivation; replaces idb-keyval persistence with an
  // in-memory store so that the node test environment (no indexedDB) works.
  class MockAuthManager {
    get isUnlocked(): boolean {
      return sessionStore.unlocked
    }

    async hasWallet(): Promise<boolean> {
      return vaultStore.data !== null
    }

    async setup(vaultData: VaultData, _method: AuthMethod, _password?: string): Promise<void> {
      vaultStore.data = cloneVaultData(vaultData)
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ])
      sessionStore.key = key
      sessionStore.unlocked = true
    }

    async updateVaultData(vaultData: VaultData): Promise<void> {
      if (!sessionStore.unlocked) throw new Error('Wallet is locked')
      vaultStore.data = cloneVaultData(vaultData)
    }

    async unlock(_method: AuthMethod, _password?: string): Promise<VaultData> {
      if (!vaultStore.data) throw new Error('No vault found')
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ])
      sessionStore.key = key
      sessionStore.unlocked = true
      return cloneVaultData(vaultStore.data)
    }

    lock(): void {
      sessionStore.unlocked = false
      sessionStore.key = null
    }

    getVaultData(): VaultData | null {
      if (!sessionStore.unlocked) return null
      return vaultStore.data ? cloneVaultData(vaultStore.data) : null
    }

    setAutoLockMinutes(_minutes: number): void {
      // no-op in tests
    }
  }

  // ---------- Network clients ----------
  const makeMockXrplClient = () => ({
    isConnected: false,
    network: {
      id: 'testnet',
      name: 'Testnet',
      url: 'wss://s.altnet.rippletest.net:51233',
      type: 'testnet',
    },
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    switchNetwork: vi.fn().mockResolvedValue(undefined),
    getBalance: vi.fn().mockResolvedValue({
      total: '20000000',
      available: '10000000',
      reserved: '10000000',
      baseReserve: '10000000',
      ownerReserve: '0',
      ownerCount: 0,
    }),
    getAccountInfo: vi.fn().mockResolvedValue({
      address: 'rTestAddress',
      balance: '20000000',
      sequence: 1,
      ownerCount: 0,
      isActivated: true,
    }),
    getAccountLines: vi.fn().mockResolvedValue([]),
    getAccountTransactions: vi.fn().mockResolvedValue({
      transactions: [],
      marker: undefined,
    }),
    getBookOffers: vi.fn().mockResolvedValue([]),
    prepareTransaction: vi.fn().mockImplementation(async (tx: Record<string, unknown>) => ({
      ...tx,
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 1000,
    })),
    submitTransaction: vi.fn().mockResolvedValue({
      result: {
        engine_result: 'tesSUCCESS',
        tx_json: { hash: 'MOCK_TX_HASH_000000000000000000000001' },
      },
    }),
    fundWallet: vi.fn().mockResolvedValue({ balance: 1000 }),
    request: vi.fn().mockImplementation(async (request: Record<string, unknown>) => {
      if (request.command !== 'simulate') return {}
      const tx = request.tx_json as Record<string, unknown>
      return {
        engine_result: 'tesSUCCESS',
        engine_result_message: 'The simulated transaction would have been applied.',
        tx_json: { ...tx },
        meta: { AffectedNodes: [], TransactionResult: 'tesSUCCESS' },
      }
    }),
  })

  const makeMockPriceClient = () => ({
    getXrpUsdPrice: vi.fn().mockResolvedValue('2.50'),
  })

  const makeMockTokenClient = () => ({
    getAccountTokens: vi.fn().mockResolvedValue([]),
    getMptTokens: vi.fn().mockResolvedValue([]),
    buildSetTrustline: vi.fn().mockReturnValue({
      TransactionType: 'TrustSet',
      Account: 'rTestAddress',
      LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '1000' },
    }),
    buildRemoveTrustline: vi.fn().mockReturnValue({
      TransactionType: 'TrustSet',
      Account: 'rTestAddress',
      LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '0' },
    }),
  })

  const makeMockMetadataClient = () => ({
    getTokenMetadataBatch: vi.fn().mockResolvedValue([]),
  })

  const makeMockHistoryClient = () => ({
    getTransactionHistory: vi.fn().mockResolvedValue({
      transactions: [],
      hasMore: false,
      marker: undefined,
    }),
  })

  const makeMockNftClient = () => ({
    getAccountNFTs: vi.fn().mockResolvedValue([]),
    getNFTSellOffers: vi.fn().mockResolvedValue([]),
    getNFTBuyOffers: vi.fn().mockResolvedValue([]),
  })

  const makeMockDexClient = () => ({
    getOrderBook: vi.fn().mockResolvedValue({ bids: [], asks: [] }),
    getAccountOffers: vi.fn().mockResolvedValue([]),
    getSwapQuote: vi.fn().mockResolvedValue({
      inputAmount: '1',
      expectedOutput: '2',
      minimumOutput: '1.99',
      priceImpactBps: 0,
      takerGets: '1000000',
      takerPays: { currency: 'USD', issuer: 'rIssuer', value: '1.99' },
      flags: 0x000c0000,
    }),
  })

  return {
    ...actual,
    AuthManager: vi.fn().mockImplementation(() => new MockAuthManager()),
    XrplClient: vi.fn().mockImplementation(makeMockXrplClient),
    PriceClient: vi.fn().mockImplementation(makeMockPriceClient),
    TokenClient: vi.fn().mockImplementation(makeMockTokenClient),
    TokenMetadataClient: vi.fn().mockImplementation(makeMockMetadataClient),
    TransactionHistoryClient: vi.fn().mockImplementation(makeMockHistoryClient),
    NftClient: vi.fn().mockImplementation(makeMockNftClient),
    DexClient: vi.fn().mockImplementation(makeMockDexClient),
  }
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { WalletController } from '../src/background/controllers/wallet'
import {
  DexClient,
  deriveAccount,
  deriveEvmAccount,
  derivedToVaultAccount,
  Keyring,
  TokenClient,
} from '@otsu/core'

// A valid 24-word BIP-39 mnemonic for XRPL (deterministic)
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
const SECOND_TEST_MNEMONIC =
  'legal winner thank year wave sausage worth useful legal winner thank yellow'
const TEST_PASSWORD = 'test-password-123'

function createController(): WalletController {
  return new WalletController()
}

function resetVaultStore() {
  vaultStore.data = null
  sessionStore.unlocked = false
  sessionStore.key = null
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WalletController integration', () => {
  beforeEach(() => {
    resetChromeMock()
    resetVaultStore()
    vi.clearAllMocks()
  })

  describe('hardware accounts', () => {
    it('persists a Ledger EVM account without private key material', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const derived = deriveEvmAccount(SECOND_TEST_MNEMONIC, 0)

      const [account] = await controller.addHardwareAccounts([
        {
          provider: 'ledger',
          address: derived.address,
          publicKey: derived.publicKey,
          derivationPath: derived.derivationPath,
          chainType: 'evm',
          index: 0,
          model: 'Nano X',
        },
      ])

      expect(account.type).toBe('hardware')
      expect(account.hardware?.provider).toBe('ledger')
      const stored = vaultStore.data?.accounts.find((item) => item.address === derived.address)
      expect(stored?.privateKey).toBeUndefined()
      controller.lock()
      const restored = await controller.unlock('password', TEST_PASSWORD)
      expect(restored.accounts.find((item) => item.address === derived.address)?.type).toBe(
        'hardware',
      )
    })

    it('persists a Ledger XRPL account without private key material', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const derived = deriveAccount(SECOND_TEST_MNEMONIC, 0)

      const [account] = await controller.addHardwareAccounts([
        {
          provider: 'ledger',
          address: derived.address,
          publicKey: derived.publicKey,
          derivationPath: derived.derivationPath,
          chainType: 'xrpl',
          index: 0,
        },
      ])

      expect(account.type).toBe('hardware')
      expect(account.hardware?.provider).toBe('ledger')
      const stored = vaultStore.data?.accounts.find((item) => item.address === derived.address)
      expect(stored?.type).toBe('hardware')
      expect(stored).not.toHaveProperty('privateKey')
    })

    it('adds a verified Trezor pair and activates the account for the current chain', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('evm-testnet')
      const xrpl = deriveAccount(SECOND_TEST_MNEMONIC, 0)
      const evm = deriveEvmAccount(SECOND_TEST_MNEMONIC, 0)

      const accounts = await controller.addHardwareAccounts([
        {
          provider: 'trezor',
          address: xrpl.address,
          publicKey: xrpl.publicKey,
          derivationPath: xrpl.derivationPath,
          chainType: 'xrpl',
          index: 0,
          deviceId: 'trezor-device',
        },
        {
          provider: 'trezor',
          address: evm.address,
          publicKey: evm.publicKey,
          derivationPath: evm.derivationPath,
          chainType: 'evm',
          index: 0,
          deviceId: 'trezor-device',
        },
      ])

      expect(accounts).toHaveLength(2)
      expect(controller.getState().network).toBe('evm-testnet')
      expect(controller.getState().activeAccount).toBe(evm.address)
    })

    it('does not silently replace a Ledger account with a software account on chain switch', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const xrpl = deriveAccount(SECOND_TEST_MNEMONIC, 0)
      await controller.addHardwareAccounts([
        {
          provider: 'ledger',
          address: xrpl.address,
          publicKey: xrpl.publicKey,
          derivationPath: xrpl.derivationPath,
          chainType: 'xrpl',
          index: 0,
        },
      ])

      await controller.switchNetwork('evm-testnet')

      expect(controller.getState().activeAccount).toBeNull()
      const softwareEvm = controller
        .getState()
        .accounts.find((account) => account.chainType === 'evm' && account.type !== 'hardware')!
      await controller.setActiveAccount(softwareEvm.address)
      expect(controller.getState().activeAccount).toBe(softwareEvm.address)
    })

    it('rejects hardware EVM calldata until the contract action can be reviewed safely', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('evm-testnet')
      const evm = deriveEvmAccount(SECOND_TEST_MNEMONIC, 0)
      await controller.addHardwareAccounts([
        {
          provider: 'ledger',
          address: evm.address,
          publicKey: evm.publicKey,
          derivationPath: evm.derivationPath,
          chainType: 'evm',
          index: 0,
        },
      ])

      await expect(
        controller.prepareTransactionReview({
          intent: {
            chainType: 'evm',
            kind: 'transaction',
            to: '0x1111111111111111111111111111111111111111',
            data: '0xa9059cbb',
          },
        }),
      ).rejects.toThrow('calldata can be safely reviewed')
    })

    it('broadcasts only the exact XRPL transaction approved by a hardware wallet', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const derived = deriveAccount(SECOND_TEST_MNEMONIC, 0)
      await controller.addHardwareAccounts([
        {
          provider: 'ledger',
          address: derived.address,
          publicKey: derived.publicKey,
          derivationPath: derived.derivationPath,
          chainType: 'xrpl',
          index: 0,
        },
      ])
      const signer = new Keyring()
      signer.addAccount(derivedToVaultAccount(derived))

      const prepare = () =>
        controller.prepareTransactionReview({
          intent: {
            chainType: 'xrpl',
            kind: 'payment',
            destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
            amount: '12000000',
          },
        })
      const review = await prepare()
      const approved = signer.sign(derived.address, review.deviceTransaction as never)

      await expect(
        controller.confirmTransactionReview({
          reviewId: review.reviewId,
          externalSignedTransaction: approved.tx_blob,
        }),
      ).resolves.toBe('MOCK_TX_HASH_000000000000000000000001')

      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)?.value
      expect(xrplClient.submitTransaction).toHaveBeenCalledWith(approved.tx_blob)

      const tamperedReview = await prepare()
      const tampered = signer.sign(derived.address, {
        ...tamperedReview.deviceTransaction,
        Amount: '13000000',
      } as never)
      await expect(
        controller.confirmTransactionReview({
          reviewId: tamperedReview.reviewId,
          externalSignedTransaction: tampered.tx_blob,
        }),
      ).rejects.toThrow('different from the reviewed payload')
      expect(xrplClient.submitTransaction).toHaveBeenCalledTimes(1)
    })
  })

  describe('fresh imported wallets', () => {
    it('validates a raw secret before creating the vault', async () => {
      const controller = createController()

      await expect(
        controller.createImportedWallet(
          { format: 'secret_key', value: 'not-a-secret' },
          'password',
          TEST_PASSWORD,
        ),
      ).rejects.toThrow()

      expect(vaultStore.data).toBeNull()
      expect(controller.getState().accounts).toEqual([])
      await expect(controller.hasWallet()).resolves.toBe(false)
    })

    it('creates a vault containing only the imported account', async () => {
      const controller = createController()
      const account = await controller.createImportedWallet(
        { format: 'secret_key', value: 'sn259rEFXrQrWyx3Q7XneWcwV6dfL' },
        'password',
        TEST_PASSWORD,
      )

      expect(account.type).toBe('imported')
      expect(controller.getState().accounts).toEqual([account])
      expect(controller.getState().activeAccount).toBe(account.address)
      expect(vaultStore.data?.accounts).toHaveLength(1)
      expect(vaultStore.data?.seedSources).toEqual([])

      controller.lock()
      const restored = await controller.unlock('password', TEST_PASSWORD)
      expect(restored.accounts).toHaveLength(1)
      expect(restored.accounts[0].address).toBe(account.address)
    })
  })

  // -------------------------------------------------------------------------
  describe('full lifecycle: create -> lock -> unlock', () => {
    it('creates a wallet, returns the same mnemonic and an XRPL address', async () => {
      const controller = createController()

      const { mnemonic, address } = await controller.createWallet(
        'password',
        TEST_PASSWORD,
        TEST_MNEMONIC,
      )

      expect(mnemonic).toBe(TEST_MNEMONIC)
      expect(address).toMatch(/^r/)
    })

    it('state is unlocked and has one account after createWallet', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const state = controller.getState()
      expect(state.locked).toBe(false)
      expect(state.accounts).toHaveLength(2) // 1 XRPL + 1 EVM
      expect(state.accounts[0].type).toBe('hd')
      expect(state.activeAccount).toMatch(/^r/)
    })

    it('state is locked after calling lock()', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      controller.lock()

      expect(controller.getState().locked).toBe(true)
    })

    it('keyring is cleared after lock so signing throws', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const address = controller.getState().activeAccount!

      controller.lock()

      expect(() =>
        controller.getKeyring().sign(address, {
          TransactionType: 'Payment',
          Account: address,
          Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          Amount: '1000000',
          Sequence: 1,
          Fee: '12',
        } as never),
      ).toThrow()
    })

    it('restores accounts and returns unlocked state after unlock()', async () => {
      const controller = createController()
      const { address } = await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      controller.lock()

      const state = await controller.unlock('password', TEST_PASSWORD)

      expect(state.locked).toBe(false)
      expect(state.accounts[0].address).toBe(address)
      expect(state.activeAccount).toBe(address)
    })

    it('preserves the selected account through lock and unlock', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const derived = await controller.deriveMoreAccounts(1)
      const selected = derived.find((account) => account.chainType === 'xrpl')!
      await controller.setActiveAccount(selected.address)

      controller.lock()
      const state = await controller.unlock('password', TEST_PASSWORD)

      expect(state.activeAccount).toBe(selected.address)
    })

    it('persists state to chrome.storage.local on createWallet', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const calls = cm.storage.local.set.mock.calls
      const stateCall = calls.find(
        ([items]) => 'otsu-wallet-state' in (items as Record<string, unknown>),
      )
      expect(stateCall).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  describe('multi-account derivation', () => {
    it('derives one additional HD account from the same mnemonic', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const newAccounts = await controller.deriveMoreAccounts(1)

      expect(newAccounts).toHaveLength(2) // 1 XRPL + 1 EVM
      const xrplAccount = newAccounts.find((a) => a.address.startsWith('r'))!
      expect(xrplAccount.type).toBe('hd')
      expect(xrplAccount.index).toBe(1)
      expect(xrplAccount.address).toMatch(/^r/)
    })

    it('total account count grows after deriving more accounts', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await controller.deriveMoreAccounts(2)

      expect(controller.getState().accounts).toHaveLength(6) // 3 XRPL + 3 EVM
    })

    it('each derived account has a unique address', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await controller.deriveMoreAccounts(2)

      const addresses = controller.getState().accounts.map((a) => a.address)
      expect(new Set(addresses).size).toBe(addresses.length)
    })

    it('throws when wallet is locked during deriveMoreAccounts', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      controller.lock()

      await expect(controller.deriveMoreAccounts(1)).rejects.toThrow('Wallet is locked')
    })

    it('derived accounts follow BIP-44 XRPL path increments', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const derived = (await controller.deriveMoreAccounts(2)).filter(
        (account) => account.chainType === 'xrpl',
      )

      expect(derived[0].derivationPath).toContain('/1')
      expect(derived[1].derivationPath).toContain('/2')
    })
  })

  // -------------------------------------------------------------------------
  describe('import account flow', () => {
    it('adds a second seed as a paired XRPL and EVM wallet without replacing the first', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const originalAddresses = controller.getState().accounts.map((account) => account.address)

      const imported = await controller.importSeed(SECOND_TEST_MNEMONIC, 'Savings')

      expect(controller.getState().accounts).toHaveLength(4)
      expect(controller.getState().accounts.map((account) => account.address)).toEqual(
        expect.arrayContaining(originalAddresses),
      )
      expect(imported.xrpl.label).toBe('Savings')
      expect(imported.evm.label).toBe('Savings · EVM')
      expect(imported.xrpl.seedSourceId).toBe(imported.evm.seedSourceId)
      expect(imported.xrpl.seedSourceId).not.toBe(
        controller.getState().accounts.find((account) => account.address === originalAddresses[0])
          ?.seedSourceId,
      )
    })

    it('rejects a duplicate seed atomically', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.importSeed(SECOND_TEST_MNEMONIC)
      const beforeState = controller.getState()
      const beforeVault = structuredClone(vaultStore.data)

      await expect(
        controller.importSeed(`  ${SECOND_TEST_MNEMONIC.toUpperCase()}  `),
      ).rejects.toThrow('Seed already exists')

      expect(controller.getState()).toEqual(beforeState)
      expect(vaultStore.data).toEqual(beforeVault)
    })

    it('derives the next account from the selected seed source without skipping indexes', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const imported = await controller.importSeed(SECOND_TEST_MNEMONIC)

      const derived = await controller.deriveMoreAccounts(1, imported.xrpl.seedSourceId)

      expect(derived).toHaveLength(2)
      expect(derived.every((account) => account.index === 1)).toBe(true)
      expect(derived.every((account) => account.seedSourceId === imported.xrpl.seedSourceId)).toBe(
        true,
      )
    })

    it('restores every seed-backed account after lock and unlock', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.importSeed(SECOND_TEST_MNEMONIC)
      const addresses = controller.getState().accounts.map((account) => account.address)

      controller.lock()
      const restored = await controller.unlock('password', TEST_PASSWORD)

      expect(restored.accounts.map((account) => account.address)).toEqual(addresses)
      expect(new Set(restored.accounts.map((account) => account.seedSourceId)).size).toBe(2)
    })

    it('activates the imported seed account for the current chain without switching networks', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('evm-testnet')

      const imported = await controller.importSeed(SECOND_TEST_MNEMONIC)

      expect(controller.getState().network).toBe('evm-testnet')
      expect(controller.getState().activeAccount).toBe(imported.evm.address)
    })

    it('imports an account via secret_key format', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const imported = await controller.importAccount({
        format: 'secret_key',
        value: 'sn259rEFXrQrWyx3Q7XneWcwV6dfL',
        label: 'My Imported',
      })

      expect(imported.type).toBe('imported')
      expect(imported.label).toBe('My Imported')
      expect(imported.address).toMatch(/^r/)
    })

    it('imported account is added to the accounts list', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await controller.importAccount({
        format: 'secret_key',
        value: 'sn259rEFXrQrWyx3Q7XneWcwV6dfL',
      })

      expect(controller.getState().accounts).toHaveLength(3) // 2 XRPL (1 hd + 1 imported) + 1 EVM
    })

    it('imported account becomes the active account', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const imported = await controller.importAccount({
        format: 'secret_key',
        value: 'sn259rEFXrQrWyx3Q7XneWcwV6dfL',
      })

      expect(controller.getState().activeAccount).toBe(imported.address)
    })

    it('rejects importing a duplicate account', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await controller.importAccount({
        format: 'secret_key',
        value: 'sn259rEFXrQrWyx3Q7XneWcwV6dfL',
      })

      await expect(
        controller.importAccount({
          format: 'secret_key',
          value: 'sn259rEFXrQrWyx3Q7XneWcwV6dfL',
        }),
      ).rejects.toThrow('Account already exists')
    })

    it('throws when wallet is locked during importAccount', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      controller.lock()

      await expect(
        controller.importAccount({
          format: 'secret_key',
          value: 'sn259rEFXrQrWyx3Q7XneWcwV6dfL',
        }),
      ).rejects.toThrow('Wallet is locked')
    })
  })

  // -------------------------------------------------------------------------
  describe('network switching', () => {
    it('switches network and updates state', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await controller.switchNetwork('mainnet')

      expect(controller.getState().network).toBe('mainnet')
    })

    it('persists the new network to chrome.storage.local', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      vi.clearAllMocks()
      await controller.switchNetwork('devnet')

      expect(cm.storage.local.set).toHaveBeenCalled()
      const [items] = cm.storage.local.set.mock.calls[0] as [Record<string, unknown>]
      const persisted = items['otsu-wallet-state'] as { network: string }
      expect(persisted.network).toBe('devnet')
    })

    it('returns the full networks map', () => {
      const controller = createController()
      const networks = controller.getNetworks()

      expect(networks).toHaveProperty('predefined')
      expect(networks).toHaveProperty('custom')
      expect(networks.predefined).toHaveProperty('mainnet')
      expect(networks.predefined).toHaveProperty('testnet')
      expect(networks.predefined.mainnet.type).toBe('mainnet')
      expect(networks.predefined.testnet.type).toBe('testnet')
      expect(networks.custom).toEqual([])
    })

    it('defaults to testnet on a fresh controller', () => {
      const controller = createController()
      expect(controller.getState().network).toBe('testnet')
    })
  })

  // -------------------------------------------------------------------------
  describe('token fetch with mocked XrplClient', () => {
    it('returns empty token list for an account with no trustlines', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const result = await controller.getTokens()

      expect(result.tokens).toEqual([])
      expect(result.metadata).toEqual([])
    })

    it('caches the token result to chrome.storage.local after a successful fetch', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      vi.clearAllMocks()
      await controller.getTokens()

      expect(cm.storage.local.set).toHaveBeenCalled()
    })

    it('returns a fixed $1 XRP price on XRPL test networks', async () => {
      const { PriceClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const price = await controller.getXrpPrice()

      const priceClient = vi.mocked(PriceClient).mock.results.at(-1)?.value
      expect(price).toBe('1')
      expect(priceClient.getXrpUsdPrice).not.toHaveBeenCalled()
    })

    it('returns the live XRP price on mainnet', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('mainnet')

      await expect(controller.getXrpPrice()).resolves.toBe('2.50')
    })

    it('caches the price to chrome.storage.local after fetching', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('mainnet')

      vi.clearAllMocks()
      await controller.getXrpPrice()

      expect(cm.storage.local.set).toHaveBeenCalled()
    })

    it('falls back to cached price when price client throws', async () => {
      const { PriceClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('mainnet')

      // Prime the cache
      await controller.getXrpPrice()

      // Override to throw on subsequent calls
      vi.mocked(PriceClient).mockImplementation(() => ({
        getXrpUsdPrice: vi.fn().mockRejectedValue(new Error('Network error')),
      }))

      // New controller shares the same chrome mock storage (same module-level store)
      const controller2 = createController()
      await controller2.initialize()
      await controller2.unlock('password', TEST_PASSWORD)
      await controller2.switchNetwork('mainnet')

      const price = await controller2.getXrpPrice()
      expect(price).toBe('2.50')
    })

    it('keeps a valid cached price when the live order book returns zero', async () => {
      const { PriceClient } = await import('@otsu/core')
      vi.mocked(PriceClient).mockImplementation(() => ({
        getXrpUsdPrice: vi.fn().mockResolvedValue('2.50'),
      }))
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('mainnet')
      await controller.getXrpPrice()

      vi.mocked(PriceClient).mockImplementation(() => ({
        getXrpUsdPrice: vi.fn().mockResolvedValue('0'),
      }))
      const controller2 = createController()
      await controller2.initialize()
      await controller2.unlock('password', TEST_PASSWORD)
      await controller2.switchNetwork('mainnet')

      await expect(controller2.getXrpPrice()).resolves.toBe('2.50')
    })

    it('throws when no active account on getTokens', async () => {
      const controller = createController()
      await expect(controller.getTokens()).rejects.toThrow('No active account')
    })
  })

  describe('owned assets and reviewed asset operations', () => {
    it('combines spendable XRP, trustlines, and MPT holdings', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const tokenClient = vi.mocked(TokenClient).mock.results.at(-1)!.value
      vi.mocked(tokenClient.getAccountTokens).mockResolvedValueOnce([
        {
          currency: 'USD',
          issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          value: '4.5',
          limit: '1000',
          noRipple: true,
        },
      ])
      vi.mocked(tokenClient.getMptTokens).mockResolvedValueOnce([
        {
          key: `mpt:${'A'.repeat(48)}`,
          asset: { type: 'mpt', issuanceId: 'A'.repeat(48), assetScale: 2 },
          symbol: 'MPT AAAAAA',
          name: 'MPT AAAAAA',
          balance: '1.25',
          transactionBalance: '125',
          authorized: true,
          tradeable: true,
        },
      ])

      const assets = await controller.getOwnedAssets()

      expect(assets.map((asset) => [asset.asset.type, asset.balance])).toEqual([
        ['native', '10'],
        ['issued', '4.5'],
        ['mpt', '1.25'],
      ])
    })

    it('prepares and simulates trustline authorization through the generic review', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const review = await controller.prepareTransactionReview({
        intent: {
          chainType: 'xrpl',
          kind: 'trustline',
          action: 'add',
          currency: 'USD',
          issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          limit: '1000',
        },
      })

      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value
      expect(review).toMatchObject({
        title: 'Add trustline',
        transactionType: 'TrustSet',
        simulation: { success: true },
      })
      expect(xrplClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'simulate',
          tx_json: expect.objectContaining({ TransactionType: 'TrustSet' }),
        }),
      )
      expect(xrplClient.submitTransaction).not.toHaveBeenCalled()
    })

    it('blocks removing a trustline that still has a balance', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const tokenClient = vi.mocked(TokenClient).mock.results.at(-1)!.value
      vi.mocked(tokenClient.getAccountTokens).mockResolvedValueOnce([
        {
          currency: 'USD',
          issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          value: '1',
          limit: '1000',
          noRipple: true,
        },
      ])

      await expect(
        controller.prepareTransactionReview({
          intent: {
            chainType: 'xrpl',
            kind: 'trustline',
            action: 'remove',
            currency: 'USD',
            issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          },
        }),
      ).rejects.toThrow('remaining balance')
    })

    it('blocks removing an MPT referenced by an open offer', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const issuanceId = 'A'.repeat(48)
      const tokenClient = vi.mocked(TokenClient).mock.results.at(-1)!.value
      vi.mocked(tokenClient.getMptTokens).mockResolvedValueOnce([
        {
          key: `mpt:${issuanceId}`,
          asset: { type: 'mpt', issuanceId, assetScale: 0 },
          symbol: 'MPT',
          name: 'MPT',
          balance: '0',
          transactionBalance: '0',
          authorized: true,
          tradeable: true,
        },
      ])
      const dexClient = vi.mocked(DexClient).mock.results.at(-1)!.value
      vi.mocked(dexClient.getAccountOffers).mockResolvedValueOnce([
        {
          seq: 1,
          takerGets: { mpt_issuance_id: issuanceId, value: '10' },
          takerPays: '1000000',
          flags: 0,
        },
      ])

      await expect(
        controller.prepareTransactionReview({
          intent: {
            chainType: 'xrpl',
            kind: 'mpt-authorization',
            action: 'unauthorize',
            issuanceId,
          },
        }),
      ).rejects.toThrow('Cancel open offers')
    })

    it('binds an executable quote to an OfferCreate review and simulates it', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const tokenClient = vi.mocked(TokenClient).mock.results.at(-1)!.value
      vi.mocked(tokenClient.getAccountTokens).mockResolvedValue([
        {
          currency: 'USD',
          issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          value: '5',
          limit: '1000',
          noRipple: true,
        },
      ])
      const dexClient = vi.mocked(DexClient).mock.results.at(-1)!.value
      vi.mocked(dexClient.getSwapQuote).mockResolvedValueOnce({
        inputAmount: '1',
        expectedOutput: '2',
        minimumOutput: '1.99',
        priceImpactBps: 0,
        takerGets: '1000000',
        takerPays: {
          currency: 'USD',
          issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          value: '1.99',
        },
        flags: 0x000c0000,
      })
      const quote = await controller.getSwapQuote({
        from: { type: 'native', currency: 'XRP' },
        to: {
          type: 'issued',
          currency: 'USD',
          issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        },
        amount: '1',
        slippageBps: 50,
      })

      const review = await controller.prepareTransactionReview({
        intent: { chainType: 'xrpl', kind: 'swap', quoteId: quote.quoteId },
      })

      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value
      expect(review).toMatchObject({
        title: 'Review swap',
        transactionType: 'OfferCreate',
        simulation: { success: true },
      })
      expect(xrplClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'simulate',
          tx_json: expect.objectContaining({
            TransactionType: 'OfferCreate',
            Flags: 0x000c0000,
          }),
        }),
      )
    })
  })

  describe('payment simulation', () => {
    it('previews an XRP payment through the ledger simulate RPC without submitting it', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const result = await controller.simulatePayment({
        destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
        amount: '12000000',
      })

      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)?.value
      expect(xrplClient.request).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'simulate', binary: false }),
      )
      expect(xrplClient.submitTransaction).not.toHaveBeenCalled()
      expect(result).toMatchObject({
        success: true,
        engineResult: 'tesSUCCESS',
        fee: '0.000012',
      })
      expect(result.balanceChanges[0]).toMatchObject({ currency: 'XRP', delta: '-12.000000' })
    })

    it('re-simulates the exact reviewed XRPL payload before one-time confirmation', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const review = await controller.prepareTransactionReview({
        intent: {
          chainType: 'xrpl',
          kind: 'payment',
          destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          amount: '12000000',
        },
      })
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)?.value
      const reviewedPayload = xrplClient.request.mock.calls[0][0].tx_json

      const hash = await controller.confirmTransactionReview({ reviewId: review.reviewId })

      expect(hash).toBe('MOCK_TX_HASH_000000000000000000000001')
      expect(xrplClient.request).toHaveBeenCalledTimes(2)
      expect(xrplClient.request.mock.calls[1][0].tx_json).toEqual(reviewedPayload)
      expect(xrplClient.submitTransaction).toHaveBeenCalledOnce()
      await expect(
        controller.confirmTransactionReview({ reviewId: review.reviewId }),
      ).rejects.toThrow('expired')
    })

    it('discards a review prepared while the network context changes and returns', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value
      let releaseSimulation!: () => void
      xrplClient.request.mockImplementationOnce(
        (request: Record<string, unknown>) =>
          new Promise((resolve) => {
            releaseSimulation = () =>
              resolve({
                engine_result: 'tesSUCCESS',
                engine_result_message: 'Success',
                tx_json: request.tx_json,
                meta: { AffectedNodes: [] },
              })
          }),
      )

      const preparation = controller.prepareTransactionReview({
        intent: {
          chainType: 'xrpl',
          kind: 'payment',
          destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          amount: '1000000',
        },
      })
      await vi.waitFor(() => expect(releaseSimulation).toBeTypeOf('function'))
      await controller.switchNetwork('mainnet')
      await controller.switchNetwork('testnet')
      releaseSimulation()

      await expect(preparation).rejects.toThrow('Account or network changed')
    })

    it('does not sign or submit when the confirmation simulation fails', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const review = await controller.prepareTransactionReview({
        intent: {
          chainType: 'xrpl',
          kind: 'payment',
          destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          amount: '12000000',
        },
      })
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)?.value
      xrplClient.request.mockResolvedValueOnce({
        engine_result: 'tecPATH_DRY',
        engine_result_message: 'Path could not send partial amount.',
        tx_json: {},
        meta: { AffectedNodes: [] },
      })

      await expect(
        controller.confirmTransactionReview({ reviewId: review.reviewId }),
      ).rejects.toThrow('Path could not send partial amount')
      expect(xrplClient.submitTransaction).not.toHaveBeenCalled()
    })

    it('rejects a ledger submission result that was not accepted', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const review = await controller.prepareTransactionReview({
        intent: {
          chainType: 'xrpl',
          kind: 'payment',
          destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          amount: '1000000',
        },
      })
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value
      xrplClient.submitTransaction.mockResolvedValueOnce({
        result: {
          engine_result: 'tecUNFUNDED_PAYMENT',
          engine_result_message: 'Insufficient XRP balance.',
          tx_json: { hash: 'REJECTED_HASH' },
        },
      })

      await expect(
        controller.confirmTransactionReview({ reviewId: review.reviewId }),
      ).rejects.toThrow('Insufficient XRP balance')
    })

    it('does not sign when the active account changes during confirmation simulation', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const original = controller.getState().activeAccount!
      const imported = await controller.importSeed(
        'legal winner thank year wave sausage worth useful legal winner thank yellow',
        'Second wallet',
      )
      await controller.setActiveAccount(original)
      const review = await controller.prepareTransactionReview({
        intent: {
          chainType: 'xrpl',
          kind: 'payment',
          destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          amount: '1000000',
        },
      })
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value
      const reviewedPayload = xrplClient.request.mock.calls.at(-1)![0].tx_json
      let releaseSimulation!: () => void
      xrplClient.request.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseSimulation = () =>
              resolve({
                engine_result: 'tesSUCCESS',
                engine_result_message: 'Success',
                tx_json: reviewedPayload,
                meta: { AffectedNodes: [] },
              })
          }),
      )

      const confirmation = controller.confirmTransactionReview({ reviewId: review.reviewId })
      await vi.waitFor(() => expect(releaseSimulation).toBeTypeOf('function'))
      await controller.setActiveAccount(imported.xrpl.address)
      releaseSimulation()

      await expect(confirmation).rejects.toThrow('Account or network changed')
      expect(xrplClient.submitTransaction).not.toHaveBeenCalled()
    })

    it('does not sign when the network changes and returns during confirmation simulation', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const review = await controller.prepareTransactionReview({
        intent: {
          chainType: 'xrpl',
          kind: 'payment',
          destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          amount: '1000000',
        },
      })
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value
      const reviewedPayload = xrplClient.request.mock.calls.at(-1)![0].tx_json
      let releaseSimulation!: () => void
      xrplClient.request.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            releaseSimulation = () =>
              resolve({
                engine_result: 'tesSUCCESS',
                engine_result_message: 'Success',
                tx_json: reviewedPayload,
                meta: { AffectedNodes: [] },
              })
          }),
      )

      const confirmation = controller.confirmTransactionReview({ reviewId: review.reviewId })
      await vi.waitFor(() => expect(releaseSimulation).toBeTypeOf('function'))
      await controller.switchNetwork('mainnet')
      await controller.switchNetwork('testnet')
      releaseSimulation()

      await expect(confirmation).rejects.toThrow('Account or network changed')
      expect(xrplClient.submitTransaction).not.toHaveBeenCalled()
    })

    it('prepares and re-simulates the exact dApp transaction before signing', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      const account = controller.getState().activeAccount!

      const prepared = await controller.prepareExternalXrplTransaction(
        {
          TransactionType: 'Payment',
          Account: account,
          Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
          Amount: '1000000',
        },
        account,
      )
      const signed = await controller.signExternalXrplTransaction(prepared.transaction, false)
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value

      expect(prepared.simulation.success).toBe(true)
      expect(signed.txBlob).toMatch(/^[A-F0-9]+$/)
      expect(signed.hash).toHaveLength(64)
      expect(xrplClient.request).toHaveBeenCalledTimes(2)
      expect(xrplClient.request.mock.calls[1][0].tx_json).toEqual(prepared.transaction)
      expect(xrplClient.submitTransaction).not.toHaveBeenCalled()
    })

    it('rejects a dApp transaction targeting a different account before simulation', async () => {
      const { XrplClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await expect(
        controller.prepareExternalXrplTransaction(
          {
            TransactionType: 'Payment',
            Account: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
            Destination: 'rHJTqWTmDwUj3xpScH8J3YseG3kAHbYpgB',
            Amount: '1000000',
          },
          controller.getState().activeAccount!,
        ),
      ).rejects.toThrow('does not match the connected account')
      const xrplClient = vi.mocked(XrplClient).mock.results.at(-1)!.value
      expect(xrplClient.request).not.toHaveBeenCalled()
    })
  })

  describe('cached portfolio hydration', () => {
    it('isolates cached account data by XRPL network', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.getBalance()

      await expect(controller.getCachedData()).resolves.toMatchObject({
        balance: { total: '20000000', available: '10000000', reserved: '10000000' },
        price: '1',
      })

      await controller.switchNetwork('mainnet')
      await expect(controller.getCachedData()).resolves.toMatchObject({ balance: null })
    })

    it('does not expose cached portfolio data while the wallet is locked', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.getBalance()
      controller.lock()

      await expect(controller.getCachedData()).rejects.toThrow('Wallet is locked')
    })
  })

  // -------------------------------------------------------------------------
  describe('transaction history with pagination', () => {
    it('returns empty history when no transactions exist', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const page = await controller.getTransactionHistory()

      expect(page.transactions).toEqual([])
      expect(page.hasMore).toBe(false)
    })

    it('returns populated history when the client returns transactions', async () => {
      const { TransactionHistoryClient } = await import('@otsu/core')

      const txRecord = {
        hash: 'AAAA0000000000000000000000000000000000000000000000000000000000000001',
        type: 'Payment' as const,
        direction: 'sent' as const,
        account: 'rSender',
        destination: 'rRecipient',
        amount: { currency: 'XRP', value: '1000000' },
        fee: '12',
        timestamp: 1700000000000,
        ledgerIndex: 42000000,
        sequence: 1,
        result: 'tesSUCCESS',
        successful: true,
      }

      vi.mocked(TransactionHistoryClient).mockImplementation(() => ({
        getTransactionHistory: vi.fn().mockResolvedValue({
          transactions: [txRecord],
          hasMore: false,
          marker: undefined,
        }),
      }))

      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const page = await controller.getTransactionHistory()

      expect(page.transactions).toHaveLength(1)
      expect(page.transactions[0].hash).toBe(txRecord.hash)
      expect(page.hasMore).toBe(false)
    })

    it('passes marker and limit to the history client', async () => {
      const { TransactionHistoryClient } = await import('@otsu/core')
      const mockGetHistory = vi.fn().mockResolvedValue({
        transactions: [],
        hasMore: false,
        marker: undefined,
      })

      vi.mocked(TransactionHistoryClient).mockImplementation(() => ({
        getTransactionHistory: mockGetHistory,
      }))

      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const marker = { ledger: 41000000, seq: 5 }
      await controller.getTransactionHistory(marker, 10)

      expect(mockGetHistory).toHaveBeenCalledWith(
        expect.stringMatching(/^r/),
        expect.objectContaining({ marker, limit: 10 }),
      )
    })

    it('writes to cache after fetching the first page', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      vi.clearAllMocks()
      await controller.getTransactionHistory()

      expect(cm.storage.local.set).toHaveBeenCalled()
    })

    it('writes to cache after fetching a subsequent paginated page', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await controller.getTransactionHistory()
      vi.clearAllMocks()

      await controller.getTransactionHistory({ ledger: 1, seq: 1 })
      expect(cm.storage.local.set).toHaveBeenCalled()
    })

    it('falls back to cache when history client throws', async () => {
      const { TransactionHistoryClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      // Prime the cache with an empty list
      await controller.getTransactionHistory()

      // Make the history client throw from now on
      vi.mocked(TransactionHistoryClient).mockImplementation(() => ({
        getTransactionHistory: vi.fn().mockRejectedValue(new Error('RPC timeout')),
      }))

      const controller2 = createController()
      await controller2.initialize()
      await controller2.unlock('password', TEST_PASSWORD)

      const page = await controller2.getTransactionHistory()
      expect(Array.isArray(page.transactions)).toBe(true)
      expect(page.hasMore).toBe(false)
    })

    it('throws when no active account on getTransactionHistory', async () => {
      const controller = createController()
      await expect(controller.getTransactionHistory()).rejects.toThrow('No active account')
    })
  })

  // -------------------------------------------------------------------------
  describe('account management', () => {
    it('setActiveAccount switches the active account', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.deriveMoreAccounts(1)

      const secondAddress = controller.getState().accounts[1].address
      await controller.setActiveAccount(secondAddress)

      expect(controller.getState().activeAccount).toBe(secondAddress)
    })

    it('setActiveAccount throws for an unknown address', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await expect(controller.setActiveAccount('rNonExistent')).rejects.toThrow('Account not found')
    })

    it('updateAccountLabel changes the label in-memory', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const address = controller.getState().activeAccount!
      await controller.updateAccountLabel(address, 'My Main Wallet')

      const account = controller.getState().accounts.find((a) => a.address === address)
      expect(account?.label).toBe('My Main Wallet')
    })

    it('updateAccountLabel persists the label to cache storage', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      vi.clearAllMocks()
      const address = controller.getState().activeAccount!
      await controller.updateAccountLabel(address, 'Renamed')

      expect(cm.storage.local.set).toHaveBeenCalled()
    })

    it('updateAccountLabel throws for unknown address', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await expect(controller.updateAccountLabel('rNonExistent', 'Label')).rejects.toThrow(
        'Account not found',
      )
    })
  })

  // -------------------------------------------------------------------------
  describe('initialize', () => {
    it('is idempotent — calling twice does not throw', async () => {
      const controller = createController()
      await controller.initialize()
      await expect(controller.initialize()).resolves.not.toThrow()
    })

    it('restores persisted accounts and network from chrome.storage.local', async () => {
      const controller = createController()
      const { address } = await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)
      await controller.switchNetwork('mainnet')

      // A second controller reads from the same chrome mock store
      const controller2 = createController()
      await controller2.initialize()

      const state = controller2.getState()
      expect(state.accounts[0].address).toBe(address)
      expect(state.activeAccount).toBe(address)
      expect(state.network).toBe('mainnet')
    })

    it('starts with empty state when no persisted data exists', async () => {
      const controller = createController()
      await controller.initialize()

      const state = controller.getState()
      expect(state.accounts).toHaveLength(0)
      expect(state.activeAccount).toBeNull()
      expect(state.locked).toBe(true)
    })
  })
})
