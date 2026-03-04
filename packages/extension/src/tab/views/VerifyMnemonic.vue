<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import Button from '../../components/common/Button.vue'

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

  const indices: number[] = []
  while (indices.length < 3) {
    const idx = Math.floor(Math.random() * store.mnemonic.length)
    if (!indices.includes(idx)) indices.push(idx)
  }
  indices.sort((a, b) => a - b)
  verifyIndices.value = indices

  indices.forEach((correctIdx, i) => {
    const options = [store.mnemonic[correctIdx]]
    while (options.length < 4) {
      const randIdx = Math.floor(Math.random() * store.mnemonic.length)
      const word = store.mnemonic[randIdx]
      if (!options.includes(word)) options.push(word)
    }
    shuffledOptions.value[i] = options.sort(() => Math.random() - 0.5)
  })
})

const isCorrect = computed(() => {
  return verifyIndices.value.every((idx, i) => selectedWords.value[i] === store.mnemonic[idx])
})

const allSelected = computed(() => {
  return selectedWords.value.every((w) => w !== null)
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md space-y-6 p-8">
      <div>
        <h2 class="text-2xl font-bold">Verify Recovery Phrase</h2>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Select the correct word for each position to confirm you saved your phrase.
        </p>
      </div>

      <div class="space-y-4">
        <div v-for="(idx, i) in verifyIndices" :key="idx">
          <p class="text-sm font-medium mb-2">Word #{{ idx + 1 }}</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="word in shuffledOptions[i]"
              :key="word"
              :class="[
                'rounded-lg border px-3 py-2 text-sm transition-colors',
                selectedWords[i] === word
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
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
        <Button block :disabled="!allSelected || !isCorrect" @click="router.push('/auth')">
          Continue
        </Button>
      </div>

      <p v-if="allSelected && !isCorrect" class="text-xs text-red-500 text-center">
        One or more words are incorrect. Please try again.
      </p>
    </div>
  </div>
</template>
