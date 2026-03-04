<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionRecord } from '@otsu/types'
import { DROPS_PER_XRP } from '@otsu/constants'

const props = defineProps<{
  tx: TransactionRecord
}>()

const displayAmount = computed(() => {
  if (props.tx.amount.currency === 'XRP') {
    return `${(Number(props.tx.amount.value) / DROPS_PER_XRP).toFixed(6)} XRP`
  }
  return `${props.tx.amount.value} ${props.tx.amount.currency}`
})

const directionLabel = computed(() => {
  switch (props.tx.direction) {
    case 'sent': return 'Sent'
    case 'received': return 'Received'
    case 'self': return 'Self'
    default: return props.tx.type
  }
})

const directionColor = computed(() => {
  switch (props.tx.direction) {
    case 'sent': return 'text-red-600 dark:text-red-400'
    case 'received': return 'text-green-600 dark:text-green-400'
    default: return 'text-gray-600 dark:text-gray-400'
  }
})

const directionSign = computed(() => {
  if (props.tx.direction === 'sent') return '-'
  if (props.tx.direction === 'received') return '+'
  return ''
})

const timeAgo = computed(() => {
  if (!props.tx.timestamp) return ''
  const diff = Date.now() - props.tx.timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(props.tx.timestamp).toLocaleDateString()
})

function truncate(addr: string): string {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <!-- Direction Arrow -->
    <div
      class="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
      :class="{
        'bg-red-100 dark:bg-red-900/30': tx.direction === 'sent',
        'bg-green-100 dark:bg-green-900/30': tx.direction === 'received',
        'bg-gray-100 dark:bg-gray-800': tx.direction !== 'sent' && tx.direction !== 'received',
      }"
    >
      <svg v-if="tx.direction === 'sent'" class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17L17 7M17 7H7M17 7v10" />
      </svg>
      <svg v-else-if="tx.direction === 'received'" class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 7L7 17M7 17h10M7 17V7" />
      </svg>
      <svg v-else class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>

    <!-- Details -->
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium">{{ directionLabel }}</span>
        <span class="text-sm font-medium" :class="directionColor">
          {{ directionSign }}{{ displayAmount }}
        </span>
      </div>
      <div class="flex justify-between items-center mt-0.5">
        <span class="text-xs text-gray-500 font-mono">
          {{ tx.direction === 'sent' ? truncate(tx.destination ?? '') : truncate(tx.account) }}
        </span>
        <span class="text-xs text-gray-500">{{ timeAgo }}</span>
      </div>
    </div>

    <!-- Status -->
    <span
      v-if="!tx.successful"
      class="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 shrink-0"
    >
      Failed
    </span>
  </div>
</template>
