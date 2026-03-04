import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SigningRequest, SimulationResult, RiskWarning, WalletSettings } from '@otsu/types'
import { sendMessage } from '../lib/messaging'

export const useSigningStore = defineStore('signing', () => {
  const request = ref<SigningRequest | null>(null)
  const simulation = ref<SimulationResult | undefined>()
  const warnings = ref<RiskWarning[]>([])
  const settings = ref<WalletSettings | undefined>()
  const loading = ref(false)
  const error = ref('')

  async function loadRequest(requestId: string): Promise<boolean> {
    loading.value = true
    error.value = ''

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
        return true
      }

      error.value = response.error ?? 'Signing request not found'
      return false
    } catch {
      error.value = 'Failed to load signing request'
      return false
    } finally {
      loading.value = false
    }
  }

  async function approve(): Promise<void> {
    if (!request.value) return

    await sendMessage({
      type: 'SIGNING_APPROVED',
      payload: { requestId: request.value.id },
    })
  }

  async function reject(reason?: string): Promise<void> {
    if (!request.value) return

    await sendMessage({
      type: 'SIGNING_REJECTED',
      payload: { requestId: request.value.id, reason },
    })
  }

  return {
    request,
    simulation,
    warnings,
    settings,
    loading,
    error,
    loadRequest,
    approve,
    reject,
  }
})
