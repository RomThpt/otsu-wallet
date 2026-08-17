<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import { generateNewMnemonic, mnemonicToWordArray } from '@otsu/core'
import Button from '../../components/common/Button.vue'
import OnboardingShell from '../../components/onboarding/OnboardingShell.vue'

const router = useRouter()
const store = useOnboardingStore()
const words = ref<string[]>([])
const copied = ref(false)
const error = ref<string | null>(null)
const copyError = ref<string | null>(null)

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

onMounted(() => {
  if (store.authMethod === 'password' && store.password.length < 8) {
    router.replace('/auth')
    return
  }
  if (store.mnemonic.length > 0) {
    words.value = [...store.mnemonic]
    return
  }
  generate()
})

async function copyToClipboard() {
  try {
    copyError.value = null
    await navigator.clipboard.writeText(words.value.join(' '))
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copyError.value = 'Could not copy the recovery phrase. Please write it down manually.'
  }
}
</script>

<template>
  <OnboardingShell :step="3" wide @back="router.push('/recovery')">
    <div class="space-y-7">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight">Recovery Phrase</h1>
        <p class="mx-auto mt-2 max-w-md text-base leading-6 text-zinc-600">
          Write these 24 words down in order and keep them somewhere safe.
        </p>
      </div>

      <div v-if="error" class="rounded-3xl border border-red-200 bg-red-50 p-5" role="alert">
        <div class="space-y-3 text-center">
          <p class="text-sm font-semibold text-red-700">
            {{ error }}
          </p>
          <p class="text-xs text-red-700/80">
            We could not generate a recovery phrase. Try again, or import an existing wallet.
          </p>
        </div>
      </div>

      <div v-else class="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 shadow-sm">
        <ol class="grid grid-cols-2 gap-x-4 gap-y-1 p-5 sm:grid-cols-3 sm:p-6">
          <li
            v-for="(word, index) in words"
            :key="index"
            class="flex min-w-0 items-center gap-2 rounded-xl px-2 py-2"
          >
            <span class="w-5 shrink-0 text-right text-xs text-zinc-500">{{ index + 1 }}</span>
            <span class="min-w-0 break-words font-mono text-sm font-semibold text-zinc-950">{{
              word
            }}</span>
          </li>
        </ol>
        <button
          type="button"
          class="flex min-h-12 w-full items-center justify-center gap-2 border-t border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-zinc-950"
          @click="copyToClipboard"
        >
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" aria-hidden="true">
            <rect
              x="8"
              y="8"
              width="11"
              height="11"
              rx="2"
              stroke="currentColor"
              stroke-width="1.6"
            />
            <path
              d="M16 8V7a2 2 0 00-2-2H7a2 2 0 00-2 2v7a2 2 0 002 2h1"
              stroke="currentColor"
              stroke-width="1.6"
            />
          </svg>
          {{ copied ? 'Copied to clipboard' : 'Copy to clipboard' }}
        </button>
      </div>

      <p class="sr-only" aria-live="polite">{{ copied ? 'Recovery phrase copied' : '' }}</p>
      <p v-if="copyError" class="text-center text-sm text-red-600" role="alert">{{ copyError }}</p>

      <div v-if="error" class="flex gap-3">
        <Button variant="secondary" block @click="router.push('/recovery')"> Back </Button>
        <Button variant="ink" block @click="generate"> Retry </Button>
      </div>

      <div v-else>
        <Button
          variant="ink"
          size="lg"
          block
          :disabled="words.length === 0"
          @click="router.push('/verify')"
        >
          I’ve written them down
        </Button>
      </div>

      <p class="text-center text-xs leading-5 text-red-600">
        Never share your recovery phrase. Anyone with these words can access your funds.
      </p>
    </div>
  </OnboardingShell>
</template>
