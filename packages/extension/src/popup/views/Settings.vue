<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import { useWalletStore } from '../../stores/wallet'
import { useIdentityStore } from '../../stores/identity'
import { useTheme } from '../../composables/useTheme'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const wallet = useWalletStore()
const identity = useIdentityStore()
const { setTheme: applyThemeToDOM } = useTheme()
const loading = ref(false)
const error = ref('')
const identityError = ref('')

// Security / auth method state
const changingAuth = ref(false)
const authError = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPasswordFields = ref(false)
const passkeySupported = ref(false)

const AUTO_LOCK_OPTIONS = [
  { value: 1, label: '1 minute' },
  { value: 5, label: '5 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '60 minutes' },
]

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
  { value: 'system' as const, label: 'System' },
]

const blindSigning = computed(() => settingsStore.settings?.blindSigningEnabled ?? false)
const autoLockMinutes = computed(() => settingsStore.settings?.autoLockMinutes ?? 15)
const theme = computed(() => settingsStore.settings?.theme ?? 'system')

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([settingsStore.fetchSettings(), identity.fetchState()])
    passkeySupported.value =
      typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})

async function toggleBlindSigning() {
  try {
    await settingsStore.updateSettings({ blindSigningEnabled: !blindSigning.value })
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function setAutoLock(minutes: number) {
  try {
    await settingsStore.updateSettings({ autoLockMinutes: minutes })
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function setTheme(value: 'light' | 'dark' | 'system') {
  try {
    applyThemeToDOM(value)
    await settingsStore.updateSettings({ theme: value })
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function switchToPasskey() {
  changingAuth.value = true
  authError.value = ''
  try {
    await wallet.changeAuthMethod('passkey')
  } catch (e) {
    authError.value = (e as Error).message
  } finally {
    changingAuth.value = false
  }
}

async function switchToPassword() {
  if (!showPasswordFields.value) {
    showPasswordFields.value = true
    return
  }
  authError.value = ''
  if (newPassword.value.length < 8) {
    authError.value = 'Password must be at least 8 characters'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    authError.value = 'Passwords do not match'
    return
  }
  changingAuth.value = true
  try {
    await wallet.changeAuthMethod('password', newPassword.value)
    showPasswordFields.value = false
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    authError.value = (e as Error).message
  } finally {
    changingAuth.value = false
  }
}

async function handleLock() {
  await wallet.lock()
  router.push('/')
}

function cancelPasswordChange() {
  showPasswordFields.value = false
  newPassword.value = ''
  confirmPassword.value = ''
  authError.value = ''
}

async function handleIdentityLogin() {
  identityError.value = ''
  try {
    await identity.login()
  } catch (e) {
    identityError.value = (e as Error).message
  }
}

async function handleIdentityLogout() {
  identityError.value = ''
  try {
    await identity.logout()
  } catch (e) {
    identityError.value = (e as Error).message
  }
}

async function handleLinkWallet() {
  identityError.value = ''
  if (!wallet.activeAccount) return
  try {
    await identity.linkWallet(wallet.activeAccount)
  } catch (e) {
    identityError.value = (e as Error).message
  }
}

async function handleUnlinkWallet() {
  identityError.value = ''
  try {
    await identity.unlinkWallet()
  } catch (e) {
    identityError.value = (e as Error).message
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
      <button class="p-1 rounded hover:bg-bg-hover transition-colors" @click="router.back()">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h2 class="text-sm font-bold">Settings</h2>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
    </div>

    <div v-else class="flex-1 overflow-y-auto">
      <!-- Blind Signing -->
      <div class="px-4 py-3.5 border-b border-border">
        <div class="flex items-center justify-between">
          <div class="flex-1 mr-3">
            <p class="text-sm font-medium">Blind Signing</p>
            <p class="text-xs text-danger mt-0.5">
              Allows signing transactions without full details. This is dangerous and may result in
              loss of funds.
            </p>
          </div>
          <button
            role="switch"
            :aria-checked="blindSigning"
            :class="[
              'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              blindSigning ? 'bg-accent' : 'bg-bg-hover',
            ]"
            @click="toggleBlindSigning"
          >
            <span
              :class="[
                'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform',
                blindSigning ? 'translate-x-4' : 'translate-x-0',
              ]"
            />
          </button>
        </div>
      </div>

      <!-- Auto-Lock Duration -->
      <div class="px-4 py-3.5 border-b border-border">
        <p class="text-sm font-medium mb-2">Auto-Lock</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="option in AUTO_LOCK_OPTIONS"
            :key="option.value"
            :class="[
              'px-3 py-1.5 text-xs rounded-md border transition-colors',
              autoLockMinutes === option.value
                ? 'border-accent bg-bg-subtle text-accent'
                : 'border-border hover:bg-bg-hover',
            ]"
            @click="setAutoLock(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Theme -->
      <div class="px-4 py-3.5 border-b border-border">
        <p class="text-sm font-medium mb-2">Theme</p>
        <div class="flex gap-2">
          <button
            v-for="option in THEME_OPTIONS"
            :key="option.value"
            :class="[
              'flex-1 px-3 py-2 text-xs rounded-md border transition-colors text-center',
              theme === option.value
                ? 'border-accent bg-bg-subtle text-accent'
                : 'border-border hover:bg-bg-hover',
            ]"
            @click="setTheme(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <!-- Security: Auth Method -->
      <div class="px-4 py-3.5 border-b border-border">
        <p class="text-sm font-medium mb-2">Security</p>
        <p class="text-xs text-text-muted mb-2">Authentication method</p>
        <div class="flex gap-2">
          <button
            :class="[
              'flex-1 px-3 py-2 text-xs rounded-md border transition-colors text-center',
              wallet.authMethod === 'password'
                ? 'border-accent bg-bg-subtle text-accent'
                : 'border-border hover:bg-bg-hover',
            ]"
            :disabled="changingAuth"
            @click="switchToPassword"
          >
            Password
          </button>
          <button
            :class="[
              'flex-1 px-3 py-2 text-xs rounded-md border transition-colors text-center',
              wallet.authMethod === 'passkey'
                ? 'border-accent bg-bg-subtle text-accent'
                : 'border-border hover:bg-bg-hover',
            ]"
            :disabled="changingAuth || !passkeySupported"
            @click="switchToPasskey"
          >
            Passkey
          </button>
        </div>

        <!-- Password fields when switching to password -->
        <div v-if="showPasswordFields" class="mt-3 space-y-2">
          <input
            v-model="newPassword"
            type="password"
            placeholder="New password (min 8 chars)"
            class="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-link"
          />
          <input
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm password"
            class="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg focus:outline-none focus:ring-1 focus:ring-link"
          />
          <div class="flex gap-2">
            <button
              class="flex-1 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-bg-hover transition-colors"
              @click="cancelPasswordChange"
            >
              Cancel
            </button>
            <button
              class="flex-1 px-3 py-1.5 text-xs rounded-md bg-accent text-accent-fg hover:opacity-90 transition-colors"
              :disabled="changingAuth"
              @click="switchToPassword"
            >
              Confirm
            </button>
          </div>
        </div>

        <div v-if="changingAuth" class="mt-2 flex items-center gap-2">
          <div
            class="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full"
          />
          <span class="text-xs text-text-muted">Switching...</span>
        </div>

        <p v-if="authError" class="mt-2 text-xs text-danger">{{ authError }}</p>

        <p v-if="!passkeySupported" class="mt-1 text-xs text-text-muted">
          Passkeys are not supported in this browser.
        </p>
      </div>

      <!-- Identity -->
      <div class="px-4 py-3.5 border-b border-border">
        <p class="text-sm font-medium mb-2">Identity</p>

        <template v-if="!identity.loggedIn">
          <p class="text-xs text-text-muted mb-2">
            Connect your xrp-identity account to link your wallet address to your profile.
          </p>
          <button
            class="w-full px-3 py-2 text-xs rounded-md bg-accent text-accent-fg hover:opacity-90 transition-colors"
            :disabled="identity.loading"
            @click="handleIdentityLogin"
          >
            Connect Identity
          </button>
        </template>

        <template v-else>
          <div class="flex items-center gap-3 mb-3">
            <img
              v-if="identity.avatarUrl"
              :src="identity.avatarUrl"
              :alt="identity.displayName ?? ''"
              class="h-8 w-8 rounded-full object-cover"
            />
            <div
              v-else
              class="h-8 w-8 rounded-full bg-bg-subtle text-accent flex items-center justify-center text-xs font-medium"
            >
              {{ identity.initials }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ identity.displayName }}</p>
              <p v-if="identity.profile?.email" class="text-xs text-text-muted truncate">
                {{ identity.profile.email }}
              </p>
            </div>
          </div>

          <!-- Wallet linking -->
          <div v-if="identity.linkedAddress" class="mb-2">
            <p class="text-xs text-text-muted mb-1">Linked wallet</p>
            <div class="flex items-center justify-between">
              <code class="text-xs font-mono truncate flex-1 mr-2">{{
                identity.linkedAddress
              }}</code>
              <button
                class="text-xs text-danger hover:opacity-80 whitespace-nowrap"
                :disabled="identity.loading"
                @click="handleUnlinkWallet"
              >
                Unlink
              </button>
            </div>
          </div>
          <button
            v-else
            class="w-full px-3 py-1.5 text-xs rounded-md border border-accent text-accent hover:bg-bg-subtle transition-colors mb-2"
            :disabled="identity.loading || !wallet.activeAccount"
            @click="handleLinkWallet"
          >
            Link Current Wallet
          </button>

          <button
            class="w-full px-3 py-1.5 text-xs rounded-md border border-border hover:bg-bg-hover transition-colors text-text-muted"
            :disabled="identity.loading"
            @click="handleIdentityLogout"
          >
            Disconnect
          </button>
        </template>

        <div v-if="identity.loading" class="mt-2 flex items-center gap-2">
          <div
            class="animate-spin h-3 w-3 border-2 border-accent border-t-transparent rounded-full"
          />
          <span class="text-xs text-text-muted">Loading...</span>
        </div>

        <p v-if="identityError" class="mt-2 text-xs text-danger">{{ identityError }}</p>
      </div>

      <!-- Networks -->
      <button
        class="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-bg-hover transition-colors"
        @click="router.push('/settings/networks')"
      >
        <span class="text-sm font-medium">Networks</span>
        <svg class="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Address Book -->
      <button
        class="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-bg-hover transition-colors"
        @click="router.push('/address-book')"
      >
        <span class="text-sm font-medium">Address Book</span>
        <svg class="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Backup Seed Phrase -->
      <button
        class="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-bg-hover transition-colors"
        @click="router.push('/settings/backup')"
      >
        <span class="text-sm font-medium">Backup Seed Phrase</span>
        <svg class="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Connected dApps -->
      <button
        class="w-full flex items-center justify-between px-4 py-3.5 border-b border-border hover:bg-bg-hover transition-colors"
        @click="router.push('/settings/dapps')"
      >
        <span class="text-sm font-medium">Connected dApps</span>
        <svg class="h-4 w-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Lock Wallet -->
      <div class="p-4">
        <Button variant="danger" block @click="handleLock"> Lock Wallet </Button>
      </div>
    </div>

    <p v-if="error" class="px-4 py-2 text-xs text-danger">{{ error }}</p>
  </div>
</template>
