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
  <div class="rounded-lg border border-border p-3 hover:border-accent transition-colors">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-medium font-mono">{{ fn.name }}</h4>
      <button
        class="px-3 py-1 text-xs font-medium rounded-md bg-accent text-accent-fg hover:opacity-90 transition-colors"
        @click="emit('call', fn)"
      >
        Call
      </button>
    </div>

    <div v-if="fn.parameters.length > 0" class="mt-2 space-y-1.5">
      <div v-for="(param, idx) in fn.parameters" :key="idx" class="flex items-center gap-2 text-xs">
        <span class="px-1.5 py-0.5 rounded bg-bg-subtle text-link font-mono">
          {{ param.sType }}
        </span>
        <span v-if="param.label" class="text-text-muted">
          {{ param.label }}
        </span>
        <span
          v-if="hasSendAmount(param.flags)"
          class="px-1.5 py-0.5 rounded bg-bg-subtle text-warning"
        >
          sends tokens
        </span>
      </div>
    </div>

    <p v-else class="mt-1.5 text-xs text-text-muted">No parameters</p>
  </div>
</template>
