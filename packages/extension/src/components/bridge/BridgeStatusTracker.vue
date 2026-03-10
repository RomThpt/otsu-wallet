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
      <span class="text-xs text-gray-500">{{
        transaction.direction === 'xrpl-to-evm' ? 'XRPL -> EVM' : 'EVM -> XRPL'
      }}</span>
      <span
        class="text-xs px-2 py-0.5 rounded-full font-medium"
        :class="{
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300': [
            'pending',
            'source_confirmed',
            'bridging',
          ].includes(transaction.status),
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300': [
            'destination_confirmed',
            'completed',
          ].includes(transaction.status),
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300':
            transaction.status === 'failed',
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
            'bg-gray-200 dark:bg-gray-700': i > getStepIndex(transaction.status),
          }"
        />
      </template>
    </div>

    <div class="flex justify-between text-[10px] text-gray-500">
      <span>{{ transaction.sourceAmount }} XRP</span>
      <span v-if="transaction.destinationAmount">-> {{ transaction.destinationAmount }} XRP</span>
    </div>

    <p v-if="transaction.error" class="text-xs text-red-500">{{ transaction.error }}</p>
  </div>
</template>
