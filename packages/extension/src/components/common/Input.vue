<script setup lang="ts">
defineProps<{
  label?: string
  error?: string
  hint?: string
  type?: string
  placeholder?: string
  disabled?: boolean
}>()

const model = defineModel<string>()
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ label }}
    </label>
    <input
      v-model="model"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :disabled="disabled"
      :class="[
        'block w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
        error
          ? 'border-red-500 text-red-900 dark:text-red-400'
          : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      ]"
    />
    <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-gray-500 dark:text-gray-400">{{ hint }}</p>
  </div>
</template>
