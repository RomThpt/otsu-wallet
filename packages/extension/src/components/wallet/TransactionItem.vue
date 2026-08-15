<script setup lang="ts">
import { computed } from 'vue'
import type { TransactionRecord } from '@otsu/types'
import { DROPS_PER_XRP } from '@otsu/constants'

const props = defineProps<{
  tx: TransactionRecord
}>()

const displayAmount = computed(() => {
  if (props.tx.amount.currency === 'XRP') {
    const value = Number(props.tx.amount.value) / DROPS_PER_XRP
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value)} XRP`
  }
  return `${props.tx.amount.value} ${props.tx.amount.currency}`
})

const isContractCall = computed(() => props.tx.type === 'ContractCall')

const directionLabel = computed(() => {
  if (isContractCall.value && props.tx.contractCall) {
    return `Call: ${props.tx.contractCall.functionName}`
  }
  switch (props.tx.direction) {
    case 'sent':
      return 'Sent'
    case 'received':
      return 'Received'
    case 'self':
      return 'Self'
    default:
      return props.tx.type
  }
})

const directionColor = computed(() => {
  switch (props.tx.direction) {
    case 'sent':
      return 'text-danger'
    case 'received':
      return 'text-success'
    default:
      return 'text-text-muted'
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

const counterparty = computed(() => {
  if (props.tx.direction === 'sent') return truncate(props.tx.destination ?? '')
  if (props.tx.direction === 'received') return truncate(props.tx.account)
  return props.tx.type
})

function truncate(addr: string): string {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-bg-hover active:bg-bg-hover"
  >
    <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bg-hover">
      <svg
        v-if="tx.direction === 'sent'"
        class="w-4 h-4 text-danger"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M7 17L17 7M17 7H7M17 7v10"
        />
      </svg>
      <svg
        v-else-if="tx.direction === 'received'"
        class="w-4 h-4 text-success"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17 7L7 17M7 17h10M7 17V7"
        />
      </svg>
      <svg
        v-else-if="isContractCall"
        class="w-4 h-4 text-link"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
      <svg
        v-else
        class="w-4 h-4 text-text-muted"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </div>

    <div class="min-w-0 flex-1">
      <span class="block truncate text-sm font-semibold">{{ directionLabel }}</span>
      <span class="mt-0.5 block truncate text-xs text-text-muted">
        {{ counterparty }}<template v-if="timeAgo"> · {{ timeAgo }}</template>
      </span>
    </div>
    <div class="max-w-[172px] min-w-0 text-right">
      <span class="block truncate text-sm font-semibold tabular-nums" :class="directionColor">
        {{ directionSign }}{{ displayAmount }}
      </span>
      <span v-if="!tx.successful" class="mt-0.5 block text-xs font-medium text-danger">Failed</span>
      <span v-else class="mt-0.5 block text-xs text-text-muted">Completed</span>
    </div>
  </button>
</template>
