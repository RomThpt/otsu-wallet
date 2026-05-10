<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const rows = ref<string[]>(Array(8).fill(''))

const fullValue = computed(() => rows.value.join(' '))

const validations = computed(() =>
  rows.value.map((row) => {
    if (row.length !== 6) return null
    const value = parseInt(row.slice(0, 5), 10)
    const checksum = parseInt(row[5], 10)
    return value % 9 === checksum
  }),
)

function handleInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  let value = input.value.replace(/\D/g, '').slice(0, 6)
  rows.value[index] = value
  emit('update:value', fullValue.value)

  if (value.length === 6 && index < 7) {
    const nextInput = input.parentElement?.parentElement?.querySelectorAll('input')[index + 1]
    nextInput?.focus()
  }
}
</script>

<template>
  <div>
    <label class="block text-sm font-medium text-text mb-2"> Xumm Secret Numbers </label>
    <div class="space-y-2">
      <div v-for="(_, i) in 8" :key="i" class="flex items-center gap-2">
        <span class="text-xs text-text-muted w-4 text-right">{{ i + 1 }}</span>
        <input
          :value="rows[i]"
          type="text"
          inputmode="numeric"
          maxlength="6"
          class="block w-full rounded-lg border px-3 py-1.5 text-sm font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-link"
          :class="{
            'border-border bg-bg text-text': validations[i] === null || validations[i] === true,
            'border-danger bg-bg-subtle text-danger': validations[i] === false,
          }"
          placeholder="000000"
          @input="handleInput(i, $event)"
        />
        <span v-if="validations[i] === true" class="text-success text-xs">ok</span>
        <span v-else-if="validations[i] === false" class="text-danger text-xs">err</span>
        <span v-else class="w-4" />
      </div>
    </div>
  </div>
</template>
