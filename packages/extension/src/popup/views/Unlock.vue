<script setup lang="ts">
import { ref } from 'vue'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'

const wallet = useWalletStore()
const password = ref('')
const error = ref('')

async function handleUnlock() {
  error.value = ''
  const success = await wallet.unlock(password.value)
  if (!success) {
    error.value = 'Invalid password'
  }
}
</script>

<template>
  <div class="flex-1 flex flex-col items-center justify-center p-6">
    <h1 class="text-2xl font-bold mb-2">Otsu</h1>
    <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">Unlock your wallet</p>

    <form class="w-full space-y-4" @submit.prevent="handleUnlock">
      <Input
        v-model="password"
        type="password"
        placeholder="Enter password"
        :error="error"
      />
      <Button block :loading="wallet.loading" type="submit">
        Unlock
      </Button>
    </form>
  </div>
</template>
