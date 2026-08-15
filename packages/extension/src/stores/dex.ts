import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CreateDexOfferParams,
  DexOffer,
  OrderBook,
  OwnedXrplAsset,
  SwapQuote,
  SwapQuoteRequest,
} from '@otsu/types'
import { sendMessage } from '../lib/messaging'

export const useDexStore = defineStore('dex', () => {
  const orderBook = ref<OrderBook | null>(null)
  const accountOffers = ref<DexOffer[]>([])
  const baseCurrency = ref<{ currency: string; issuer?: string }>({ currency: 'XRP' })
  const quoteCurrency = ref<{ currency: string; issuer?: string }>({
    currency: 'USD',
    issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B',
  })
  const loading = ref(false)
  const ownedAssets = ref<OwnedXrplAsset[]>([])
  const swapQuote = ref<SwapQuote | null>(null)
  const error = ref('')

  async function fetchOwnedAssets(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const response = await sendMessage<OwnedXrplAsset[]>({ type: 'GET_OWNED_ASSETS' })
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Could not load assets')
      }
      ownedAssets.value = response.data
    } catch (cause) {
      error.value = (cause as Error).message
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function fetchSwapQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    error.value = ''
    const response = await sendMessage<SwapQuote>({ type: 'GET_SWAP_QUOTE', payload: request })
    if (!response.success || !response.data) {
      const message = response.error || 'Could not quote this swap'
      error.value = message
      throw new Error(message)
    }
    swapQuote.value = response.data
    return response.data
  }

  async function fetchOrderBook(): Promise<void> {
    loading.value = true
    try {
      const response = await sendMessage<OrderBook>({
        type: 'GET_ORDER_BOOK',
        payload: { base: baseCurrency.value, quote: quoteCurrency.value },
      })
      if (response.success && response.data) {
        orderBook.value = response.data
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchAccountOffers(): Promise<void> {
    const response = await sendMessage<DexOffer[]>({ type: 'GET_ACCOUNT_OFFERS' })
    if (response.success && response.data) {
      accountOffers.value = response.data
    }
  }

  async function createOffer(params: CreateDexOfferParams): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'CREATE_DEX_OFFER',
        payload: params,
      })
      return response.success && response.data ? response.data.hash : null
    } finally {
      loading.value = false
    }
  }

  async function cancelOffer(offerSequence: number): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'CANCEL_DEX_OFFER',
        payload: { offerSequence },
      })
      return response.success && response.data ? response.data.hash : null
    } finally {
      loading.value = false
    }
  }

  return {
    orderBook,
    accountOffers,
    baseCurrency,
    quoteCurrency,
    loading,
    ownedAssets,
    swapQuote,
    error,
    fetchOwnedAssets,
    fetchSwapQuote,
    fetchOrderBook,
    fetchAccountOffers,
    createOffer,
    cancelOffer,
  }
})
