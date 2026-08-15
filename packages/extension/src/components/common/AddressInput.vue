<script setup lang="ts">
import { ref, computed, watch, onMounted, useId } from 'vue'

interface Contact {
  name: string
  address: string
  tag?: string
}

const STORAGE_KEY = 'otsu-address-book'

const props = defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select-contact': [contact: Contact]
}>()

const contacts = ref<Contact[]>([])
const showSuggestions = ref(false)
const inputFocused = ref(false)
const inputId = useId()
const errorId = `${inputId}-error`

const filteredContacts = computed(() => {
  if (!props.modelValue) return contacts.value.slice(0, 5)
  const q = props.modelValue.toLowerCase()
  return contacts.value
    .filter((c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q))
    .slice(0, 5)
})

const shouldShowSuggestions = computed(
  () => inputFocused.value && showSuggestions.value && filteredContacts.value.length > 0,
)

watch(
  () => props.modelValue,
  () => {
    showSuggestions.value = true
  },
)

function selectContact(contact: Contact) {
  emit('update:modelValue', contact.address)
  emit('select-contact', contact)
  showSuggestions.value = false
}

function handleFocus() {
  inputFocused.value = true
  showSuggestions.value = true
}

function handleBlur() {
  // Delay to allow click on suggestion
  setTimeout(() => {
    inputFocused.value = false
  }, 200)
}

onMounted(async () => {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    contacts.value = (result[STORAGE_KEY] as Contact[]) ?? []
  } catch {
    contacts.value = []
  }
})
</script>

<template>
  <div class="form-field relative">
    <label v-if="label" :for="inputId" class="form-label">
      {{ label }}
    </label>
    <input
      :id="inputId"
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="error ? errorId : undefined"
      class="form-control font-mono"
      :class="{ 'form-control-error': error }"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <!-- Suggestions dropdown -->
    <div
      v-if="shouldShowSuggestions"
      class="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto rounded-[14px] border border-border bg-bg-subtle p-1 shadow-card"
    >
      <button
        v-for="contact in filteredContacts"
        :key="contact.address"
        type="button"
        class="w-full rounded-[10px] px-3 py-2 text-left transition-colors hover:bg-bg-hover"
        @mousedown.prevent="selectContact(contact)"
      >
        <p class="text-sm font-medium">{{ contact.name }}</p>
        <p class="text-xs text-text-muted font-mono truncate">{{ contact.address }}</p>
      </button>
    </div>

    <p v-if="error" :id="errorId" class="form-error">{{ error }}</p>
  </div>
</template>
