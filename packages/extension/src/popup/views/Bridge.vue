<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '../../stores/wallet'
import type { BridgeEstimate } from '@otsu/types'
import Button from '../../components/common/Button.vue'
import Card from '../../components/common/Card.vue'
import BridgeStatusTracker from '../../components/bridge/BridgeStatusTracker.vue'
import { useToast } from '../../composables/useToast'

const wallet = useWalletStore()
const toast = useToast()

const direction = ref<'xrpl-to-evm' | 'evm-to-xrpl'>('xrpl-to-evm')
const amount = ref('')
const step = ref<'form' | 'confirm' | 'result'>('form')
const loading = ref(false)
const estimating = ref(false)
const error = ref('')
const estimate = ref<BridgeEstimate | null>(null)

const xrplAccounts = computed(() => wallet.accounts.filter((a) => a.chainType === 'xrpl'))
const evmAccounts = computed(() => wallet.accounts.filter((a) => a.chainType === 'evm'))

const sourceAddress = computed(() => {
  if (direction.value === 'xrpl-to-evm') {
    return xrplAccounts.value[0]?.address ?? ''
  }
  return evmAccounts.value[0]?.address ?? ''
})

const destinationAddress = computed(() => {
  if (direction.value === 'xrpl-to-evm') {
    return evmAccounts.value[0]?.address ?? ''
  }
  return xrplAccounts.value[0]?.address ?? ''
})

const canBridge = computed(() => {
  return parseFloat(amount.value) > 0 && sourceAddress.value && destinationAddress.value
})

function truncateAddr(addr: string): string {
  if (!addr) return ''
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

function flipDirection() {
  direction.value = direction.value === 'xrpl-to-evm' ? 'evm-to-xrpl' : 'xrpl-to-evm'
  estimate.value = null
}

async function fetchEstimate() {
  if (!canBridge.value) return
  estimating.value = true
  error.value = ''
  try {
    estimate.value = await wallet.bridgeEstimate(direction.value, amount.value)
    step.value = 'confirm'
  } catch (e) {
    error.value = (e as Error).message
    toast.error(error.value)
  } finally {
    estimating.value = false
  }
}

async function executeBridge() {
  loading.value = true
  error.value = ''
  try {
    const tx = await wallet.bridgeTransfer({
      direction: direction.value,
      amount: amount.value,
      sourceAddress: sourceAddress.value,
      destinationAddress: destinationAddress.value,
    })
    if (tx) {
      step.value = 'result'
      toast.success('Bridge transfer initiated')
    } else {
      error.value = 'Bridge transfer failed'
      toast.error(error.value)
      step.value = 'form'
    }
  } catch (e) {
    error.value = (e as Error).message
    toast.error(error.value)
    step.value = 'form'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await wallet.fetchBridgeHistory()
})
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Form Step -->
    <template v-if="step === 'form'">
      <h2 class="text-lg font-bold">Bridge XRP</h2>
      <p class="text-xs text-gray-500">Transfer XRP between XRPL and EVM Sidechain via Axelar</p>

      <Card>
        <div class="space-y-4">
          <!-- Source -->
          <div>
            <p class="text-xs font-medium text-gray-500 mb-1">From</p>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">
                {{ direction === 'xrpl-to-evm' ? 'XRPL' : 'EVM Sidechain' }}
              </span>
              <span class="text-[10px] font-mono text-gray-500">
                {{ truncateAddr(sourceAddress) }}
              </span>
            </div>
          </div>

          <!-- Flip button -->
          <div class="flex justify-center">
            <button
              class="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              @click="flipDirection"
            >
              <svg
                class="w-4 h-4 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          </div>

          <!-- Destination -->
          <div>
            <p class="text-xs font-medium text-gray-500 mb-1">To</p>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium">
                {{ direction === 'xrpl-to-evm' ? 'EVM Sidechain' : 'XRPL' }}
              </span>
              <span class="text-[10px] font-mono text-gray-500">
                {{ truncateAddr(destinationAddress) }}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <!-- Amount -->
      <div>
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (XRP)</label>
        <input
          v-model="amount"
          type="number"
          step="0.000001"
          min="0"
          placeholder="0.000000"
          class="mt-1.5 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

      <Button block :disabled="!canBridge" :loading="estimating" @click="fetchEstimate">
        Get Estimate
      </Button>
    </template>

    <!-- Confirm Step -->
    <template v-else-if="step === 'confirm'">
      <h2 class="text-lg font-bold">Confirm Bridge</h2>

      <Card>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">Direction</span>
            <span>{{ direction === 'xrpl-to-evm' ? 'XRPL -> EVM' : 'EVM -> XRPL' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Send</span>
            <span class="font-medium">{{ estimate?.sourceAmount ?? amount }} XRP</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Bridge Fee</span>
            <span>{{ estimate?.fee ?? '--' }} XRP</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Receive (est.)</span>
            <span class="font-medium text-green-600 dark:text-green-400">
              {{ estimate?.destinationAmount ?? '--' }} XRP
            </span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Est. Time</span>
            <span>{{
              estimate?.estimatedTime ? `~${Math.ceil(estimate.estimatedTime / 60)} min` : '--'
            }}</span>
          </div>
        </div>
      </Card>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="step = 'form'">Back</Button>
        <Button block :loading="loading" @click="executeBridge">Bridge</Button>
      </div>
    </template>

    <!-- Result Step -->
    <template v-else>
      <h2 class="text-lg font-bold">Bridge Initiated</h2>
      <p class="text-xs text-gray-500">Your transfer is being processed by Axelar.</p>

      <Card v-if="wallet.bridgeTransactions.length > 0">
        <BridgeStatusTracker :transaction="wallet.bridgeTransactions[0]" />
      </Card>

      <Button block variant="secondary" @click="step = 'form'">New Bridge</Button>
    </template>

    <!-- Recent bridge transactions -->
    <div v-if="wallet.bridgeTransactions.length > 0 && step === 'form'" class="space-y-3">
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Bridges</h3>
      <Card v-for="tx in wallet.bridgeTransactions.slice(0, 5)" :key="tx.id">
        <BridgeStatusTracker :transaction="tx" />
      </Card>
    </div>
  </div>
</template>
