<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { SigningRequest, SimulationResult, RiskWarning, WalletSettings } from '@otsu/types'
import { SIGNING_TIMEOUT_MS, DROPS_PER_XRP } from '@otsu/constants'
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

const txParams = computed(() => (props.request.params as Record<string, unknown>) ?? {})

const isContractCall = computed(() => txParams.value.TransactionType === 'ContractCall')

const contractCallInfo = computed(() => {
  if (!isContractCall.value) return null
  const params = txParams.value
  const contractParams = params.Parameters as Array<Record<string, unknown>> | undefined
  return {
    contractAddress: (params.Destination as string) ?? '',
    functionName: (params.ContractFunction as string) ?? '',
    parameters:
      contractParams?.map((p) => {
        const inner = (p.ContractParameter ?? p) as Record<string, unknown>
        return {
          sType: (inner.SType as string) ?? 'Blob',
          value: (inner.Value as string) ?? '',
          flags: (inner.Flags as number) ?? 0,
        }
      }) ?? [],
    gasLimit: (Number(params.Fee ?? 0) / DROPS_PER_XRP).toFixed(6),
  }
})

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
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Transaction signing request"
    class="flex flex-col h-full min-h-[400px]"
  >
    <!-- Header -->
    <div class="p-4 border-b border-border">
      <div class="flex items-center justify-between">
        <DAppInfo :origin="request.origin" :favicon="request.favicon" :title="request.title" />
        <span
          class="text-xs font-mono tabular-nums px-2 py-1 rounded-md"
          :class="
            remainingSeconds <= 10 ? 'text-danger bg-danger/10' : 'text-text-muted bg-bg-subtle'
          "
        >
          {{ remainingSeconds }}s
        </span>
      </div>
      <p class="mt-2 text-sm text-text-muted">
        requests
        {{ request.method === 'signAndSubmit' ? 'signing and submission' : 'transaction signing' }}
      </p>
    </div>

    <!-- Content -->
    <div class="flex-1 p-4 space-y-4 overflow-auto">
      <!-- Expired -->
      <div v-if="isExpired" class="rounded-lg bg-danger/10 border border-danger p-4 text-center">
        <p class="text-sm font-medium text-danger">Request Expired</p>
        <p class="text-xs text-danger mt-1">
          This signing request has timed out. Please close and try again.
        </p>
      </div>

      <!-- ContractCall info -->
      <div
        v-if="contractCallInfo && !isExpired"
        class="rounded-lg bg-link/10 border border-link p-3 space-y-2"
      >
        <p class="text-xs font-semibold text-link uppercase tracking-wide">Contract Call</p>
        <div class="flex justify-between items-center text-sm">
          <span class="text-text-muted">Contract</span>
          <span class="font-mono text-xs">
            {{ contractCallInfo.contractAddress.slice(0, 8) }}...{{
              contractCallInfo.contractAddress.slice(-4)
            }}
          </span>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-text-muted">Function</span>
          <span class="font-mono text-xs font-medium">{{ contractCallInfo.functionName }}</span>
        </div>
        <div v-if="contractCallInfo.parameters.length > 0" class="space-y-1">
          <div
            v-for="(param, idx) in contractCallInfo.parameters"
            :key="idx"
            class="flex items-center gap-2 text-xs"
          >
            <span class="px-1.5 py-0.5 rounded bg-link/10 text-link font-mono">
              {{ param.sType }}
            </span>
            <span class="text-text-muted font-mono truncate">{{ param.value }}</span>
          </div>
        </div>
        <div class="flex justify-between items-center text-sm">
          <span class="text-text-muted">Gas limit</span>
          <span>{{ contractCallInfo.gasLimit }} XRP</span>
        </div>
      </div>

      <!-- Simulation failed + blind signing disabled -->
      <template v-else-if="simulationFailed && !blindSigningAllowed">
        <div class="rounded-lg bg-danger/10 border border-danger p-4">
          <p class="text-sm font-medium text-danger">Simulation Failed</p>
          <p class="text-xs text-danger mt-1">
            {{ simulation?.error ?? 'Transaction could not be simulated.' }}
          </p>
          <p class="text-xs text-danger mt-2">
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
      <div v-else class="rounded-lg bg-warning/10 border border-warning p-4">
        <p class="text-sm font-medium text-warning">No simulation data</p>
        <p class="text-xs text-warning mt-1">
          Unable to simulate this transaction. Proceed with caution.
        </p>
      </div>

      <!-- Risk Warnings -->
      <WarningBanner v-if="warnings.length > 0" :warnings="warnings" />
    </div>

    <!-- Actions -->
    <div class="p-4 border-t border-border flex gap-3">
      <button
        aria-label="Reject transaction"
        class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-bg-hover text-text hover:bg-bg-subtle transition-colors disabled:opacity-50"
        :disabled="submitting"
        @click="handleReject"
      >
        Reject
      </button>
      <button
        v-if="canConfirm"
        aria-label="Confirm transaction"
        class="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-accent text-accent-fg hover:opacity-90 transition-colors disabled:opacity-50"
        :disabled="submitting"
        @click="handleConfirm"
      >
        Confirm
      </button>
    </div>
  </div>
</template>
