<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import SettingsPageShell from '../../components/settings/SettingsPageShell.vue'
import SettingsSection from '../../components/settings/SettingsSection.vue'

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

function editContact(contact: Contact) {
  const index = contacts.value.indexOf(contact)
  if (index < 0) return
  newName.value = contact.name
  newAddress.value = contact.address
  newTag.value = contact.tag ?? ''
  newNotes.value = contact.notes ?? ''
  editIndex.value = index
  showForm.value = true
}

function deleteContact(contact: Contact) {
  const index = contacts.value.indexOf(contact)
  if (index < 0 || !confirm(`Delete ${contact.name}?`)) return
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

onMounted(loadContacts)
</script>

<template>
  <SettingsPageShell title="Address Book" back-to="/settings" back-label="Back to Settings">
    <template #action>
      <Button
        :variant="showForm ? 'secondary' : 'ink'"
        @click="showForm ? resetForm() : (showForm = true)"
      >
        {{ showForm ? 'Cancel' : 'Add' }}
      </Button>
    </template>

    <div class="space-y-6 pt-2">
      <p class="px-1 text-sm leading-5 text-text-muted">
        Save trusted recipients and their destination tags.
      </p>

      <SettingsSection v-if="showForm" :title="editIndex !== null ? 'Edit Contact' : 'New Contact'">
        <form class="space-y-4 p-4" @submit.prevent="addContact">
          <Input v-model="newName" label="Name" autocomplete="off" placeholder="Contact name" />
          <Input
            v-model="newAddress"
            label="XRPL address"
            autocomplete="off"
            placeholder="rAddress..."
          />
          <Input
            v-model="newTag"
            label="Destination tag (optional)"
            autocomplete="off"
            placeholder="12345"
          />
          <Input
            v-model="newNotes"
            label="Notes (optional)"
            autocomplete="off"
            placeholder="How you know this address"
          />
          <Button
            type="submit"
            variant="ink"
            block
            :disabled="!newName.trim() || !newAddress.trim()"
          >
            {{ editIndex !== null ? 'Update Contact' : 'Save Contact' }}
          </Button>
        </form>
      </SettingsSection>

      <Input
        v-if="contacts.length > 0"
        v-model="searchQuery"
        label="Search contacts"
        placeholder="Name or address"
      />

      <div
        v-if="filteredContacts.length === 0 && !showForm"
        class="flex min-h-64 flex-col items-center justify-center rounded-[22px] border border-border bg-bg-subtle px-8 text-center shadow-card"
      >
        <span
          class="flex h-14 w-14 items-center justify-center rounded-full bg-bg-hover text-text-muted"
        >
          <svg
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M16 20v-1.5a4.5 4.5 0 00-4.5-4.5h-3A4.5 4.5 0 004 18.5V20m6-10a3 3 0 100-6 3 3 0 000 6zm7-1v6m3-3h-6"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <h2 class="mt-4 text-base font-bold">
          {{ searchQuery ? 'No matching contacts' : 'No contacts yet' }}
        </h2>
        <p class="mt-1 text-xs leading-5 text-text-muted">
          {{ searchQuery ? 'Try a different name or address.' : 'Add addresses you use often.' }}
        </p>
      </div>

      <SettingsSection v-else-if="filteredContacts.length > 0" title="Contacts">
        <div
          v-for="contact in filteredContacts"
          :key="`${contact.address}:${contact.tag ?? ''}`"
          class="flex min-h-[76px] items-center gap-2 px-3 py-3"
        >
          <div class="min-w-0 flex-1 pl-1">
            <p class="truncate text-sm font-semibold">{{ contact.name }}</p>
            <p class="mt-0.5 truncate font-mono text-xs text-text-muted">{{ contact.address }}</p>
            <p v-if="contact.tag" class="mt-1 text-[11px] text-text-muted">
              Destination tag {{ contact.tag }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted transition hover:bg-bg-hover hover:text-text focus:outline-none focus:ring-2 focus:ring-text"
            :aria-label="`Edit ${contact.name}`"
            @click="editContact(contact)"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.41-9.41a2 2 0 112.82 2.82L11.83 15H9v-2.83l8.59-8.58z"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted transition hover:bg-danger/10 hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger"
            :aria-label="`Delete ${contact.name}`"
            @click="deleteContact(contact)"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-2-1.86L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </SettingsSection>
    </div>
  </SettingsPageShell>
</template>
