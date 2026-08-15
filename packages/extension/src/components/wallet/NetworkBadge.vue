<script setup lang="ts">
defineProps<{
  network: string
}>()
</script>

<template>
  <span class="rounded-full bg-bg-subtle px-2.5 py-1 text-xs text-text">
    {{ network }}
  </span>
</template>
