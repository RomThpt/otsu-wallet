<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  origin: string
  favicon?: string
  title?: string
}>()

const fallbackLetter = computed(() => {
  try {
    const hostname = new URL(props.origin).hostname
    return hostname.charAt(0).toUpperCase()
  } catch {
    return props.origin.charAt(0).toUpperCase()
  }
})
</script>

<template>
  <div class="flex items-center gap-3">
    <!-- Favicon -->
    <div
      class="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 overflow-hidden"
    >
      <img
        v-if="favicon"
        :src="favicon"
        :alt="origin"
        class="w-6 h-6 object-contain"
        @error="($event.target as HTMLImageElement).style.display = 'none'"
      />
      <span v-else class="text-sm font-bold text-gray-500 dark:text-gray-400">{{
        fallbackLetter
      }}</span>
    </div>

    <!-- Origin + Title -->
    <div class="min-w-0">
      <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ origin }}</p>
      <p v-if="title" class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ title }}</p>
    </div>
  </div>
</template>
