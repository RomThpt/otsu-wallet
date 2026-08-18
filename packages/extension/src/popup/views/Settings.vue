<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '../../stores/settings'
import { useWalletStore } from '../../stores/wallet'
import { useIdentityStore } from '../../stores/identity'
import { useTheme } from '../../composables/useTheme'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import SettingsPageShell from '../../components/settings/SettingsPageShell.vue'
import SettingsSection from '../../components/settings/SettingsSection.vue'

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

const SETTINGS_LINKS = [
  {
    title: 'Networks',
    detail: 'RPC connections and custom networks',
    path: '/settings/networks',
  },
  {
    title: 'Address Book',
    detail: 'Saved recipients and destination tags',
    path: '/address-book',
  },
  {
    title: 'Backup Seed Phrase',
    detail: 'Reveal and secure your recovery phrase',
    path: '/settings/backup',
  },
  {
    title: 'Connected dApps',
    detail: 'Review and revoke site permissions',
    path: '/settings/dapps',
  },
]

const blindSigning = computed(() => settingsStore.settings?.blindSigningEnabled ?? false)
const autoLockMinutes = computed(() => settingsStore.settings?.autoLockMinutes ?? 15)
const theme = computed(() => settingsStore.settings?.theme ?? 'system')

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([settingsStore.fetchSettings(), identity.fetchState()])
    passkeySupported.value =
      typeof window !== 'undefined' &&
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
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
  <SettingsPageShell title="Settings" back-to="/" back-label="Back to wallet">
    <div v-if="loading" class="flex min-h-[420px] items-center justify-center" role="status">
      <div class="h-6 w-6 animate-spin rounded-full border-2 border-text-muted/30 border-t-text" />
      <span class="sr-only">Loading Settings</span>
    </div>

    <div v-else class="space-y-6 pt-2">
      <p class="px-1 text-sm leading-5 text-text-muted">
        Manage how Otsu looks, locks, and connects.
      </p>

      <SettingsSection title="Preferences">
        <div class="flex min-h-16 items-center justify-between gap-4 px-4 py-3">
          <div>
            <p class="text-sm font-semibold">Auto-lock</p>
            <p class="mt-0.5 text-xs text-text-muted">Lock after inactivity</p>
          </div>
          <select
            class="form-select !h-11 !w-32 !rounded-xl"
            :value="autoLockMinutes"
            aria-label="Auto-lock duration"
            @change="setAutoLock(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="option in AUTO_LOCK_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="px-4 py-3.5">
          <p class="text-sm font-semibold">Theme</p>
          <div
            class="mt-3 grid grid-cols-3 rounded-2xl bg-bg-hover p-1"
            role="group"
            aria-label="Theme"
          >
            <button
              v-for="option in THEME_OPTIONS"
              :key="option.value"
              type="button"
              class="min-h-11 rounded-xl px-2 text-xs font-semibold transition"
              :class="
                theme === option.value
                  ? 'bg-text text-bg-subtle shadow-sm'
                  : 'text-text-muted hover:text-text'
              "
              :aria-pressed="theme === option.value"
              @click="setTheme(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Security"
        description="Control access to your wallet and transaction approvals."
      >
        <div class="px-4 py-3.5">
          <p class="text-sm font-semibold">Authentication</p>
          <div
            class="mt-3 grid grid-cols-2 rounded-2xl bg-bg-hover p-1"
            role="group"
            aria-label="Authentication method"
          >
            <button
              type="button"
              class="min-h-11 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              :class="
                wallet.authMethod === 'password'
                  ? 'bg-text text-bg-subtle shadow-sm'
                  : 'text-text-muted hover:text-text'
              "
              :aria-pressed="wallet.authMethod === 'password'"
              :disabled="changingAuth"
              @click="switchToPassword"
            >
              Password
            </button>
            <button
              type="button"
              class="min-h-11 rounded-xl text-xs font-semibold transition disabled:opacity-50"
              :class="
                wallet.authMethod === 'passkey'
                  ? 'bg-text text-bg-subtle shadow-sm'
                  : 'text-text-muted hover:text-text'
              "
              :aria-pressed="wallet.authMethod === 'passkey'"
              :disabled="changingAuth || !passkeySupported"
              @click="switchToPasskey"
            >
              Passkey
            </button>
          </div>

          <div v-if="showPasswordFields" class="mt-4 space-y-3">
            <Input
              v-model="newPassword"
              label="New password"
              type="password"
              autocomplete="new-password"
              placeholder="At least 8 characters"
            />
            <Input
              v-model="confirmPassword"
              label="Confirm password"
              type="password"
              autocomplete="new-password"
              placeholder="Repeat password"
            />
            <div class="flex gap-2">
              <Button variant="secondary" block @click="cancelPasswordChange">Cancel</Button>
              <Button variant="ink" block :loading="changingAuth" @click="switchToPassword"
                >Confirm</Button
              >
            </div>
          </div>

          <p v-if="changingAuth" class="mt-3 text-xs text-text-muted" role="status">
            Updating authentication…
          </p>
          <p v-if="authError" class="mt-3 text-xs text-danger" role="alert">{{ authError }}</p>
          <p v-if="!passkeySupported" class="mt-2 text-xs text-text-muted">
            Passkeys are not supported on this device.
          </p>
        </div>

        <div class="flex items-center justify-between gap-4 px-4 py-3.5">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold">Blind signing</p>
            <p class="mt-0.5 text-xs leading-4 text-danger">
              Sign transactions whose full effects cannot be decoded.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Blind signing"
            :aria-checked="blindSigning"
            class="relative inline-flex h-11 w-14 shrink-0 items-center rounded-full p-1.5 transition focus:outline-none focus:ring-2 focus:ring-text focus:ring-offset-2 focus:ring-offset-bg-subtle"
            :class="blindSigning ? 'bg-danger/10' : 'bg-bg-hover'"
            @click="toggleBlindSigning"
          >
            <span
              class="h-6 w-6 rounded-full shadow transition-transform"
              :class="blindSigning ? 'translate-x-4 bg-danger' : 'bg-text-muted'"
            />
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Identity">
        <div class="p-4">
          <template v-if="!identity.loggedIn">
            <p class="text-xs leading-5 text-text-muted">
              Connect your xrp-identity profile and optionally link the current wallet address.
            </p>
            <Button
              class="mt-3"
              variant="ink"
              block
              :loading="identity.loading"
              @click="handleIdentityLogin"
              >Connect Identity</Button
            >
          </template>
          <template v-else>
            <div class="flex items-center gap-3">
              <img
                v-if="identity.avatarUrl"
                :src="identity.avatarUrl"
                :alt="identity.displayName ?? ''"
                class="h-10 w-10 rounded-full object-cover"
              />
              <div
                v-else
                class="flex h-10 w-10 items-center justify-center rounded-full bg-bg-hover text-sm font-bold"
              >
                {{ identity.initials }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold">{{ identity.displayName }}</p>
                <p v-if="identity.profile?.email" class="truncate text-xs text-text-muted">
                  {{ identity.profile.email }}
                </p>
              </div>
            </div>
            <div v-if="identity.linkedAddress" class="mt-3 rounded-xl bg-bg-hover p-3">
              <p class="text-[11px] text-text-muted">Linked wallet</p>
              <div class="mt-1 flex items-center gap-2">
                <code class="min-w-0 flex-1 truncate text-xs">{{ identity.linkedAddress }}</code>
                <button
                  type="button"
                  class="flex min-h-11 items-center rounded-xl px-2 text-xs font-semibold text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
                  :disabled="identity.loading"
                  @click="handleUnlinkWallet"
                >
                  Unlink
                </button>
              </div>
            </div>
            <Button
              v-else
              class="mt-3"
              variant="secondary"
              block
              :disabled="identity.loading || !wallet.activeAccount"
              @click="handleLinkWallet"
              >Link Current Wallet</Button
            >
            <Button
              class="mt-2"
              variant="ghost"
              block
              :disabled="identity.loading"
              @click="handleIdentityLogout"
              >Disconnect Identity</Button
            >
          </template>
          <p v-if="identityError" class="mt-3 text-xs text-danger" role="alert">
            {{ identityError }}
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="Wallet">
        <button
          v-for="item in SETTINGS_LINKS"
          :key="item.path"
          type="button"
          class="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-inset focus:ring-text"
          @click="router.push(item.path)"
        >
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-semibold">{{ item.title }}</span>
            <span class="mt-0.5 block text-xs text-text-muted">{{ item.detail }}</span>
          </span>
          <svg
            viewBox="0 0 24 24"
            class="h-4 w-4 shrink-0 text-text-muted"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9 6l6 6-6 6"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </SettingsSection>

      <Button variant="danger" block @click="handleLock">Lock Wallet</Button>
      <p v-if="error" class="text-center text-xs text-danger" role="alert">{{ error }}</p>
    </div>
  </SettingsPageShell>
</template>
