<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true
  try {
    await settingsStore.fetchPermissions()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function handleRevoke(origin: string) {
  try {
    await settingsStore.revokePermission(origin)
  } catch (e) {
    error.value = (e as Error).message
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
      <h2 class="text-sm font-bold">Connected dApps</h2>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div
        class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full"
      />
    </div>

    <div
      v-else-if="settingsStore.permissions.length === 0"
      class="flex-1 flex items-center justify-center p-4"
    >
      <p class="text-sm text-gray-500">No connected dApps</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
      <div
        v-for="permission in settingsStore.permissions"
        :key="permission.origin"
        class="flex items-center gap-3 px-4 py-3"
      >
        <img
          v-if="permission.favicon"
          :src="permission.favicon"
          :alt="permission.title || permission.origin"
          class="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 object-cover flex-shrink-0"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <div
          v-else
          class="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"
        >
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ permission.title || permission.origin }}</p>
          <p class="text-xs text-gray-500 truncate">{{ permission.origin }}</p>
          <p class="text-xs text-gray-400">Connected {{ formatDate(permission.connectedAt) }}</p>
          <div v-if="permission.scopes?.length" class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="scope in permission.scopes"
              :key="scope"
              class="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              {{ scope }}
            </span>
          </div>
        </div>

        <button
          class="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0"
          @click="handleRevoke(permission.origin)"
        >
          Revoke
        </button>
      </div>
    </div>

    <p v-if="error" class="px-4 py-2 text-xs text-red-500">{{ error }}</p>
  </div>
</template>
