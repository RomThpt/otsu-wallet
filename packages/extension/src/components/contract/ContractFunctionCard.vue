<script setup lang="ts">
import type { ContractFunction } from '@otsu/types'
import { CONTRACT_PARAMETER_FLAGS } from '@otsu/constants'

defineProps<{
  fn: ContractFunction
}>()

const emit = defineEmits<{
  call: [fn: ContractFunction]
}>()

function hasSendAmount(flags: number): boolean {
  return (flags & CONTRACT_PARAMETER_FLAGS.tfSendAmount) !== 0
}
</script>

<template>
  <div
    class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 hover:border-primary-400 transition-colors"
  >
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-medium font-mono">{{ fn.name }}</h4>
      <button
        class="px-3 py-1 text-xs font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
        @click="emit('call', fn)"
      >
        Call
      </button>
    </div>

    <div v-if="fn.parameters.length > 0" class="mt-2 space-y-1.5">
      <div v-for="(param, idx) in fn.parameters" :key="idx" class="flex items-center gap-2 text-xs">
        <span
          class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono"
        >
          {{ param.sType }}
        </span>
        <span v-if="param.label" class="text-gray-600 dark:text-gray-400">
          {{ param.label }}
        </span>
        <span
          v-if="hasSendAmount(param.flags)"
          class="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
        >
          sends tokens
        </span>
      </div>
    </div>

    <p v-else class="mt-1.5 text-xs text-gray-500">No parameters</p>
  </div>
</template>
