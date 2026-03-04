<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import type { NftBalance } from '@otsu/types'
import { useNftStore } from '../../stores/nft'

const props = defineProps<{
  nft: NftBalance
}>()

const nftStore = useNftStore()
const imgError = ref(false)

const metadata = computed(() => nftStore.nftMetadata.get(props.nft.nftId))

const displayName = computed(() => metadata.value?.name ?? truncateId(props.nft.nftId))

const imageUrl = computed(() => {
  if (metadata.value?.image) return metadata.value.image
  if (props.nft.uri) return props.nft.uri
  return null
})

onMounted(() => {
  if (props.nft.uri) {
    nftStore.fetchNftMetadata(props.nft.nftId, props.nft.uri)
  }
})

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return `${id.slice(0, 6)}...${id.slice(-6)}`
}
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-primary-500 transition-colors cursor-pointer"
  >
    <div class="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <img
        v-if="imageUrl && !imgError"
        :src="imageUrl"
        :alt="displayName"
        loading="lazy"
        class="w-full h-full object-cover"
        @error="imgError = true"
      />
      <svg
        v-else
        class="h-8 w-8 text-gray-400"
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
    <div class="p-2">
      <p class="text-xs font-medium truncate">{{ displayName }}</p>
      <p v-if="nft.transferFee > 0" class="text-[10px] text-gray-400 mt-0.5">
        Fee: {{ (nft.transferFee / 1000).toFixed(1) }}%
      </p>
    </div>
  </div>
</template>
