<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendMessage } from '../../lib/messaging'
import Button from '../../components/common/Button.vue'
import OtsuMark from '../../components/brand/OtsuMark.vue'
import UnlockLandscape from '../../components/brand/UnlockLandscape.vue'
import { useOnboardingStore } from '../../stores/onboarding'

const router = useRouter()
const store = useOnboardingStore()
const ready = ref(false)
const error = ref('')

async function checkWallet() {
  ready.value = false
  error.value = ''
  try {
    const response = await sendMessage<boolean>({ type: 'HAS_WALLET' })
    if (!response.success) throw new Error(response.error ?? 'Could not check wallet status')
    if (response.data) {
      window.close()
      window.setTimeout(() => {
        error.value = 'Otsu is already set up. Open it from your browser toolbar.'
        ready.value = true
      }, 250)
      return
    }
    ready.value = true
  } catch (cause) {
    error.value = (cause as Error).message || 'Could not start onboarding'
    ready.value = true
  }
}

onMounted(checkWallet)

function startCreate() {
  store.reset()
  router.push('/auth')
}
</script>

<template>
  <main class="relative flex min-h-screen overflow-hidden bg-white px-6 py-10 text-zinc-950">
    <div
      v-if="ready"
      class="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center"
    >
      <div class="-mt-16 w-full space-y-10 sm:-mt-8">
        <div class="text-center">
          <OtsuMark class="mx-auto h-24 w-24 text-zinc-950" />
          <h1 class="mt-4 text-5xl font-normal tracking-tight">Otsu</h1>
          <p class="mt-3 text-base text-zinc-600">Your XRPL wallet</p>
        </div>

        <div v-if="!error" class="space-y-3">
          <Button block size="lg" variant="ink" @click="startCreate"> Create New Wallet </Button>
          <Button
            block
            size="lg"
            variant="secondary"
            class="!border-zinc-300 !bg-white !text-zinc-950"
            @click="router.push('/import')"
          >
            Import Existing Wallet
          </Button>
        </div>

        <div
          v-else
          class="space-y-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-center"
          role="alert"
        >
          <p class="text-sm text-red-700">{{ error }}</p>
          <Button variant="secondary" block @click="checkWallet">Try again</Button>
        </div>

        <p class="text-center text-xs text-zinc-500">v1.0.0</p>
      </div>
    </div>

    <div
      v-else
      class="relative z-10 m-auto flex items-center gap-3 text-sm text-zinc-500"
      role="status"
    >
      <span
        class="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-950"
        aria-hidden="true"
      />
      Checking wallet…
    </div>

    <UnlockLandscape
      class="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full text-zinc-950"
    />
  </main>
</template>
