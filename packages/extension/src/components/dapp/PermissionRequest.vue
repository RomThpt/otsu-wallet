<script setup lang="ts">
defineProps<{
  methods: string[]
}>()
</script>

<template>
  <div class="space-y-2">
    <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Requested Methods</p>
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="method in methods"
        :key="method"
        class="inline-flex items-center text-xs font-mono px-2 py-1 rounded-md bg-bg-subtle text-text border border-border"
      >
        {{ method }}
      </span>
    </div>
  </div>
</template>
