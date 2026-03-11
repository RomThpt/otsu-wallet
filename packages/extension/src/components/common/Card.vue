<script setup lang="ts">
defineProps<{
  padding?: boolean
}>()
</script>

<template>
  <div
    :class="[
      'rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800',
      { 'p-4': padding !== false },
    ]"
  >
    <slot />
  </div>
</template>
