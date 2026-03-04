<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'

const router = useRouter()

interface Contact {
  name: string
  address: string
  tag?: string
  notes?: string
}

const STORAGE_KEY = 'otsu-address-book'
const contacts = ref<Contact[]>([])
const showForm = ref(false)
const searchQuery = ref('')
const newName = ref('')
const newAddress = ref('')
const newTag = ref('')
const newNotes = ref('')
const editIndex = ref<number | null>(null)

async function loadContacts() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    contacts.value = (result[STORAGE_KEY] as Contact[]) ?? []
  } catch {
    contacts.value = []
  }
}

async function saveContacts() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: contacts.value })
  } catch {
    // Storage may not be available
  }
}

const filteredContacts = computed(() => {
  if (!searchQuery.value) return contacts.value
  const q = searchQuery.value.toLowerCase()
  return contacts.value.filter(
    (c) => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q),
  )
})

function addContact() {
  if (!newName.value || !newAddress.value) return

  const contact: Contact = {
    name: newName.value,
    address: newAddress.value,
    tag: newTag.value || undefined,
    notes: newNotes.value || undefined,
  }

  if (editIndex.value !== null) {
    contacts.value[editIndex.value] = contact
    editIndex.value = null
  } else {
    contacts.value.push(contact)
  }

  saveContacts()
  resetForm()
}

function editContact(index: number) {
  const contact = contacts.value[index]
  newName.value = contact.name
  newAddress.value = contact.address
  newTag.value = contact.tag ?? ''
  newNotes.value = contact.notes ?? ''
  editIndex.value = index
  showForm.value = true
}

function deleteContact(index: number) {
  if (!confirm(`Delete ${contacts.value[index].name}?`)) return
  contacts.value.splice(index, 1)
  saveContacts()
}

function resetForm() {
  newName.value = ''
  newAddress.value = ''
  newTag.value = ''
  newNotes.value = ''
  editIndex.value = null
  showForm.value = false
}

loadContacts()
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <button
          aria-label="Back"
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          @click="router.back()"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 class="text-sm font-bold">Address Book</h2>
      </div>
      <Button size="sm" @click="showForm = !showForm">{{ showForm ? 'Cancel' : 'Add' }}</Button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Add/Edit form -->
      <div v-if="showForm" class="p-4 space-y-2 border-b border-gray-200 dark:border-gray-700">
        <Input v-model="newName" label="Name" placeholder="Contact name" />
        <Input v-model="newAddress" label="Address" placeholder="rAddress..." />
        <Input v-model="newTag" label="Destination Tag (optional)" placeholder="e.g. 12345" />
        <Input v-model="newNotes" label="Notes (optional)" placeholder="..." />
        <Button size="sm" block :disabled="!newName || !newAddress" @click="addContact">
          {{ editIndex !== null ? 'Update' : 'Save' }}
        </Button>
      </div>

      <!-- Search -->
      <div v-if="contacts.length > 0" class="px-4 py-2">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search contacts..."
          class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <!-- Contact list -->
      <div
        v-if="filteredContacts.length === 0 && !showForm"
        class="flex-1 flex items-center justify-center p-4"
      >
        <div class="text-center">
          <p class="text-sm text-gray-500">No contacts</p>
          <p class="text-xs text-gray-400 mt-1">Add addresses for quick access</p>
        </div>
      </div>

      <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <div
          v-for="(contact, i) in filteredContacts"
          :key="contact.address"
          class="px-4 py-3 flex items-center justify-between"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">{{ contact.name }}</p>
            <p class="text-xs text-gray-500 font-mono truncate">{{ contact.address }}</p>
            <p v-if="contact.tag" class="text-[10px] text-gray-400">Tag: {{ contact.tag }}</p>
          </div>
          <div class="flex gap-1 ml-2">
            <button class="p-1 text-gray-400 hover:text-gray-600" @click="editContact(i)">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
            <button class="p-1 text-gray-400 hover:text-red-500" @click="deleteContact(i)">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
