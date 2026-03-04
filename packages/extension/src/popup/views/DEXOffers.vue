<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDexStore } from '../../stores/dex'
import { DROPS_PER_XRP } from '@otsu/constants'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const dexStore = useDexStore()
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true
  try {
    await dexStore.fetchAccountOffers()
  } finally {
    loading.value = false
  }
})

function formatAmount(val: string | { currency: string; value: string }): string {
  if (typeof val === 'string') {
    return `${(Number(val) / DROPS_PER_XRP).toFixed(6)} XRP`
  }
  return `${val.value} ${val.currency}`
}

async function handleCancel(seq: number) {
  if (!confirm('Cancel this offer?')) return
  error.value = ''
  const hash = await dexStore.cancelOffer(seq)
  if (hash) {
    await dexStore.fetchAccountOffers()
  } else {
    error.value = 'Failed to cancel offer'
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="router.push('/explore/dex')"
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
      <h2 class="text-sm font-bold">My Offers</h2>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div
        class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full"
      />
    </div>

    <div
      v-else-if="dexStore.accountOffers.length === 0"
      class="flex-1 flex items-center justify-center p-4"
    >
      <div class="text-center">
        <p class="text-sm text-gray-500">No open offers</p>
        <p class="text-xs text-gray-400 mt-1">Place an order on the DEX to see it here</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="offer in dexStore.accountOffers" :key="offer.seq" class="px-4 py-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">
              {{ formatAmount(offer.takerPays) }}
            </p>
            <p class="text-xs text-gray-500">for {{ formatAmount(offer.takerGets) }}</p>
          </div>
          <Button size="sm" variant="danger" @click="handleCancel(offer.seq)">Cancel</Button>
        </div>
      </div>
    </div>

    <p v-if="error" class="px-4 py-2 text-xs text-red-500">{{ error }}</p>
  </div>
</template>
