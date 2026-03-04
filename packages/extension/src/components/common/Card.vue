<script setup lang="ts">
defineProps<{
  padding?: boolean
}>()
</script>

<template>
  <div
    :class="[
      'rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm',
      { 'p-4': padding !== false },
    ]"
  >
    <slot />
  </div>
</template>
