<script setup lang="ts">
defineProps<{
  padding?: boolean
  variant?: 'default' | 'plain'
}>()
</script>

<template>
  <div
    :class="[variant === 'plain' ? '' : 'border-b border-border', { 'py-4': padding !== false }]"
  >
    <slot />
  </div>
</template>
