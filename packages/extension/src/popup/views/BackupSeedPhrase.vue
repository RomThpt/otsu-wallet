<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import SettingsPageShell from '../../components/settings/SettingsPageShell.vue'

const router = useRouter()
const wallet = useWalletStore()

const step = ref<'verify' | 'reveal'>('verify')
const password = ref('')
const words = ref<string[]>([])
const loading = ref(false)
const error = ref('')
const copied = ref(false)

let clearTimer: ReturnType<typeof setTimeout> | null = null

async function revealWithPassword() {
  if (!password.value) return

  error.value = ''
  loading.value = true

  try {
    const mnemonic = await wallet.exportMnemonic('password', password.value)
    if (mnemonic) {
      showMnemonic(mnemonic)
    } else {
      error.value = 'Failed to export seed phrase'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function revealWithPasskey() {
  error.value = ''
  loading.value = true

  try {
    const mnemonic = await wallet.exportMnemonic('passkey')
    if (mnemonic) {
      showMnemonic(mnemonic)
    } else {
      error.value = 'Failed to export seed phrase'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function showMnemonic(mnemonic: string) {
  words.value = mnemonic.split(' ')
  step.value = 'reveal'
  password.value = ''

  clearTimer = setTimeout(() => {
    clearMnemonic()
  }, 60000)
}

function clearMnemonic() {
  words.value = []
  step.value = 'verify'
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
}

let clipboardTimer: ReturnType<typeof setTimeout> | null = null

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(words.value.join(' '))
    copied.value = true
    error.value = ''
  } catch {
    copied.value = false
    error.value = 'Could not copy the recovery phrase. Write it down manually.'
    return
  }

  if (clipboardTimer) clearTimeout(clipboardTimer)
  clipboardTimer = setTimeout(async () => {
    try {
      await navigator.clipboard.writeText('')
    } catch {
      // Clipboard API may fail if page not focused
    }
    copied.value = false
    clipboardTimer = null
  }, 15000)
}

function finishBackup() {
  clearMnemonic()
  router.replace('/settings')
}

onUnmounted(() => {
  words.value = []
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
  if (clipboardTimer) {
    clearTimeout(clipboardTimer)
    navigator.clipboard.writeText('').catch(() => {})
    clipboardTimer = null
  }
})
</script>

<template>
  <SettingsPageShell title="Backup Seed Phrase" back-to="/settings" back-label="Back to Settings">
    <div class="space-y-5 pt-2">
      <template v-if="step === 'verify'">
        <div class="text-center">
          <div
            class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10 text-danger"
          >
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" aria-hidden="true">
              <path
                d="M12 3l9 16H3L12 3z"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linejoin="round"
              />
              <path
                d="M12 9v4m0 3h.01"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
              />
            </svg>
          </div>
          <h2 class="mt-4 text-xl font-bold tracking-tight">Reveal your recovery phrase</h2>
          <p class="mt-2 text-sm leading-5 text-text-muted">
            Anyone with these words can control your funds. Make sure nobody can see your screen.
          </p>
        </div>

        <div class="rounded-[22px] border border-border bg-bg-subtle p-4 shadow-card">
          <template v-if="wallet.authMethod === 'password'">
            <Input
              v-model="password"
              label="Wallet password"
              type="password"
              autocomplete="current-password"
              placeholder="Your wallet password"
              @keyup.enter="revealWithPassword"
            />
            <Button
              class="mt-4"
              variant="ink"
              block
              :loading="loading"
              :disabled="!password"
              @click="revealWithPassword"
            >
              Reveal Seed Phrase
            </Button>
          </template>

          <Button v-else variant="ink" block :loading="loading" @click="revealWithPasskey">
            Verify with Passkey
          </Button>

          <p v-if="error" class="mt-3 text-center text-xs text-danger" role="alert">{{ error }}</p>
        </div>
      </template>

      <template v-else>
        <div class="rounded-2xl border border-warning/30 bg-warning/10 p-3.5">
          <p class="text-xs leading-5 text-warning">
            This screen clears automatically in 60 seconds. Write the words down in order and store
            them offline.
          </p>
        </div>

        <div class="overflow-hidden rounded-[22px] border border-border bg-bg-subtle shadow-card">
          <ol class="grid grid-cols-2 gap-x-3 gap-y-1 p-4">
            <li
              v-for="(word, index) in words"
              :key="index"
              class="flex min-w-0 items-center gap-2 rounded-xl px-1.5 py-2"
            >
              <span class="w-5 shrink-0 text-right text-xs text-text-muted">{{ index + 1 }}</span>
              <span class="min-w-0 break-words font-mono text-xs font-semibold text-text">{{
                word
              }}</span>
            </li>
          </ol>
        </div>

        <p v-if="error" class="text-center text-xs text-danger" role="alert">{{ error }}</p>

        <div class="flex gap-3">
          <Button variant="secondary" block @click="copyToClipboard">
            {{ copied ? 'Copied' : 'Copy Phrase' }}
          </Button>
          <Button variant="ink" block @click="finishBackup"> Done </Button>
        </div>
        <p class="sr-only" aria-live="polite">{{ copied ? 'Recovery phrase copied' : '' }}</p>
      </template>
    </div>
  </SettingsPageShell>
</template>
