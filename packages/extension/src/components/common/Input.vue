<script setup lang="ts">
import { computed, useId } from 'vue'

const props = defineProps<{
  label?: string
  error?: string
  hint?: string
  type?: string
  placeholder?: string
  disabled?: boolean
}>()

const model = defineModel<string>()
const inputId = useId()
const messageId = computed(() => (props.error || props.hint ? `${inputId}-message` : undefined))
</script>

<template>
  <div class="form-field">
    <label v-if="label" :for="inputId" class="form-label">
      {{ label }}
    </label>
    <input
      :id="inputId"
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="messageId"
      class="form-control"
      :class="{ 'form-control-error': error }"
    />
    <p v-if="error" :id="messageId" class="form-error">{{ error }}</p>
    <p v-else-if="hint" :id="messageId" class="form-help">{{ hint }}</p>
  </div>
</template>
