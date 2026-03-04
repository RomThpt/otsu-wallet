<script setup lang="ts">
defineProps<{
  methods: string[]
}>()
</script>

<template>
  <div class="space-y-2">
    <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      Requested Methods
    </p>
    <div class="flex flex-wrap gap-1.5">
      <span
        v-for="method in methods"
        :key="method"
        class="inline-flex items-center text-xs font-mono px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
      >
        {{ method }}
      </span>
    </div>
  </div>
</template>
