<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNftStore } from '../../stores/nft'
import NFTCard from '../../components/nft/NFTCard.vue'
import Skeleton from '../../components/common/Skeleton.vue'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const nftStore = useNftStore()
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    await nftStore.fetchNFTs()
  } catch {
    // Will show empty
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="router.push('/explore')"
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
        <h2 class="text-sm font-bold">NFTs</h2>
      </div>
      <Button size="sm" @click="router.push('/explore/nfts/mint')">Mint</Button>
    </div>

    <div v-if="loading" class="flex-1 p-3">
      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="i in 4"
          :key="i"
          class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          <Skeleton variant="rect" height="140px" />
          <div class="p-2 space-y-1">
            <Skeleton variant="text" width="70%" height="12px" />
            <Skeleton variant="text" width="40%" height="10px" />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="nftStore.nfts.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center">
        <p class="text-sm text-gray-500">No NFTs found</p>
        <p class="text-xs text-gray-400 mt-1">Mint or receive NFTs to see them here</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-3">
      <div class="grid grid-cols-2 gap-3">
        <NFTCard
          v-for="nft in nftStore.nfts"
          :key="nft.nftId"
          :nft="nft"
          @click="router.push(`/explore/nfts/${nft.nftId}`)"
        />
      </div>
    </div>
  </div>
</template>
