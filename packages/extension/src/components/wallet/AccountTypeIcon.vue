<script setup lang="ts">
defineProps<{
  type: 'hd' | 'imported' | 'hardware' | 'multisig'
}>()
</script>

<template>
  <span
    class="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold"
    :class="{
      'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300': type === 'hd',
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300': type === 'imported',
      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300': type === 'hardware',
      'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300': type === 'multisig',
    }"
    :title="type"
  >
    {{ type === 'hd' ? 'H' : type === 'imported' ? 'I' : type === 'hardware' ? 'L' : 'M' }}
  </span>
</template>
