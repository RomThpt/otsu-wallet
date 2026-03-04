<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  tx: Record<string, unknown>
}>()

const formattedJson = computed(() => JSON.stringify(props.tx, null, 2))
</script>

<template>
  <div class="rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-4 space-y-3">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <svg class="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
      <h3 class="text-sm font-semibold text-red-800 dark:text-red-200">Blind Signing</h3>
    </div>

    <!-- Warning Text -->
    <p class="text-xs text-red-700 dark:text-red-300">
      Transaction simulation failed. You are signing a transaction that could not be verified.
      Review the raw transaction data carefully before proceeding.
    </p>

    <!-- Raw TX JSON -->
    <pre
      class="text-xs font-mono bg-gray-900 dark:bg-gray-950 text-gray-100 rounded-lg p-3 overflow-auto max-h-[200px] whitespace-pre-wrap break-all"
    >{{ formattedJson }}</pre>
  </div>
</template>
