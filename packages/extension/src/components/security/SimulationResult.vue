<script setup lang="ts">
import { computed } from 'vue'
import type { SimulationResult } from '@otsu/types'

defineProps<{
  result: SimulationResult
}>()

function formatDelta(delta: string): string {
  const num = parseFloat(delta)
  if (num > 0) return `+${delta}`
  return delta
}

const deltaClass = computed(() => (delta: string) => {
  const num = parseFloat(delta)
  if (num > 0) return 'text-success'
  if (num < 0) return 'text-danger'
  return 'text-text-muted'
})
</script>

<template>
  <div class="space-y-3">
    <!-- Error State -->
    <div v-if="result.error" class="rounded-lg bg-bg-subtle border border-danger/30 p-3">
      <p class="text-sm font-medium text-danger">Simulation Error</p>
      <p class="text-xs text-danger mt-1">{{ result.error }}</p>
    </div>

    <!-- Balance Changes -->
    <template v-if="result.balanceChanges.length > 0">
      <div class="space-y-2">
        <div
          v-for="change in result.balanceChanges"
          :key="`${change.currency}-${change.issuer ?? 'native'}`"
          class="rounded-xl bg-bg-hover/70 px-3 py-2.5"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 text-sm font-semibold text-text">
              {{ change.currency }}
              <span
                v-if="change.issuer"
                class="block truncate text-[10px] font-mono text-text-muted"
              >
                {{ change.issuer.slice(0, 8) }}...
              </span>
            </div>
            <span
              class="shrink-0 text-sm font-semibold tabular-nums"
              :class="deltaClass(change.delta)"
            >
              {{ formatDelta(change.delta) }}
            </span>
          </div>
          <p class="mt-1 text-xs tabular-nums text-text-muted">
            {{ change.before }} → {{ change.after }}
          </p>
        </div>
      </div>
    </template>

    <div
      v-if="result.success"
      class="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-3 py-2 text-xs font-medium text-success"
    >
      <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      Simulated successfully on the current ledger
    </div>

    <!-- Fee -->
    <div class="flex justify-between items-center text-sm py-1.5 border-t border-border">
      <span class="text-text-muted">Fee</span>
      <span class="text-text font-mono">{{ result.fee }} XRP</span>
    </div>

    <!-- Objects Created -->
    <div
      v-if="result.objectsCreated > 0"
      class="flex items-center gap-2 text-xs text-link bg-bg-subtle rounded-md px-3 py-1.5"
    >
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      {{ result.objectsCreated }} object{{ result.objectsCreated !== 1 ? 's' : '' }} created
    </div>

    <!-- Objects Deleted -->
    <div
      v-if="result.objectsDeleted > 0"
      class="flex items-center gap-2 text-xs text-warning bg-bg-subtle rounded-md px-3 py-1.5"
    >
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
      </svg>
      {{ result.objectsDeleted }} object{{ result.objectsDeleted !== 1 ? 's' : '' }} deleted
    </div>
  </div>
</template>
