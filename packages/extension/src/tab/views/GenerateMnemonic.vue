<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import { generateNewMnemonic, mnemonicToWordArray } from '@otsu/core'
import Button from '../../components/common/Button.vue'
import Card from '../../components/common/Card.vue'

const router = useRouter()
const store = useOnboardingStore()
const words = ref<string[]>([])
const copied = ref(false)
const error = ref<string | null>(null)

function generate(): void {
  try {
    error.value = null
    const mnemonic = generateNewMnemonic()
    words.value = mnemonicToWordArray(mnemonic)
    store.setMnemonic(words.value)
  } catch (err) {
    words.value = []
    error.value = (err as Error).message || 'Failed to generate recovery phrase'
  }
}

onMounted(generate)

function copyToClipboard() {
  navigator.clipboard.writeText(words.value.join(' '))
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-lg space-y-6 p-8">
      <div>
        <h2 class="text-2xl font-bold">Recovery Phrase</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Write down these 24 words in order. You will need them to recover your wallet.
        </p>
      </div>

      <Card v-if="error">
        <div class="space-y-3 py-4 text-center">
          <p class="text-sm font-medium text-red-600 dark:text-red-400">
            {{ error }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            We could not generate a recovery phrase. Try again, or import an existing wallet.
          </p>
        </div>
      </Card>

      <Card v-else>
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

      <div v-if="error" class="flex gap-3">
        <Button variant="secondary" block @click="router.push('/')"> Back </Button>
        <Button block @click="generate"> Retry </Button>
      </div>

      <div v-else class="flex gap-3">
        <Button variant="secondary" block @click="copyToClipboard">
          {{ copied ? 'Copied' : 'Copy' }}
        </Button>
        <Button block :disabled="words.length === 0" @click="router.push('/verify')">
          Continue
        </Button>
      </div>

      <p class="text-xs text-red-500 dark:text-red-400 text-center">
        Never share your recovery phrase. Anyone with these words can access your funds.
      </p>
    </div>
  </div>
</template>
