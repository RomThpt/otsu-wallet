<script setup lang="ts">
import type { NftOffer } from '@otsu/types'
import { DROPS_PER_XRP } from '@otsu/constants'
import Button from '../common/Button.vue'

const props = defineProps<{
  offer: NftOffer
  showAccept?: boolean
}>()

defineEmits<{
  accept: [offerId: string]
}>()

function formatAmount(amount: string): string {
  const drops = Number(amount)
  if (isNaN(drops)) return amount
  return `${(drops / DROPS_PER_XRP).toFixed(6)} XRP`
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
</script>

<template>
  <div
    class="flex items-center justify-between py-2 px-3 border-b border-gray-100 dark:border-gray-800 last:border-0"
  >
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium">{{ formatAmount(props.offer.amount) }}</p>
      <p class="text-xs text-gray-500 truncate">{{ truncateAddress(props.offer.owner) }}</p>
    </div>
    <Button v-if="showAccept" size="sm" @click="$emit('accept', props.offer.offerId)">
      Accept
    </Button>
  </div>
</template>
