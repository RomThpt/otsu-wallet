<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import Card from '../../components/common/Card.vue'
import type { AuthMethod } from '@otsu/types'

const router = useRouter()
const store = useOnboardingStore()

const selectedMethod = ref<AuthMethod>('password')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const passkeySupported = ref(true)

onMounted(async () => {
  try {
    passkeySupported.value =
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    passkeySupported.value = false
  }
})

const canSubmit = computed(() => {
  if (selectedMethod.value === 'passkey') return true
  return password.value.length >= 8 && password.value === confirmPassword.value
})

async function setupPassword() {
  if (password.value.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  error.value = ''
  store.setAuthMethod('password')
  store.password = password.value

  const success = await store.createWallet()
  if (success) {
    router.push('/complete')
  }
}

async function setupPasskey() {
  error.value = ''
  store.setAuthMethod('passkey')
  store.password = ''

  const success = await store.createWallet()
  if (success) {
    router.push('/complete')
  }
}

async function handleSubmit() {
  if (selectedMethod.value === 'password') {
    await setupPassword()
  } else {
    await setupPasskey()
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md space-y-6 p-8">
      <div>
        <h2 class="text-2xl font-bold">Secure Your Wallet</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Choose how to protect your wallet.
        </p>
      </div>

      <!-- Method selection -->
      <div class="grid grid-cols-2 gap-3">
        <button
          class="rounded-lg border-2 p-4 text-left transition-colors"
          :class="
            selectedMethod === 'password'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          "
          @click="selectedMethod = 'password'"
        >
          <div class="flex items-center gap-2 mb-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span class="text-sm font-semibold">Password</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Classic password protection</p>
        </button>

        <button
          class="rounded-lg border-2 p-4 text-left transition-colors"
          :class="[
            selectedMethod === 'passkey'
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
            !passkeySupported && 'opacity-50 cursor-not-allowed',
          ]"
          :disabled="!passkeySupported"
          @click="passkeySupported && (selectedMethod = 'passkey')"
        >
          <div class="flex items-center gap-2 mb-2">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
              />
            </svg>
            <span class="text-sm font-semibold">Passkey</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ passkeySupported ? 'Biometric / device unlock' : 'Not supported on this device' }}
          </p>
        </button>
      </div>

      <!-- Password form -->
      <Card v-if="selectedMethod === 'password'">
        <div class="space-y-4">
          <Input
            v-model="password"
            label="Password"
            type="password"
            placeholder="Enter a strong password"
          />
          <Input
            v-model="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            :error="error"
          />
        </div>
      </Card>

      <!-- Passkey info -->
      <Card v-else>
        <div class="space-y-3">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            Use your device's biometric authentication (fingerprint, face recognition) or screen
            lock to secure your wallet.
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Your browser will prompt you to register a passkey when you continue.
          </p>
        </div>
      </Card>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="router.push('/verify')"> Back </Button>
        <Button block :loading="store.loading" :disabled="!canSubmit" @click="handleSubmit">
          {{ selectedMethod === 'passkey' ? 'Register Passkey' : 'Create Wallet' }}
        </Button>
      </div>

      <p v-if="store.error" class="text-xs text-red-500 text-center">
        {{ store.error }}
      </p>
    </div>
  </div>
</template>
