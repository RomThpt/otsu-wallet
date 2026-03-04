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

vi.mock('@otsu/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@otsu/core')>()

  // ---------- AuthManager mock ----------
  // Keeps real crypto derivation; replaces idb-keyval persistence with an
  // in-memory store so that the node test environment (no indexedDB) works.
  class MockAuthManager {
    get isUnlocked(): boolean {
      return sessionStore.unlocked
    }

    async setup(vaultData: VaultData, _method: AuthMethod, _password?: string): Promise<void> {
      vaultStore.data = vaultData
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )
      sessionStore.key = key
      sessionStore.unlocked = true
    }

    async unlock(_method: AuthMethod, _password?: string): Promise<VaultData> {
      if (!vaultStore.data) throw new Error('No vault found')
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      )
      sessionStore.key = key
      sessionStore.unlocked = true
      return vaultStore.data
    }

    lock(): void {
      sessionStore.unlocked = false
      sessionStore.key = null
    }

    getVaultData(): VaultData | null {
      if (!sessionStore.unlocked) return null
      return vaultStore.data
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
    prepareTransaction: vi.fn().mockImplementation(
      async (tx: Record<string, unknown>) => ({
        ...tx,
        Sequence: 1,
        Fee: '12',
        LastLedgerSequence: 1000,
      }),
    ),
    submitTransaction: vi.fn().mockResolvedValue({
      result: {
        engine_result: 'tesSUCCESS',
        tx_json: { hash: 'MOCK_TX_HASH_000000000000000000000001' },
      },
    }),
    fundWallet: vi.fn().mockResolvedValue({ balance: 1000 }),
    request: vi.fn().mockResolvedValue({}),
  })

  const makeMockPriceClient = () => ({
    getXrpUsdPrice: vi.fn().mockResolvedValue('2.50'),
  })

  const makeMockTokenClient = () => ({
    getAccountTokens: vi.fn().mockResolvedValue([]),
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

// A valid 24-word BIP-39 mnemonic for XRPL (deterministic)
const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
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
      expect(state.accounts).toHaveLength(1)
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

      expect(newAccounts).toHaveLength(1)
      expect(newAccounts[0].type).toBe('hd')
      expect(newAccounts[0].index).toBe(1)
      expect(newAccounts[0].address).toMatch(/^r/)
    })

    it('total account count grows after deriving more accounts', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      await controller.deriveMoreAccounts(2)

      expect(controller.getState().accounts).toHaveLength(3)
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

      const derived = await controller.deriveMoreAccounts(2)

      expect(derived[0].derivationPath).toContain('/1')
      expect(derived[1].derivationPath).toContain('/2')
    })
  })

  // -------------------------------------------------------------------------
  describe('import account flow', () => {
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

      expect(controller.getState().accounts).toHaveLength(2)
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

    it('returns XRP price from the mocked price client', async () => {
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const price = await controller.getXrpPrice()

      expect(price).toBe('2.50')
    })

    it('caches the price to chrome.storage.local after fetching', async () => {
      const { chromeMock: cm } = await import('./mocks/chrome')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      vi.clearAllMocks()
      await controller.getXrpPrice()

      expect(cm.storage.local.set).toHaveBeenCalled()
    })

    it('falls back to cached price when price client throws', async () => {
      const { PriceClient } = await import('@otsu/core')
      const controller = createController()
      await controller.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      // Prime the cache
      await controller.getXrpPrice()

      // Override to throw on subsequent calls
      vi.mocked(PriceClient).mockImplementation(() => ({
        getXrpUsdPrice: vi.fn().mockRejectedValue(new Error('Network error')),
      }))

      // New controller shares the same chrome mock storage (same module-level store)
      const controller2 = createController()
      await controller2.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

      const price = await controller2.getXrpPrice()
      expect(price).toBe('2.50')
    })

    it('throws when no active account on getTokens', async () => {
      const controller = createController()
      await expect(controller.getTokens()).rejects.toThrow('No active account')
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
      await controller2.createWallet('password', TEST_PASSWORD, TEST_MNEMONIC)

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

      await expect(
        controller.updateAccountLabel('rNonExistent', 'Label'),
      ).rejects.toThrow('Account not found')
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
