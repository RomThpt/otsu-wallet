<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <section class="space-y-2.5">
    <div v-if="title || description" class="px-1">
      <h2 v-if="title" class="text-sm font-bold text-text">{{ title }}</h2>
      <p v-if="description" class="mt-0.5 text-xs leading-5 text-text-muted">{{ description }}</p>
    </div>
    <div
      class="overflow-hidden rounded-[22px] border border-border bg-bg-subtle shadow-card divide-y divide-border"
    >
      <slot />
    </div>
  </section>
</template>
