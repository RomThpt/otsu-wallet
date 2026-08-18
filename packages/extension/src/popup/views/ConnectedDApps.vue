<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettingsStore } from '../../stores/settings'
import Button from '../../components/common/Button.vue'
import SettingsPageShell from '../../components/settings/SettingsPageShell.vue'
import SettingsSection from '../../components/settings/SettingsSection.vue'

const settingsStore = useSettingsStore()
const loading = ref(false)
const error = ref('')
const confirmingOrigin = ref<string | null>(null)
const revokingOrigin = ref<string | null>(null)
const brokenFavicons = ref(new Set<string>())

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
  revokingOrigin.value = origin
  error.value = ''
  try {
    await settingsStore.revokePermission(origin)
    confirmingOrigin.value = null
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    revokingOrigin.value = null
  }
}

function markFaviconBroken(origin: string) {
  brokenFavicons.value = new Set([...brokenFavicons.value, origin])
}
</script>

<template>
  <SettingsPageShell title="Connected dApps" back-to="/settings" back-label="Back to Settings">
    <div class="space-y-6 pt-2">
      <p class="px-1 text-sm leading-5 text-text-muted">
        Review websites that can view your wallet or request transactions.
      </p>

      <div v-if="loading" class="flex min-h-72 items-center justify-center" role="status">
        <div
          class="h-6 w-6 animate-spin rounded-full border-2 border-text-muted/30 border-t-text"
        />
        <span class="sr-only">Loading connected dApps</span>
      </div>

      <div
        v-else-if="settingsStore.permissions.length === 0"
        class="flex min-h-72 flex-col items-center justify-center rounded-[22px] border border-border bg-bg-subtle px-8 text-center shadow-card"
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
              d="M8.5 12.5l3 3 6-7M12 3.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17z"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <h2 class="mt-4 text-base font-bold">No connected dApps</h2>
        <p class="mt-1 text-xs leading-5 text-text-muted">Sites you approve will appear here.</p>
      </div>

      <SettingsSection v-else title="Connections">
        <div v-for="permission in settingsStore.permissions" :key="permission.origin" class="p-4">
          <div class="flex items-start gap-3">
            <img
              v-if="permission.favicon && !brokenFavicons.has(permission.origin)"
              :src="permission.favicon"
              alt=""
              class="h-10 w-10 shrink-0 rounded-xl bg-bg-hover object-cover"
              @error="markFaviconBroken(permission.origin)"
            />
            <div
              v-else
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-hover"
            >
              <svg
                class="h-5 w-5 text-text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </div>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold">
                {{ permission.title || permission.origin }}
              </p>
              <p class="mt-0.5 truncate text-xs text-text-muted">{{ permission.origin }}</p>
              <p class="mt-1 text-[11px] text-text-muted">
                Connected {{ formatDate(permission.connectedAt) }}
              </p>
            </div>
          </div>

          <div v-if="permission.scopes?.length" class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="scope in permission.scopes"
              :key="scope"
              class="rounded-full bg-bg-hover px-2 py-1 text-[10px] font-medium text-text-muted"
            >
              {{ scope }}
            </span>
          </div>

          <div
            v-if="confirmingOrigin === permission.origin"
            class="mt-4 rounded-2xl bg-danger/5 p-3"
          >
            <p class="text-xs leading-5 text-text">Disconnect this site from Otsu?</p>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" @click="confirmingOrigin = null">Cancel</Button>
              <Button
                variant="danger"
                :loading="revokingOrigin === permission.origin"
                @click="handleRevoke(permission.origin)"
                >Disconnect</Button
              >
            </div>
          </div>
          <Button
            v-else
            class="mt-3"
            variant="ghost"
            block
            @click="confirmingOrigin = permission.origin"
          >
            Disconnect
          </Button>
        </div>
      </SettingsSection>

      <p v-if="error" class="text-center text-xs text-danger" role="alert">{{ error }}</p>
    </div>
  </SettingsPageShell>
</template>
