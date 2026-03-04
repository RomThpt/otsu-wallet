<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Card from '../../components/common/Card.vue'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const wallet = useWalletStore()
const toast = useToast()

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
    toast.success('Seed phrase cleared for security')
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

function copyToClipboard() {
  navigator.clipboard.writeText(words.value.join(' '))
  copied.value = true
  toast.success('Copied to clipboard')
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

onUnmounted(() => {
  words.value = []
  if (clearTimer) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="router.push('/settings')"
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
      <h2 class="text-sm font-bold">Backup Seed Phrase</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Verification Step -->
      <template v-if="step === 'verify'">
        <div
          class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3"
        >
          <p class="text-xs text-red-700 dark:text-red-400">
            Anyone with your seed phrase can access your funds. Never share it with anyone.
          </p>
        </div>

        <!-- Password verification -->
        <template v-if="wallet.authMethod === 'password'">
          <div>
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enter Password
            </label>
            <input
              v-model="password"
              type="password"
              placeholder="Your wallet password"
              class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              @keyup.enter="revealWithPassword"
            />
          </div>

          <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

          <Button block :loading="loading" :disabled="!password" @click="revealWithPassword">
            Reveal Seed Phrase
          </Button>
        </template>

        <!-- Passkey verification -->
        <template v-else>
          <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

          <Button block :loading="loading" @click="revealWithPasskey">
            <span class="flex items-center justify-center gap-2">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                />
              </svg>
              Verify with Passkey
            </span>
          </Button>
        </template>
      </template>

      <!-- Reveal Step -->
      <template v-else>
        <div
          class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3"
        >
          <p class="text-xs text-red-700 dark:text-red-400">
            This will auto-clear in 60 seconds. Write down the words and store them safely.
          </p>
        </div>

        <Card>
          <div class="grid grid-cols-3 gap-2">
            <div
              v-for="(word, index) in words"
              :key="index"
              class="flex items-center gap-2 rounded-lg bg-gray-50 dark:bg-gray-700 px-3 py-2"
            >
              <span class="text-xs text-gray-400 w-5 text-right">{{ index + 1 }}</span>
              <span class="text-sm font-mono">{{ word }}</span>
            </div>
          </div>
        </Card>

        <div class="flex gap-3">
          <Button variant="secondary" block @click="copyToClipboard">
            {{ copied ? 'Copied' : 'Copy' }}
          </Button>
          <Button block @click="clearMnemonic"> Done </Button>
        </div>
      </template>
    </div>
  </div>
</template>
