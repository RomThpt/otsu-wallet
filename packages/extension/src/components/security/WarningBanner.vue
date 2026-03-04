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
      return 'text-green-500 dark:text-green-400'
    case 'low':
      return 'text-blue-500 dark:text-blue-400'
    case 'medium':
      return 'text-yellow-500 dark:text-yellow-400'
    case 'high':
      return 'text-orange-500 dark:text-orange-400'
    case 'critical':
      return 'text-red-500 dark:text-red-400'
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}

function borderClasses(level: string): string {
  switch (level) {
    case 'safe':
      return 'border-green-200 dark:border-green-800'
    case 'low':
      return 'border-blue-200 dark:border-blue-800'
    case 'medium':
      return 'border-yellow-200 dark:border-yellow-800'
    case 'high':
      return 'border-orange-200 dark:border-orange-800'
    case 'critical':
      return 'border-red-200 dark:border-red-800'
    default:
      return 'border-gray-200 dark:border-gray-700'
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
          <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
            {{ warning.message }}
          </p>
        </div>

        <!-- Expand Arrow -->
        <svg
          v-if="warning.details"
          class="w-4 h-4 shrink-0 text-gray-400 transition-transform mt-0.5"
          :class="{ 'rotate-180': expandedItems.has(index) }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Expandable Details -->
      <div
        v-if="warning.details && expandedItems.has(index)"
        class="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800"
      >
        <p class="text-xs text-gray-600 dark:text-gray-400">{{ warning.details }}</p>
      </div>
    </div>
  </div>
</template>
