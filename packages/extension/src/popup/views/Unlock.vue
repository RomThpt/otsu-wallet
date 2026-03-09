<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import browser from 'webextension-polyfill'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'

const wallet = useWalletStore()
const password = ref('')
const error = ref('')
const lockoutSeconds = ref(0)
let lockoutTimer: ReturnType<typeof setInterval> | undefined
const failedAttempts = ref(0)
const MAX_ATTEMPTS = 5
const BASE_LOCKOUT_S = 30
const passkeySupported = ref(false)

const showResetConfirm = ref(false)
const resetConfirmText = ref('')
const RESET_CONFIRM_PHRASE = 'RESET'

onMounted(async () => {
  try {
    passkeySupported.value =
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    passkeySupported.value = false
  }
})

function startLockoutCountdown(seconds: number) {
  lockoutSeconds.value = seconds
  lockoutTimer = setInterval(() => {
    lockoutSeconds.value--
    if (lockoutSeconds.value <= 0) {
      clearInterval(lockoutTimer)
      lockoutTimer = undefined
    }
  }, 1000)
}

function handleFailedAttempt() {
  failedAttempts.value++
  if (failedAttempts.value >= MAX_ATTEMPTS) {
    const lockoutDuration = BASE_LOCKOUT_S * Math.pow(2, failedAttempts.value - MAX_ATTEMPTS)
    startLockoutCountdown(lockoutDuration)
    error.value = ''
  }
}

async function handleUnlock() {
  if (lockoutSeconds.value > 0) return

  error.value = ''
  const success = await wallet.unlock('password', password.value)
  if (success) {
    failedAttempts.value = 0
  } else {
    error.value = 'Invalid password'
    handleFailedAttempt()
  }
}

async function handlePasskeyUnlock() {
  if (lockoutSeconds.value > 0) return

  error.value = ''
  try {
    const success = await wallet.unlock('passkey')
    if (success) {
      failedAttempts.value = 0
    } else {
      error.value = 'Passkey authentication failed'
      handleFailedAttempt()
    }
  } catch (e) {
    error.value = (e as Error).message
    handleFailedAttempt()
  }
}

async function handleReset() {
  if (resetConfirmText.value !== RESET_CONFIRM_PHRASE) return
  const success = await wallet.resetWallet()
  if (success) {
    browser.tabs.create({ url: browser.runtime.getURL('tab.html') })
    window.close()
  }
}

onUnmounted(() => {
  if (lockoutTimer) clearInterval(lockoutTimer)
})
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6">
    <h1 class="text-2xl font-bold mb-2">Otsu</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Unlock your wallet</p>

    <template v-if="!showResetConfirm">
      <div class="w-full space-y-4">
        <!-- Password unlock -->
        <form class="space-y-3" @submit.prevent="handleUnlock">
          <Input v-model="password" type="password" placeholder="Enter password" />
          <Button block :loading="wallet.loading" :disabled="lockoutSeconds > 0" type="submit">
            Unlock
          </Button>
        </form>

        <!-- Divider -->
        <div v-if="passkeySupported" class="flex items-center gap-3">
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700" />
          <span class="text-xs text-gray-400">or</span>
          <div class="flex-1 border-t border-gray-200 dark:border-gray-700" />
        </div>

        <!-- Passkey unlock -->
        <Button
          v-if="passkeySupported"
          block
          variant="secondary"
          :loading="wallet.loading"
          :disabled="lockoutSeconds > 0"
          @click="handlePasskeyUnlock"
        >
          <span class="flex items-center justify-center gap-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
              />
            </svg>
            Unlock with Passkey
          </span>
        </Button>

        <p v-if="error" class="text-xs text-red-500 text-center">{{ error }}</p>

        <p v-if="lockoutSeconds > 0" class="text-xs text-red-500 text-center">
          Too many attempts. Try again in {{ lockoutSeconds }}s
        </p>
      </div>

      <button
        class="mt-6 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        @click="showResetConfirm = true"
      >
        Forgot password? Reset wallet
      </button>
    </template>

    <template v-else>
      <div class="w-full space-y-4">
        <div
          class="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p class="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
            This will permanently delete all wallet data.
          </p>
          <p class="text-xs text-red-600 dark:text-red-400/80">
            You will need your recovery phrase to restore your accounts. Without it, your funds will
            be lost forever.
          </p>
        </div>

        <div>
          <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Type <span class="font-mono font-bold">{{ RESET_CONFIRM_PHRASE }}</span> to confirm
          </label>
          <Input v-model="resetConfirmText" type="text" placeholder="Type RESET to confirm" />
        </div>

        <div class="flex gap-2">
          <!-- prettier-ignore -->
          <Button
            block
            variant="secondary"
            @click="showResetConfirm = false; resetConfirmText = ''"
          >
            Cancel
          </Button>
          <Button
            block
            variant="danger"
            :disabled="resetConfirmText !== RESET_CONFIRM_PHRASE"
            @click="handleReset"
          >
            Reset Wallet
          </Button>
        </div>
      </div>
    </template>
  </div>
</template>
