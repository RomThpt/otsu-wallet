import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  NftBalance,
  NftOffer,
  NftMetadata,
  MintNftParams,
  SellNftParams,
  BuyNftParams,
} from '@otsu/types'
import { sendMessage } from '../lib/messaging'

export const useNftStore = defineStore('nft', () => {
  const nfts = ref<NftBalance[]>([])
  const selectedNft = ref<NftBalance | null>(null)
  const sellOffers = ref<NftOffer[]>([])
  const buyOffers = ref<NftOffer[]>([])
  const loading = ref(false)
  const nftMetadata = ref<Map<string, NftMetadata>>(new Map())

  async function fetchNftMetadata(nftId: string, uri: string): Promise<void> {
    if (nftMetadata.value.has(nftId)) return
    const response = await sendMessage<NftMetadata>({
      type: 'GET_NFT_METADATA',
      payload: { nftId, uri },
    })
    if (response.success && response.data) {
      nftMetadata.value.set(nftId, response.data)
    }
  }

  async function fetchNFTs(): Promise<void> {
    loading.value = true
    try {
      const response = await sendMessage<NftBalance[]>({ type: 'GET_NFTS' })
      if (response.success && response.data) {
        nfts.value = response.data
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchOffers(nftId: string): Promise<void> {
    const response = await sendMessage<{ sell: NftOffer[]; buy: NftOffer[] }>({
      type: 'GET_NFT_OFFERS',
      payload: { nftId },
    })
    if (response.success && response.data) {
      sellOffers.value = response.data.sell
      buyOffers.value = response.data.buy
    }
  }

  async function mintNFT(params: MintNftParams): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'MINT_NFT',
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

  async function burnNFT(nftId: string): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'BURN_NFT',
        payload: { nftId },
      })
      if (response.success && response.data) {
        return response.data.hash
      }
      return null
    } finally {
      loading.value = false
    }
  }

  async function createSellOffer(params: SellNftParams): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'SELL_NFT',
        payload: params,
      })
      return response.success && response.data ? response.data.hash : null
    } finally {
      loading.value = false
    }
  }

  async function createBuyOffer(params: BuyNftParams): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'BUY_NFT',
        payload: params,
      })
      return response.success && response.data ? response.data.hash : null
    } finally {
      loading.value = false
    }
  }

  async function acceptOffer(offerId: string, isSellOffer = true): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'ACCEPT_NFT_OFFER',
        payload: { offerId, isSellOffer },
      })
      return response.success && response.data ? response.data.hash : null
    } finally {
      loading.value = false
    }
  }

  async function cancelOffer(offerIds: string[]): Promise<string | null> {
    loading.value = true
    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'CANCEL_NFT_OFFER',
        payload: { offerIds },
      })
      return response.success && response.data ? response.data.hash : null
    } finally {
      loading.value = false
    }
  }

  return {
    nfts,
    selectedNft,
    sellOffers,
    buyOffers,
    loading,
    nftMetadata,
    fetchNftMetadata,
    fetchNFTs,
    fetchOffers,
    mintNFT,
    burnNFT,
    createSellOffer,
    createBuyOffer,
    acceptOffer,
    cancelOffer,
  }
})
