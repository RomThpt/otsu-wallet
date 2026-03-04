<script setup lang="ts">
defineProps<{
  network: string
}>()
</script>

<template>
  <span
    class="text-xs px-2.5 py-1 rounded-full"
    :class="{
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300': network === 'mainnet',
      'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300':
        network !== 'mainnet',
    }"
  >
    {{ network }}
  </span>
</template>
