<script setup lang="ts">
import type { OrderBookEntry } from '@otsu/types'

defineProps<{
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
}>()
</script>

<template>
  <div class="text-xs">
    <!-- Asks (sell orders) - reversed so lowest price is at bottom -->
    <div class="mb-1">
      <div class="flex text-gray-500 px-2 py-1 border-b border-gray-200 dark:border-gray-700">
        <span class="flex-1">Price</span>
        <span class="flex-1 text-right">Amount</span>
        <span class="flex-1 text-right">Total</span>
      </div>
      <div
        v-for="(ask, i) in [...asks].reverse().slice(0, 8)"
        :key="`ask-${i}`"
        class="flex px-2 py-0.5 bg-red-50/50 dark:bg-red-900/10"
      >
        <span class="flex-1 text-red-600 dark:text-red-400">{{
          Number(ask.price).toFixed(6)
        }}</span>
        <span class="flex-1 text-right">{{ Number(ask.amount).toFixed(4) }}</span>
        <span class="flex-1 text-right text-gray-500">{{ Number(ask.total).toFixed(4) }}</span>
      </div>
    </div>

    <!-- Spread line -->
    <div class="px-2 py-1 text-center text-gray-400 border-y border-gray-200 dark:border-gray-700">
      <template v-if="asks.length > 0 && bids.length > 0">
        Spread: {{ (Number(asks[0]?.price ?? 0) - Number(bids[0]?.price ?? 0)).toFixed(6) }}
      </template>
      <template v-else>No orders</template>
    </div>

    <!-- Bids (buy orders) -->
    <div>
      <div
        v-for="(bid, i) in bids.slice(0, 8)"
        :key="`bid-${i}`"
        class="flex px-2 py-0.5 bg-green-50/50 dark:bg-green-900/10"
      >
        <span class="flex-1 text-green-600 dark:text-green-400">{{
          Number(bid.price).toFixed(6)
        }}</span>
        <span class="flex-1 text-right">{{ Number(bid.amount).toFixed(4) }}</span>
        <span class="flex-1 text-right text-gray-500">{{ Number(bid.total).toFixed(4) }}</span>
      </div>
    </div>
  </div>
</template>
