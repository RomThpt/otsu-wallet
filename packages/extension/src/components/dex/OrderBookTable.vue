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
      <div class="flex text-text-muted px-2 py-1 border-b border-border">
        <span class="flex-1">Price</span>
        <span class="flex-1 text-right">Amount</span>
        <span class="flex-1 text-right">Total</span>
      </div>
      <div
        v-for="(ask, i) in [...asks].reverse().slice(0, 8)"
        :key="`ask-${i}`"
        class="flex px-2 py-0.5 bg-red-50/50 dark:bg-red-900/10"
      >
        <span class="flex-1 text-danger">{{ Number(ask.price).toFixed(6) }}</span>
        <span class="flex-1 text-right">{{ Number(ask.amount).toFixed(4) }}</span>
        <span class="flex-1 text-right text-text-muted">{{ Number(ask.total).toFixed(4) }}</span>
      </div>
    </div>

    <!-- Spread line -->
    <div class="px-2 py-1 text-center text-text-muted border-y border-border">
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
        <span class="flex-1 text-success">{{ Number(bid.price).toFixed(6) }}</span>
        <span class="flex-1 text-right">{{ Number(bid.amount).toFixed(4) }}</span>
        <span class="flex-1 text-right text-text-muted">{{ Number(bid.total).toFixed(4) }}</span>
      </div>
    </div>
  </div>
</template>
