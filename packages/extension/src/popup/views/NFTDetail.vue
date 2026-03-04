<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNftStore } from '../../stores/nft'
import { DROPS_PER_XRP } from '@otsu/constants'
import NFTOfferItem from '../../components/nft/NFTOfferItem.vue'
import Button from '../../components/common/Button.vue'

const route = useRoute()
const router = useRouter()
const nftStore = useNftStore()
const loading = ref(false)
const sellAmount = ref('')
const showSellForm = ref(false)
const error = ref('')

const tokenId = computed(() => route.params.tokenId as string)
const nft = computed(() => nftStore.nfts.find((n) => n.nftId === tokenId.value))

onMounted(async () => {
  loading.value = true
  try {
    if (nftStore.nfts.length === 0) {
      await nftStore.fetchNFTs()
    }
    await nftStore.fetchOffers(tokenId.value)
  } catch {
    // Will show empty
  } finally {
    loading.value = false
  }
})

async function handleSell() {
  const amount = parseFloat(sellAmount.value)
  if (isNaN(amount) || amount <= 0) return

  error.value = ''
  const hash = await nftStore.createSellOffer({
    nftId: tokenId.value,
    amount: Math.floor(amount * DROPS_PER_XRP).toString(),
  })

  if (hash) {
    showSellForm.value = false
    sellAmount.value = ''
    await nftStore.fetchOffers(tokenId.value)
  } else {
    error.value = 'Failed to create sell offer'
  }
}

async function handleAcceptOffer(offerId: string) {
  error.value = ''
  const hash = await nftStore.acceptOffer(offerId)
  if (hash) {
    await nftStore.fetchNFTs()
    router.push('/explore/nfts')
  } else {
    error.value = 'Failed to accept offer'
  }
}

async function handleBurn() {
  if (!confirm('Are you sure you want to burn this NFT? This cannot be undone.')) return

  error.value = ''
  const hash = await nftStore.burnNFT(tokenId.value)
  if (hash) {
    await nftStore.fetchNFTs()
    router.push('/explore/nfts')
  } else {
    error.value = 'Failed to burn NFT'
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="router.push('/explore/nfts')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h2 class="text-sm font-bold">NFT Detail</h2>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div
        class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full"
      />
    </div>

    <div v-else-if="!nft" class="flex-1 flex items-center justify-center p-4">
      <p class="text-sm text-gray-500">NFT not found</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <!-- Image -->
      <div class="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <img
          v-if="nft.uri"
          :src="nft.uri"
          :alt="nft.nftId"
          class="w-full h-full object-cover"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <svg
          v-else
          class="h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>

      <!-- Info -->
      <div class="p-4 space-y-3">
        <div class="space-y-1">
          <p class="text-xs text-gray-500">Token ID</p>
          <p class="text-xs font-mono break-all">{{ nft.nftId }}</p>
        </div>

        <div class="flex gap-4 text-xs">
          <div><span class="text-gray-500">Taxon:</span> {{ nft.taxon }}</div>
          <div v-if="nft.transferFee > 0">
            <span class="text-gray-500">Fee:</span> {{ (nft.transferFee / 1000).toFixed(1) }}%
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <Button size="sm" block @click="showSellForm = !showSellForm">Sell</Button>
          <Button size="sm" variant="danger" block @click="handleBurn">Burn</Button>
        </div>

        <!-- Sell form -->
        <div v-if="showSellForm" class="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <input
            v-model="sellAmount"
            type="number"
            step="0.000001"
            min="0"
            placeholder="Price in XRP"
            class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button size="sm" block :loading="nftStore.loading" @click="handleSell">
            Create Sell Offer
          </Button>
        </div>

        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

        <!-- Sell Offers -->
        <div v-if="nftStore.sellOffers.length > 0">
          <p class="text-xs font-medium text-gray-500 mb-1">Sell Offers</p>
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <NFTOfferItem
              v-for="offer in nftStore.sellOffers"
              :key="offer.offerId"
              :offer="offer"
              :show-accept="true"
              @accept="handleAcceptOffer"
            />
          </div>
        </div>

        <!-- Buy Offers -->
        <div v-if="nftStore.buyOffers.length > 0">
          <p class="text-xs font-medium text-gray-500 mb-1">Buy Offers</p>
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <NFTOfferItem
              v-for="offer in nftStore.buyOffers"
              :key="offer.offerId"
              :offer="offer"
              :show-accept="true"
              @accept="handleAcceptOffer"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
