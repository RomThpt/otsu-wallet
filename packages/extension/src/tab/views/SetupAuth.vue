<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import OnboardingShell from '../../components/onboarding/OnboardingShell.vue'

const router = useRouter()
const store = useOnboardingStore()

const password = ref(store.password)
const confirmPassword = ref('')
const error = ref('')
const passkeySupported = ref(false)

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
  return password.value.length >= 8 && password.value === confirmPassword.value
})

function setupPassword() {
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
  router.push('/recovery')
}

function setupPasskey() {
  if (!passkeySupported.value) return
  error.value = ''
  store.setAuthMethod('passkey')
  store.password = ''
  router.push('/recovery')
}
</script>

<template>
  <OnboardingShell :step="1" @back="router.push('/')">
    <div class="space-y-8">
      <div class="space-y-4 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <svg
            class="h-7 w-7"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.7"
              d="M8 11V7a4 4 0 118 0v4m-9 0h10a2 2 0 012 2v6H5v-6a2 2 0 012-2z"
            />
          </svg>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Create Your Wallet</h1>
          <p class="mt-2 text-base text-zinc-600">Set a password to protect your wallet.</p>
        </div>
      </div>

      <form class="space-y-5" @submit.prevent="setupPassword">
        <div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
          <div class="space-y-4">
            <Input
              v-model="password"
              label="Password"
              type="password"
              autocomplete="new-password"
              placeholder="At least 8 characters"
            />
            <Input
              v-model="confirmPassword"
              label="Confirm Password"
              type="password"
              autocomplete="new-password"
              placeholder="Confirm your password"
              :error="error"
            />
            <ul class="space-y-2 text-sm text-zinc-600" aria-label="Password requirements">
              <li class="flex items-center gap-2" :class="password.length >= 8 && 'text-zinc-950'">
                <span
                  class="h-2 w-2 rounded-full border"
                  :class="password.length >= 8 ? 'border-zinc-950 bg-zinc-950' : 'border-zinc-400'"
                />
                At least 8 characters
              </li>
              <li
                class="flex items-center gap-2"
                :class="confirmPassword && password === confirmPassword && 'text-zinc-950'"
              >
                <span
                  class="h-2 w-2 rounded-full border"
                  :class="
                    confirmPassword && password === confirmPassword
                      ? 'border-zinc-950 bg-zinc-950'
                      : 'border-zinc-400'
                  "
                />
                Passwords match
              </li>
            </ul>
          </div>
        </div>
        <Button type="submit" block size="lg" variant="ink" :disabled="!canSubmit">
          Continue
        </Button>
      </form>

      <div class="flex items-center gap-4 text-sm text-zinc-500" aria-hidden="true">
        <span class="h-px flex-1 bg-zinc-200" />
        <span>or</span>
        <span class="h-px flex-1 bg-zinc-200" />
      </div>

      <div>
        <Button
          block
          size="lg"
          variant="secondary"
          :disabled="!passkeySupported"
          @click="setupPasskey"
        >
          <svg viewBox="0 0 24 24" class="mr-3 h-5 w-5" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.6" />
            <path
              d="M12 12l7 7m-3-3 2-2m-5-1 2-2"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
          Continue with Passkey
        </Button>
        <p v-if="!passkeySupported" class="mt-2 text-center text-xs text-zinc-500">
          Passkeys are not supported on this device.
        </p>
      </div>

      <p v-if="store.error" class="text-center text-sm text-red-600" role="alert">
        {{ store.error }}
      </p>
    </div>
  </OnboardingShell>
</template>
