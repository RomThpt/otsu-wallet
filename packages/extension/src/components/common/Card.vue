<script setup lang="ts">
defineProps<{
  padding?: boolean
  variant?: 'default' | 'plain'
}>()
</script>

<template>
  <div
    :class="[
      variant === 'plain' ? '' : 'rounded-xl bg-bg-subtle border border-border p-4 shadow-card',
      { 'p-4': padding !== false },
    ]"
  >
    <slot />
  </div>
</template>
