<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { sendMessage } from '../lib/messaging'

const status = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref('')

function closeTab() {
  window.close()
}

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (!code || !state) {
      throw new Error('Missing code or state parameter')
    }

    const response = await sendMessage({
      type: 'IDENTITY_CALLBACK',
      payload: { code, state },
    })

    if (!response.success) {
      throw new Error(response.error ?? 'Login failed')
    }

    status.value = 'success'

    // Auto-close after a short delay
    setTimeout(() => window.close(), 1500)
  } catch (e) {
    status.value = 'error'
    errorMessage.value = (e as Error).message
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-bg text-text">
    <div class="text-center p-8">
      <template v-if="status === 'loading'">
        <div
          class="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-4"
        />
        <p class="text-sm">Completing login...</p>
      </template>

      <template v-else-if="status === 'success'">
        <svg
          class="h-12 w-12 text-success mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <p class="text-sm font-medium">Connected!</p>
        <p class="text-xs text-text-muted mt-1">This tab will close automatically.</p>
      </template>

      <template v-else>
        <svg
          class="h-12 w-12 text-danger mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
        <p class="text-sm font-medium text-danger">Login failed</p>
        <p class="text-xs text-text-muted mt-1">{{ errorMessage }}</p>
        <button
          class="mt-4 px-4 py-2 text-xs rounded-xl bg-accent text-accent-fg hover:opacity-90 transition-colors"
          @click="closeTab"
        >
          Close
        </button>
      </template>
    </div>
  </div>
</template>
