<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TokenBalance, TokenMetadata } from '@otsu/types'

const props = defineProps<{
  token: TokenBalance
  metadata?: TokenMetadata
  xrpPrice?: string | null
}>()

const imgError = ref(false)

const formattedBalance = computed(() =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(Number(props.token.value)),
)

const issuerLabel = computed(() => {
  if (props.metadata?.domain) return props.metadata.domain
  return `${props.token.issuer.slice(0, 6)}…${props.token.issuer.slice(-4)}`
})
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-bg-hover active:bg-bg-hover"
  >
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-bg-hover"
    >
      <img
        v-if="metadata?.icon?.length && !imgError"
        :src="metadata.icon"
        :alt="token.currency"
        loading="lazy"
        class="w-full h-full object-cover"
        @error="imgError = true"
      />
      <span v-else class="text-xs font-semibold uppercase text-text-muted">{{
        token.currency.slice(0, 2)
      }}</span>
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-1">
        <span class="truncate text-sm font-semibold">{{ metadata?.name ?? token.currency }}</span>
        <svg
          v-if="metadata?.verified"
          class="h-3.5 w-3.5 shrink-0 text-accent"
          aria-label="Verified issuer"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M10 1.7l2.1 1.4 2.5-.1.8 2.4 2.1 1.3-.8 2.4.8 2.4-2.1 1.3-.8 2.4-2.5-.1L10 18.3l-2.1-1.4-2.5.1-.8-2.4-2.1-1.3.8-2.4-.8-2.4 2.1-1.3.8-2.4 2.5.1L10 1.7zm3.2 6.1a.8.8 0 00-1.1-1.1L9 9.9 7.8 8.7a.8.8 0 00-1.1 1.1l1.8 1.8a.8.8 0 001.1 0l3.6-3.8z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
      <span class="mt-0.5 block truncate text-xs text-text-muted">{{ issuerLabel }}</span>
    </div>
    <div class="max-w-[160px] min-w-0 text-right">
      <span class="block truncate text-sm font-semibold tabular-nums">{{ formattedBalance }}</span>
      <span class="mt-0.5 block text-xs text-text-muted">{{
        metadata?.symbol ?? token.currency
      }}</span>
    </div>
  </button>
</template>
