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

    <!-- Balance Changes Table -->
    <template v-if="result.balanceChanges.length > 0">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-xs text-text-muted border-b border-border">
            <th class="text-left py-1.5 font-medium">Currency</th>
            <th class="text-right py-1.5 font-medium">Before</th>
            <th class="text-right py-1.5 font-medium">After</th>
            <th class="text-right py-1.5 font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="change in result.balanceChanges"
            :key="`${change.currency}-${change.issuer ?? 'native'}`"
            class="border-b border-border last:border-0"
          >
            <td class="py-1.5 text-text font-medium">
              {{ change.currency }}
              <span v-if="change.issuer" class="text-[10px] text-text-muted font-mono block">
                {{ change.issuer.slice(0, 8) }}...
              </span>
            </td>
            <td class="py-1.5 text-right text-text-muted font-mono">
              {{ change.before }}
            </td>
            <td class="py-1.5 text-right text-text-muted font-mono">
              {{ change.after }}
            </td>
            <td class="py-1.5 text-right font-mono font-medium" :class="deltaClass(change.delta)">
              {{ formatDelta(change.delta) }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <!-- Fee -->
    <div class="flex justify-between items-center text-sm py-1.5 border-t border-border">
      <span class="text-text-muted">Fee</span>
      <span class="text-text font-mono">{{ result.fee }} drops</span>
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
