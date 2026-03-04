<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { SigningRequest, SimulationResult, RiskWarning, WalletSettings } from '@otsu/types'
import { sendMessage } from '../lib/messaging'
import SignTransaction from './views/SignTransaction.vue'
import ConnectionPrompt from './views/ConnectionPrompt.vue'

const loading = ref(true)
const error = ref('')
const request = ref<SigningRequest | null>(null)
const simulation = ref<SimulationResult | undefined>()
const warnings = ref<RiskWarning[]>([])
const settings = ref<WalletSettings | undefined>()

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const requestId = params.get('requestId')
  if (!requestId) {
    error.value = 'Missing request ID'
    loading.value = false
    return
  }

  try {
    const response = await sendMessage<{
      request: SigningRequest
      simulation?: SimulationResult
      warnings?: RiskWarning[]
      settings?: WalletSettings
    }>({
      type: 'GET_SIGNING_REQUEST',
      payload: { requestId },
    })

    if (response.success && response.data) {
      request.value = response.data.request
      simulation.value = response.data.simulation
      warnings.value = response.data.warnings ?? []
      settings.value = response.data.settings
    } else {
      error.value = response.error ?? 'Signing request not found'
    }
  } catch {
    error.value = 'Failed to load signing request'
  }

  loading.value = false
})
</script>

<template>
  <div class="w-[400px] min-h-[400px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="error" class="p-6 text-center">
      <p class="text-red-500">{{ error }}</p>
    </div>

    <template v-else-if="request">
      <ConnectionPrompt
        v-if="request.method === 'connect'"
        :origin="request.origin"
        :favicon="request.favicon"
        :title="request.title"
        :request-id="request.id"
      />
      <SignTransaction
        v-else
        :request="request"
        :simulation="simulation"
        :warnings="warnings"
        :settings="settings"
      />
    </template>
  </div>
</template>
