<script setup lang="ts">
import { computed } from 'vue'

const model = defineModel<string>({ required: true })

const wordCount = computed(() => {
  const trimmed = model.value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
})

const isValidCount = computed(() => wordCount.value === 12 || wordCount.value === 24)
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      Recovery Phrase
    </label>
    <textarea
      v-model="model"
      rows="4"
      class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
      placeholder="Enter your 12 or 24 word recovery phrase..."
    />
    <p class="mt-1 text-xs" :class="isValidCount ? 'text-green-600' : 'text-gray-500'">
      {{ wordCount }} / {{ wordCount > 12 ? 24 : 12 }} words
    </p>
  </div>
</template>
