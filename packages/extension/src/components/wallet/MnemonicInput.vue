<script setup lang="ts">
import { computed, useId } from 'vue'

const model = defineModel<string>({ required: true })
const inputId = useId()

const wordCount = computed(() => {
  const trimmed = model.value.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
})

const isValidCount = computed(() => wordCount.value === 12 || wordCount.value === 24)
</script>

<template>
  <div class="form-field">
    <label :for="inputId" class="form-label">Recovery Phrase</label>
    <textarea
      :id="inputId"
      v-model="model"
      rows="4"
      class="form-textarea font-mono"
      placeholder="Enter your 12 or 24 word recovery phrase..."
    />
    <p class="form-help" :class="{ 'text-success': isValidCount }">
      {{ wordCount }} / {{ wordCount > 12 ? 24 : 12 }} words
    </p>
  </div>
</template>
