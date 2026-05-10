<script setup lang="ts">
defineProps<{
  type: 'hd' | 'imported' | 'hardware' | 'multisig'
}>()
</script>

<template>
  <span
    class="inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold"
    :class="{
      'bg-bg-subtle text-accent': type === 'hd',
      'bg-bg-subtle text-warning': type === 'imported',
      'bg-bg-subtle text-link': type === 'hardware',
      'bg-bg-subtle text-text-muted': type === 'multisig',
    }"
    :title="type"
  >
    {{ type === 'hd' ? 'H' : type === 'imported' ? 'I' : type === 'hardware' ? 'L' : 'M' }}
  </span>
</template>
