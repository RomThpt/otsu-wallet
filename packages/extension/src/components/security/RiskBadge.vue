<script setup lang="ts">
import { computed } from 'vue'
import type { RiskLevel } from '@otsu/types'

const props = defineProps<{
  level: RiskLevel
}>()

const badgeClasses = computed(() => {
  switch (props.level) {
    case 'safe':
      return 'bg-bg-subtle text-success'
    case 'low':
      return 'bg-bg-subtle text-link'
    case 'medium':
      return 'bg-bg-subtle text-warning'
    case 'high':
      return 'bg-bg-subtle text-warning'
    case 'critical':
      return 'bg-bg-subtle text-danger'
    default:
      return 'bg-bg-subtle text-text-muted'
  }
})

const label = computed(() => props.level.charAt(0).toUpperCase() + props.level.slice(1))
</script>

<template>
  <span
    role="status"
    :aria-label="`Risk level: ${label}`"
    class="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full"
    :class="badgeClasses"
  >
    {{ label }}
  </span>
</template>
