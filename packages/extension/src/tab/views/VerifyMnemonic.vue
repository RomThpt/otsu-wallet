<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import Button from '../../components/common/Button.vue'
import OnboardingShell from '../../components/onboarding/OnboardingShell.vue'

const router = useRouter()
const store = useOnboardingStore()

const verifyIndices = ref<number[]>([])
const selectedWords = ref<(string | null)[]>([null, null, null])
const shuffledOptions = ref<string[][]>([[], [], []])

onMounted(() => {
  if (store.mnemonic.length === 0) {
    router.push('/')
    return
  }

  if (store.authMethod === 'password' && store.password.length < 8) {
    router.push('/auth')
    return
  }

  const indices = store.mnemonic
    .map((_, index) => index)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
  indices.sort((a, b) => a - b)
  verifyIndices.value = indices

  indices.forEach((correctIdx, i) => {
    const correctWord = store.mnemonic[correctIdx]
    const distractors = [...new Set(store.mnemonic.filter((word) => word !== correctWord))]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
    shuffledOptions.value[i] = [correctWord, ...distractors].sort(() => Math.random() - 0.5)
  })
})

const isCorrect = computed(() => {
  return verifyIndices.value.every((idx, i) => selectedWords.value[i] === store.mnemonic[idx])
})

const allSelected = computed(() => {
  return selectedWords.value.every((w) => w !== null)
})

async function finishSetup() {
  if (!allSelected.value || !isCorrect.value) return
  const success = await store.createWallet()
  if (success) router.push('/complete')
}
</script>

<template>
  <OnboardingShell :step="4" wide @back="router.push('/generate')">
    <div class="space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight">Verify Recovery Phrase</h1>
        <p class="mx-auto mt-2 max-w-md text-base leading-6 text-zinc-600">
          Select the correct word for each position to confirm you saved your phrase.
        </p>
      </div>

      <div class="space-y-6">
        <div v-for="(idx, i) in verifyIndices" :key="idx">
          <p class="mb-3 text-sm font-semibold text-zinc-700">Word #{{ idx + 1 }}</p>
          <div
            class="grid grid-cols-2 gap-3 sm:grid-cols-4"
            role="group"
            :aria-label="`Word ${idx + 1}`"
          >
            <button
              v-for="word in shuffledOptions[i]"
              :key="word"
              type="button"
              :aria-pressed="selectedWords[i] === word"
              :class="[
                'min-h-12 rounded-2xl border px-3 py-2 font-mono text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2',
                selectedWords[i] === word
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50',
              ]"
              @click="selectedWords[i] = word"
            >
              {{ word }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="router.push('/generate')"> Back </Button>
        <Button
          variant="ink"
          block
          :loading="store.loading"
          :disabled="!allSelected || !isCorrect"
          @click="finishSetup"
        >
          Create Wallet
        </Button>
      </div>

      <p v-if="allSelected && !isCorrect" class="text-center text-sm text-red-600" role="alert">
        One or more words are incorrect. Please try again.
      </p>
      <p v-if="store.error" class="text-center text-sm text-red-600" role="alert">
        {{ store.error }}
      </p>
    </div>
  </OnboardingShell>
</template>
