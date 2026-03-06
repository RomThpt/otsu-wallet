import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  WalletState,
  Account,
  AuthMethod,
  TokenBalance,
  TokenMetadata,
  TransactionRecord,
  TransactionHistoryPage,
  ImportAccountPayload,
  TrustlineParams,
  EscrowRecord,
  CheckRecord,
  NetworkConfig,
  CustomNetworkConfig,
  AddCustomNetworkPayload,
} from '@otsu/types'
import { performPasskeyRegistration, getPasskeyDecryptionKey } from '@otsu/core'
import { sendMessage } from '../lib/messaging'

export const useWalletStore = defineStore('wallet', () => {
  const locked = ref(true)
  const accounts = ref<Account[]>([])
  const activeAccount = ref<string | null>(null)
  const network = ref('testnet')
  const authMethod = ref<AuthMethod>('password')
  const balance = ref<{ available: string; total: string; reserved: string } | null>(null)
  const loading = ref(false)

  // Phase 2 state
  const tokens = ref<TokenBalance[]>([])
  const tokenMetadata = ref<Record<string, TokenMetadata>>({})
  const transactions = ref<TransactionRecord[]>([])
  const xrpPrice = ref<string | null>(null)
  const cachedAt = ref<number | null>(null)
  const historyMarker = ref<unknown>(undefined)
  const historyHasMore = ref(false)

  // Network state
  const predefinedNetworks = ref<Record<string, NetworkConfig>>({})
  const customNetworks = ref<CustomNetworkConfig[]>([])

  // Phase 6 state
  const escrows = ref<EscrowRecord[]>([])
  const checks = ref<CheckRecord[]>([])

  async function fetchState(): Promise<void> {
    const response = await sendMessage<WalletState>({ type: 'GET_STATE' })
    if (response.success && response.data) {
      locked.value = response.data.locked
      accounts.value = response.data.accounts
      activeAccount.value = response.data.activeAccount
      network.value = response.data.network
      authMethod.value = response.data.authMethod ?? 'password'
    }
  }

  async function unlock(method: AuthMethod, password?: string): Promise<boolean> {
    loading.value = true
    try {
      let passkeyKey: string | undefined
      if (method === 'passkey') {
        passkeyKey = await getPasskeyDecryptionKey()
      }
      const response = await sendMessage({
        type: 'UNLOCK',
        payload: { method, password, passkeyKey },
      })
      if (response.success) {
        locked.value = false
        await fetchState()
        return true
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function lock(): Promise<void> {
    await sendMessage({ type: 'LOCK' })
    locked.value = true
    balance.value = null
    tokens.value = []
    transactions.value = []
    xrpPrice.value = null
  }

  async function fetchBalance(): Promise<void> {
    const response = await sendMessage<{ available: string; total: string; reserved: string }>({
      type: 'GET_BALANCE',
    })
    if (response.success && response.data) {
      balance.value = response.data
    }
  }

  async function switchNetwork(networkId: string): Promise<void> {
    await sendMessage({ type: 'SWITCH_NETWORK', payload: { networkId } })
    network.value = networkId
    balance.value = null
    tokens.value = []
    transactions.value = []
  }

  async function requestFaucet(): Promise<boolean> {
    loading.value = true
    try {
      const response = await sendMessage({ type: 'REQUEST_FAUCET' })
      return response.success
    } finally {
      loading.value = false
    }
  }

  // Phase 2 actions

  async function setActiveAccount(address: string): Promise<void> {
    const response = await sendMessage({ type: 'SET_ACTIVE_ACCOUNT', payload: { address } })
    if (response.success) {
      activeAccount.value = address
      balance.value = null
      tokens.value = []
      transactions.value = []
    }
  }

  async function updateAccountLabel(address: string, label: string): Promise<void> {
    const response = await sendMessage({
      type: 'UPDATE_ACCOUNT_LABEL',
      payload: { address, label },
    })
    if (response.success) {
      const account = accounts.value.find((a) => a.address === address)
      if (account) account.label = label
    }
  }

  async function importAccount(payload: ImportAccountPayload): Promise<boolean> {
    loading.value = true
    try {
      const response = await sendMessage<Account>({
        type: 'IMPORT_ACCOUNT',
        payload,
      })
      if (response.success && response.data) {
        accounts.value.push(response.data)
        activeAccount.value = response.data.address
        return true
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function deriveMoreAccounts(count: number): Promise<boolean> {
    loading.value = true
    try {
      const response = await sendMessage<Account[]>({
        type: 'DERIVE_MORE_ACCOUNTS',
        payload: { count },
      })
      if (response.success && response.data) {
        accounts.value.push(...response.data)
        return true
      }
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchTokens(): Promise<void> {
    const response = await sendMessage<{ tokens: TokenBalance[]; metadata: TokenMetadata[] }>({
      type: 'GET_TOKENS',
    })
    if (response.success && response.data) {
      tokens.value = response.data.tokens
      const metaMap: Record<string, TokenMetadata> = {}
      for (const meta of response.data.metadata) {
        metaMap[`${meta.currency}:${meta.issuer}`] = meta
      }
      tokenMetadata.value = metaMap
    }
  }

  async function setTrustline(params: TrustlineParams): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'SET_TRUSTLINE',
        payload: { currency: params.currency, issuer: params.issuer, limit: params.limit },
      })
      if (response.success && response.data) {
        return response.data.hash
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function removeTrustline(currency: string, issuer: string): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'REMOVE_TRUSTLINE',
        payload: { currency, issuer },
      })
      if (response.success && response.data) {
        return response.data.hash
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function sendTokenPayment(params: {
    destination: string
    currency: string
    issuer: string
    value: string
    destinationTag?: number
    memos?: Array<{ type?: string; data: string }>
  }): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'SEND_TOKEN_PAYMENT',
        payload: params,
      })
      if (response.success && response.data) {
        return response.data.hash
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactionHistory(marker?: unknown): Promise<void> {
    const response = await sendMessage<TransactionHistoryPage>({
      type: 'GET_TRANSACTION_HISTORY',
      payload: marker ? { marker } : undefined,
    })
    if (response.success && response.data) {
      if (marker) {
        transactions.value = [...transactions.value, ...response.data.transactions]
      } else {
        transactions.value = response.data.transactions
      }
      historyMarker.value = response.data.marker
      historyHasMore.value = response.data.hasMore
    }
  }

  async function fetchXrpPrice(): Promise<void> {
    const response = await sendMessage<{ price: string }>({ type: 'GET_XRP_PRICE' })
    if (response.success && response.data) {
      xrpPrice.value = response.data.price
    }
  }

  // Network actions

  async function fetchNetworks(): Promise<void> {
    const response = await sendMessage<{
      predefined: Record<string, NetworkConfig>
      custom: CustomNetworkConfig[]
    }>({ type: 'GET_NETWORKS' })
    if (response.success && response.data) {
      predefinedNetworks.value = response.data.predefined
      customNetworks.value = response.data.custom
    }
  }

  async function addCustomNetwork(payload: AddCustomNetworkPayload): Promise<boolean> {
    const response = await sendMessage<CustomNetworkConfig>({
      type: 'ADD_CUSTOM_NETWORK',
      payload,
    })
    if (response.success && response.data) {
      customNetworks.value.push(response.data)
      return true
    }
    return false
  }

  async function removeCustomNetwork(networkId: string): Promise<boolean> {
    const response = await sendMessage({
      type: 'REMOVE_CUSTOM_NETWORK',
      payload: { networkId },
    })
    if (response.success) {
      customNetworks.value = customNetworks.value.filter((n) => n.id !== networkId)
      return true
    }
    return false
  }

  // Phase 6 actions

  async function fetchAccountEscrows(): Promise<void> {
    const response = await sendMessage<EscrowRecord[]>({ type: 'GET_ACCOUNT_ESCROWS' })
    if (response.success && response.data) {
      escrows.value = response.data
    }
  }

  async function fetchAccountChecks(): Promise<void> {
    const response = await sendMessage<CheckRecord[]>({ type: 'GET_ACCOUNT_CHECKS' })
    if (response.success && response.data) {
      checks.value = response.data
    }
  }

  async function resetWallet(): Promise<boolean> {
    const response = await sendMessage({ type: 'RESET_WALLET' })
    if (response.success) {
      locked.value = true
      accounts.value = []
      activeAccount.value = null
      network.value = 'testnet'
      balance.value = null
      tokens.value = []
      transactions.value = []
      xrpPrice.value = null
      escrows.value = []
      checks.value = []
      return true
    }
    return false
  }

  async function changeAuthMethod(method: AuthMethod, password?: string): Promise<void> {
    if (method === 'passkey') {
      const credential = await performPasskeyRegistration()
      const response = await sendMessage({
        type: 'CHANGE_AUTH_METHOD',
        payload: {
          method: 'passkey',
          credentialId: credential.credentialId,
          prfKey: credential.prfKey,
        },
      })
      if (!response.success) {
        throw new Error(response.error ?? 'Failed to switch to passkey')
      }
    } else {
      const response = await sendMessage({
        type: 'CHANGE_AUTH_METHOD',
        payload: { method, password },
      })
      if (!response.success) {
        throw new Error(response.error ?? 'Failed to switch to password')
      }
    }
    authMethod.value = method
  }

  async function exportMnemonic(method: AuthMethod, password?: string): Promise<string | null> {
    let passkeyKey: string | undefined
    if (method === 'passkey') {
      passkeyKey = await getPasskeyDecryptionKey()
    }
    const response = await sendMessage<{ mnemonic: string }>({
      type: 'EXPORT_MNEMONIC',
      payload: { method, password, passkeyKey },
    })
    if (response.success && response.data) {
      return response.data.mnemonic
    }
    if (!response.success && response.error) {
      throw new Error(response.error)
    }
    return null
  }

  return {
    locked,
    accounts,
    activeAccount,
    network,
    authMethod,
    balance,
    loading,
    tokens,
    tokenMetadata,
    transactions,
    xrpPrice,
    cachedAt,
    historyMarker,
    historyHasMore,
    fetchState,
    unlock,
    lock,
    fetchBalance,
    switchNetwork,
    requestFaucet,
    setActiveAccount,
    updateAccountLabel,
    importAccount,
    deriveMoreAccounts,
    fetchTokens,
    setTrustline,
    removeTrustline,
    sendTokenPayment,
    fetchTransactionHistory,
    fetchXrpPrice,
    predefinedNetworks,
    customNetworks,
    escrows,
    checks,
    fetchNetworks,
    addCustomNetwork,
    removeCustomNetwork,
    fetchAccountEscrows,
    fetchAccountChecks,
    changeAuthMethod,
    exportMnemonic,
    resetWallet,
  }
})
