<script setup lang="ts">
import { ref } from 'vue'
import type { RiskWarning } from '@otsu/types'

defineProps<{
  warnings: RiskWarning[]
}>()

const expandedItems = ref<Set<number>>(new Set())

function toggleExpand(index: number) {
  if (expandedItems.value.has(index)) {
    expandedItems.value.delete(index)
  } else {
    expandedItems.value.add(index)
  }
}

function iconClasses(level: string): string {
  switch (level) {
    case 'safe':
      return 'text-success'
    case 'low':
      return 'text-link'
    case 'medium':
      return 'text-warning'
    case 'high':
      return 'text-warning'
    case 'critical':
      return 'text-danger'
    default:
      return 'text-text-muted'
  }
}

function borderClasses(level: string): string {
  switch (level) {
    case 'safe':
      return 'border-success/30'
    case 'low':
      return 'border-link/30'
    case 'medium':
      return 'border-warning/30'
    case 'high':
      return 'border-warning/30'
    case 'critical':
      return 'border-danger/30'
    default:
      return 'border-border'
  }
}
</script>

<template>
  <div v-if="warnings.length > 0" class="space-y-2">
    <div
      v-for="(warning, index) in warnings"
      :key="warning.code"
      class="rounded-lg border p-3"
      :class="borderClasses(warning.level)"
    >
      <button
        class="flex items-start gap-2 w-full text-left"
        :class="{ 'cursor-pointer': warning.details }"
        :disabled="!warning.details"
        @click="warning.details && toggleExpand(index)"
      >
        <!-- Warning Icon -->
        <svg
          class="w-4 h-4 shrink-0 mt-0.5"
          :class="iconClasses(warning.level)"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            v-if="warning.level === 'safe'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>

        <!-- Message -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-text">
            {{ warning.message }}
          </p>
        </div>

        <!-- Expand Arrow -->
        <svg
          v-if="warning.details"
          class="w-4 h-4 shrink-0 text-text-muted transition-transform mt-0.5"
          :class="{ 'rotate-180': expandedItems.has(index) }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <!-- Expandable Details -->
      <div
        v-if="warning.details && expandedItems.has(index)"
        class="mt-2 pt-2 border-t border-border"
      >
        <p class="text-xs text-text-muted">{{ warning.details }}</p>
      </div>
    </div>
  </div>
</template>
