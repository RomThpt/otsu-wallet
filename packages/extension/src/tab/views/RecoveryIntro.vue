<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '../../stores/onboarding'
import Button from '../../components/common/Button.vue'
import OnboardingShell from '../../components/onboarding/OnboardingShell.vue'

const router = useRouter()
const store = useOnboardingStore()

onMounted(() => {
  if (store.authMethod === 'password' && store.password.length < 8) {
    router.replace('/auth')
  }
})
</script>

<template>
  <OnboardingShell :step="2" @back="router.push('/auth')">
    <div class="space-y-10 text-center">
      <div class="space-y-5">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
          <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" aria-hidden="true">
            <path
              d="M7.5 10.5a4.5 4.5 0 118.21 2.55L13.5 15.25V18h-3v-4.05a4.5 4.5 0 01-3-3.45z"
              stroke="currentColor"
              stroke-width="1.7"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M10.5 21h3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
        </div>
        <div>
          <h1 class="text-3xl font-bold tracking-tight">Your Recovery Phrase</h1>
          <p class="mx-auto mt-3 max-w-sm text-base leading-6 text-zinc-600">
            Write down these 24 words in order. You will need them to recover your wallet.
          </p>
        </div>
      </div>

      <div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-left">
        <div class="flex gap-4">
          <svg
            viewBox="0 0 24 24"
            class="mt-0.5 h-6 w-6 shrink-0 text-zinc-600"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6" />
            <path d="M12 10.5V17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            <circle cx="12" cy="7.5" r="1" fill="currentColor" />
          </svg>
          <div>
            <p class="font-semibold">Keep it private and offline</p>
            <p class="mt-1 text-sm leading-5 text-zinc-600">
              Otsu cannot recover this phrase. Never share it with anyone, including Otsu support.
            </p>
          </div>
        </div>
      </div>

      <Button block size="lg" variant="ink" @click="router.push('/generate')">
        Show Recovery Phrase
      </Button>
    </div>
  </OnboardingShell>
</template>
