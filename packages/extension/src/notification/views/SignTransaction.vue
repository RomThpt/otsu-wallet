<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { SigningRequest, SimulationResult, RiskWarning, WalletSettings } from '@otsu/types'
import { SIGNING_TIMEOUT_MS } from '@otsu/constants'
import { sendMessage } from '../../lib/messaging'
import DAppInfo from '../../components/dapp/DAppInfo.vue'
import SimulationResultView from '../../components/security/SimulationResult.vue'
import BlindSignWarning from '../../components/security/BlindSignWarning.vue'
import WarningBanner from '../../components/security/WarningBanner.vue'

const props = defineProps<{
  request: SigningRequest
  simulation?: SimulationResult
  warnings: RiskWarning[]
  settings?: WalletSettings
}>()

const submitting = ref(false)
const remainingMs = ref(SIGNING_TIMEOUT_MS)
let timerInterval: ReturnType<typeof setInterval> | undefined

const remainingSeconds = computed(() => Math.ceil(remainingMs.value / 1000))

const isExpired = computed(() => remainingMs.value <= 0)

const simulationFailed = computed(() => props.simulation && !props.simulation.success)

const blindSigningAllowed = computed(() => props.settings?.blindSigningEnabled === true)

const canConfirm = computed(() => {
  if (isExpired.value) return false
  if (simulationFailed.value && !blindSigningAllowed.value) return false
  return true
})

onMounted(() => {
  const elapsed = Date.now() - props.request.createdAt
  remainingMs.value = Math.max(0, SIGNING_TIMEOUT_MS - elapsed)

  timerInterval = setInterval(() => {
    const now = Date.now()
    const newRemaining = Math.max(0, SIGNING_TIMEOUT_MS - (now - props.request.createdAt))
    remainingMs.value = newRemaining
    if (newRemaining <= 0) {
      clearInterval(timerInterval)
      timerInterval = undefined
    }
  }, 250)
})

onUnmounted(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

async function handleReject() {
  submitting.value = true
  try {
    await sendMessage({
      type: 'SIGNING_REJECTED',
      payload: { requestId: props.request.id },
    })
  } finally {
    window.close()
  }
}

async function handleConfirm() {
  if (!canConfirm.value) return
  submitting.value = true
  try {
    await sendMessage({
      type: 'SIGNING_APPROVED',
      payload: { requestId: props.request.id },
    })
  } finally {
    window.close()
  }
}
</script>

<template>
  <div class="flex flex-col h-full min-h-[400px]">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between">
        <DAppInfo :origin="request.origin" :favicon="request.favicon" :title="request.title" />
        <span
          class="text-xs font-mono tabular-nums px-2 py-1 rounded-md"
          :class="
            remainingSeconds <= 10
              ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
              : 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
          "
        >
          {{ remainingSeconds }}s
        </span>
      </div>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        requests {{ request.method === 'signAndSubmit' ? 'signing and submission' : 'transaction signing' }}
      </p>
    </div>

    <!-- Content -->
    <div class="flex-1 p-4 space-y-4 overflow-auto">
      <!-- Expired -->
      <div
        v-if="isExpired"
        class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-center"
      >
        <p class="text-sm font-medium text-red-800 dark:text-red-200">Request Expired</p>
        <p class="text-xs text-red-700 dark:text-red-300 mt-1">
          This signing request has timed out. Please close and try again.
        </p>
      </div>

      <!-- Simulation failed + blind signing disabled -->
      <template v-else-if="simulationFailed && !blindSigningAllowed">
        <div class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p class="text-sm font-medium text-red-800 dark:text-red-200">Simulation Failed</p>
          <p class="text-xs text-red-700 dark:text-red-300 mt-1">
            {{ simulation?.error ?? 'Transaction could not be simulated.' }}
          </p>
          <p class="text-xs text-red-700 dark:text-red-300 mt-2">
            Blind signing is disabled. Enable it in settings to sign unverified transactions.
          </p>
        </div>
      </template>

      <!-- Simulation failed + blind signing enabled -->
      <template v-else-if="simulationFailed && blindSigningAllowed">
        <BlindSignWarning :tx="(request.params as Record<string, unknown>) ?? {}" />
      </template>

      <!-- Simulation succeeded -->
      <template v-else-if="simulation">
        <SimulationResultView :result="simulation" />
      </template>

      <!-- No simulation data -->
      <div
        v-else
        class="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4"
      >
        <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">No simulation data</p>
        <p class="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
          Unable to simulate this transaction. Proceed with caution.
        </p>
      </div>

      <!-- Risk Warnings -->
      <WarningBanner v-if="warnings.length > 0" :warnings="warnings" />
    </div>

    <!-- Actions -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
      <button
        class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
        :disabled="submitting"
        @click="handleReject"
      >
        Reject
      </button>
      <button
        v-if="canConfirm"
        class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors disabled:opacity-50"
        :disabled="submitting"
        @click="handleConfirm"
      >
        Confirm
      </button>
    </div>
  </div>
</template>
