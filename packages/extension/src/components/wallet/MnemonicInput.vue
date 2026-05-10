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
    <label class="block text-sm font-medium text-text mb-1"> Recovery Phrase </label>
    <textarea
      v-model="model"
      rows="4"
      class="block w-full rounded-lg border border-border px-3 py-2 text-sm bg-bg text-text focus:outline-none focus:ring-2 focus:ring-link font-mono"
      placeholder="Enter your 12 or 24 word recovery phrase..."
    />
    <p class="mt-1 text-xs" :class="isValidCount ? 'text-success' : 'text-text-muted'">
      {{ wordCount }} / {{ wordCount > 12 ? 24 : 12 }} words
    </p>
  </div>
</template>
