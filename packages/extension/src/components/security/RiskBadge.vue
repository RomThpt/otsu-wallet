<script setup lang="ts">
import { computed } from 'vue'
import type { RiskLevel } from '@otsu/types'

const props = defineProps<{
  level: RiskLevel
}>()

const badgeClasses = computed(() => {
  switch (props.level) {
    case 'safe':
      return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
    case 'low':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
    case 'medium':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    case 'high':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
    case 'critical':
      return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    default:
      return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
  }
})

const label = computed(() => props.level.charAt(0).toUpperCase() + props.level.slice(1))
</script>

<template>
  <span
    class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
    :class="badgeClasses"
  >
    {{ label }}
  </span>
</template>
