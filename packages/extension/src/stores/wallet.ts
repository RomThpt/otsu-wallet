import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  WalletState,
  Account,
  TokenBalance,
  TokenMetadata,
  TransactionRecord,
  TransactionHistoryPage,
  ImportAccountPayload,
  TrustlineParams,
} from '@otsu/types'
import { sendMessage } from '../lib/messaging'

export const useWalletStore = defineStore('wallet', () => {
  const locked = ref(true)
  const accounts = ref<Account[]>([])
  const activeAccount = ref<string | null>(null)
  const network = ref('testnet')
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

  async function fetchState(): Promise<void> {
    const response = await sendMessage<WalletState>({ type: 'GET_STATE' })
    if (response.success && response.data) {
      locked.value = response.data.locked
      accounts.value = response.data.accounts
      activeAccount.value = response.data.activeAccount
      network.value = response.data.network
    }
  }

  async function unlock(password: string): Promise<boolean> {
    loading.value = true
    try {
      const response = await sendMessage({ type: 'UNLOCK', payload: { password } })
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

  return {
    locked,
    accounts,
    activeAccount,
    network,
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
  }
})
