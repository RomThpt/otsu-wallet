<script setup lang="ts">
import { ref } from 'vue'
import type { TokenBalance, TokenMetadata } from '@otsu/types'

defineProps<{
  token: TokenBalance
  metadata?: TokenMetadata
  xrpPrice?: string | null
}>()

const imgError = ref(false)
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
  >
    <!-- Token Icon -->
    <div
      class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden"
    >
      <img
        v-if="metadata?.icon?.length && !imgError"
        :src="metadata.icon"
        :alt="token.currency"
        loading="lazy"
        class="w-full h-full object-cover"
        @error="imgError = true"
      />
      <span v-else class="text-xs font-bold text-gray-500">{{ token.currency.slice(0, 2) }}</span>
    </div>

    <!-- Token Info -->
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-center">
        <span class="text-sm font-medium truncate">
          {{ metadata?.name ?? token.currency }}
          <span v-if="metadata?.verified" class="text-primary-500 text-xs">[v]</span>
        </span>
        <span class="text-sm font-medium">{{ parseFloat(token.value).toFixed(4) }}</span>
      </div>
      <div class="flex justify-between items-center mt-0.5">
        <span class="text-xs text-gray-500 font-mono"> {{ token.issuer.slice(0, 8) }}... </span>
        <span class="text-xs text-gray-500">{{ metadata?.symbol ?? token.currency }}</span>
      </div>
    </div>
  </div>
</template>
