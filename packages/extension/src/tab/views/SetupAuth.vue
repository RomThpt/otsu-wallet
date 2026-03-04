<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import Card from '../../components/common/Card.vue'

const router = useRouter()
const store = useOnboardingStore()

const password = ref('')
const confirmPassword = ref('')
const error = ref('')

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

      <Card>
        <div class="space-y-4">
          <h3 class="text-lg font-semibold">Password</h3>
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

      <div class="flex gap-3">
        <Button variant="secondary" block @click="router.push('/verify')">
          Back
        </Button>
        <Button
          block
          :loading="store.loading"
          @click="setupPassword"
        >
          Create Wallet
        </Button>
      </div>

      <p v-if="store.error" class="text-xs text-red-500 text-center">
        {{ store.error }}
      </p>
    </div>
  </div>
</template>
