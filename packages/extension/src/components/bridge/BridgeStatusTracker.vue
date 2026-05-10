<script setup lang="ts">
import type { BridgeTransaction } from '@otsu/types'

defineProps<{
  transaction: BridgeTransaction
}>()

const steps = ['Source Confirmed', 'Axelar Relaying', 'Destination Confirmed']

function getStepIndex(status: string): number {
  switch (status) {
    case 'pending':
      return -1
    case 'source_confirmed':
      return 0
    case 'bridging':
      return 1
    case 'destination_confirmed':
    case 'completed':
      return 2
    case 'failed':
      return -2
    default:
      return -1
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-xs text-text-muted">{{
        transaction.direction === 'xrpl-to-evm' ? 'XRPL -> EVM' : 'EVM -> XRPL'
      }}</span>
      <span
        class="text-xs px-2 py-0.5 rounded-full font-medium"
        :class="{
          'bg-bg-subtle text-warning': ['pending', 'source_confirmed', 'bridging'].includes(
            transaction.status,
          ),
          'bg-bg-subtle text-success': ['destination_confirmed', 'completed'].includes(
            transaction.status,
          ),
          'bg-bg-subtle text-danger': transaction.status === 'failed',
        }"
      >
        {{ transaction.status.replace(/_/g, ' ') }}
      </span>
    </div>

    <!-- Progress steps -->
    <div v-if="transaction.status !== 'failed'" class="flex items-center gap-1">
      <template v-for="(_step, i) in steps" :key="i">
        <div
          class="flex-1 h-1.5 rounded-full"
          :class="{
            'bg-green-500': i <= getStepIndex(transaction.status),
            'bg-bg-hover': i > getStepIndex(transaction.status),
          }"
        />
      </template>
    </div>

    <div class="flex justify-between text-[10px] text-text-muted">
      <span>{{ transaction.sourceAmount }} XRP</span>
      <span v-if="transaction.destinationAmount">-> {{ transaction.destinationAmount }} XRP</span>
    </div>

    <p v-if="transaction.error" class="text-xs text-danger">{{ transaction.error }}</p>
  </div>
</template>
