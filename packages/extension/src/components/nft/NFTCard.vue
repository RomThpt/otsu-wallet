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
  <button
    type="button"
    class="w-full overflow-hidden rounded-[20px] bg-bg-subtle text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99]"
  >
    <div class="aspect-square bg-bg-subtle flex items-center justify-center">
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
        class="h-8 w-8 text-text-muted"
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
    <div class="px-3 py-2.5">
      <p class="truncate text-xs font-semibold">{{ displayName }}</p>
      <p v-if="nft.transferFee > 0" class="mt-0.5 text-[10px] text-text-muted">
        Fee: {{ (nft.transferFee / 1000).toFixed(1) }}%
      </p>
    </div>
  </button>
</template>
