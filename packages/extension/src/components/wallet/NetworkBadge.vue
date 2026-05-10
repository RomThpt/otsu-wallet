<script setup lang="ts">
defineProps<{
  network: string
}>()
</script>

<template>
  <span
    class="text-xs px-2.5 py-1 rounded-full"
    :class="{
      'bg-bg-subtle text-success': network === 'mainnet',
      'bg-bg-subtle text-accent': network !== 'mainnet',
    }"
  >
    {{ network }}
  </span>
</template>
