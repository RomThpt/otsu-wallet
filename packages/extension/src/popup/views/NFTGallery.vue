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
  <div class="flex h-full flex-col px-4 pb-5">
    <div class="flex items-center justify-between pb-4 pt-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">NFTs</h1>
        <p class="mt-1 text-sm text-text-muted">Your collection on the XRP Ledger.</p>
      </div>
      <Button size="sm" @click="router.push('/explore/nfts/mint')">Mint</Button>
    </div>

    <div v-if="loading" class="flex-1">
      <div class="grid grid-cols-2 gap-3">
        <div v-for="i in 4" :key="i" class="overflow-hidden rounded-[20px] bg-bg-subtle">
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
        <p class="text-sm text-text-muted">No NFTs found</p>
        <p class="text-xs text-text-muted mt-1">Mint or receive NFTs to see them here</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
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
