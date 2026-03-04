<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

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
  <div class="relative">
    <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {{ label }}
    </label>
    <input
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      class="block w-full rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
      :class="[
        error ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600',
      ]"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <!-- Suggestions dropdown -->
    <div
      v-if="shouldShowSuggestions"
      class="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-40 overflow-y-auto"
    >
      <button
        v-for="contact in filteredContacts"
        :key="contact.address"
        type="button"
        class="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        @mousedown.prevent="selectContact(contact)"
      >
        <p class="text-sm font-medium">{{ contact.name }}</p>
        <p class="text-xs text-gray-500 font-mono truncate">{{ contact.address }}</p>
      </button>
    </div>

    <p v-if="error" class="mt-1 text-xs text-red-500">{{ error }}</p>
  </div>
</template>
