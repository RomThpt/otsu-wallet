<script setup lang="ts">
defineProps<{
  label?: string
  disabled?: boolean
}>()

const model = defineModel<boolean>()
</script>

<template>
  <label class="inline-flex items-center gap-2 cursor-pointer" :class="{ 'opacity-50': disabled }">
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :disabled="disabled"
      :class="[
        'relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-2',
        model ? 'bg-accent' : 'bg-bg-hover',
      ]"
      @click="model = !model"
    >
      <span
        :class="[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-bg shadow transform transition-transform',
          model ? 'translate-x-5' : 'translate-x-0',
        ]"
      />
    </button>
    <span v-if="label" class="text-sm text-text">{{ label }}</span>
  </label>
</template>
