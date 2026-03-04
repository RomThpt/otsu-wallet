<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DROPS_PER_XRP } from '@otsu/constants'
import { sendMessage } from '../../lib/messaging'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import Skeleton from '../../components/common/Skeleton.vue'
import { useToast } from '../../composables/useToast'

const RIPPLE_EPOCH = 946684800

const router = useRouter()
const wallet = useWalletStore()
const toast = useToast()
const loading = ref(false)
const listLoading = ref(false)
const error = ref('')
const txHash = ref('')
const step = ref<'create' | 'cash' | 'result'>('create')

// Create form
const destination = ref('')
const sendMaxAmount = ref('')

// Cash form
const checkID = ref('')
const cashAmount = ref('')

function formatSendMax(
  sendMax: string | { currency: string; issuer: string; value: string },
): string {
  if (typeof sendMax === 'string') {
    return `${(Number(sendMax) / DROPS_PER_XRP).toFixed(6)} XRP`
  }
  return `${sendMax.value} ${sendMax.currency}`
}

function formatRippleTime(rippleTs: number): string {
  const unixMs = (rippleTs + RIPPLE_EPOCH) * 1000
  return new Date(unixMs).toLocaleString()
}

onMounted(async () => {
  listLoading.value = true
  try {
    await wallet.fetchAccountChecks()
  } catch {
    // Silent fail
  } finally {
    listLoading.value = false
  }
})

async function createCheck() {
  if (!destination.value || !sendMaxAmount.value) return

  error.value = ''
  loading.value = true
  try {
    const amt = parseFloat(sendMaxAmount.value)
    const response = await sendMessage<{ hash: string }>({
      type: 'CREATE_CHECK',
      payload: {
        destination: destination.value,
        sendMax: Math.floor(amt * DROPS_PER_XRP).toString(),
      },
    })

    if (response.success && response.data) {
      txHash.value = response.data.hash
      step.value = 'result'
      toast.success('Check created')
      await wallet.fetchAccountChecks()
    } else {
      error.value = response.error ?? 'Failed'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function cashCheck() {
  if (!checkID.value) return

  error.value = ''
  loading.value = true
  try {
    const payload: Record<string, unknown> = { checkID: checkID.value }
    if (cashAmount.value) {
      const amt = parseFloat(cashAmount.value)
      payload.amount = Math.floor(amt * DROPS_PER_XRP).toString()
    }

    const response = await sendMessage<{ hash: string }>({
      type: 'CASH_CHECK',
      payload,
    })

    if (response.success && response.data) {
      txHash.value = response.data.hash
      step.value = 'result'
      toast.success('Check cashed')
      await wallet.fetchAccountChecks()
    } else {
      error.value = response.error ?? 'Failed'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function cancelCheck(id: string) {
  loading.value = true
  try {
    const response = await sendMessage<{ hash: string }>({
      type: 'CANCEL_CHECK',
      payload: { checkID: id },
    })
    if (response.success) {
      toast.success('Check cancelled')
      await wallet.fetchAccountChecks()
    } else {
      toast.error(response.error ?? 'Failed')
    }
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

function cashFromList(id: string) {
  checkID.value = id
  step.value = 'cash'
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="router.push('/explore')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h2 class="text-sm font-bold">Checks</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Pending Checks List -->
      <div>
        <h3 class="text-sm font-bold mb-2">Pending Checks</h3>

        <div v-if="listLoading" class="space-y-2">
          <div
            v-for="i in 2"
            :key="i"
            class="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          >
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height="12px" class="mt-1" />
          </div>
        </div>

        <div v-else-if="wallet.checks.length === 0" class="py-3">
          <p class="text-xs text-gray-500 text-center">No pending checks</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="check in wallet.checks"
            :key="check.index"
            class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
          >
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">To</span>
              <span class="font-mono">{{ check.destination.slice(0, 8) }}...</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">Max Amount</span>
              <span class="font-medium">{{ formatSendMax(check.sendMax) }}</span>
            </div>
            <div v-if="check.expiration" class="flex justify-between text-xs">
              <span class="text-gray-500">Expires</span>
              <span>{{ formatRippleTime(check.expiration) }}</span>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                class="flex-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                :disabled="loading"
                @click="cashFromList(check.index)"
              >
                Cash
              </button>
              <button
                class="flex-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                :disabled="loading"
                @click="cancelCheck(check.index)"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr class="border-gray-200 dark:border-gray-700" />

      <template v-if="step === 'create' || step === 'cash'">
        <!-- Tab toggle -->
        <div class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            :class="[
              'flex-1 py-1.5 text-xs font-medium',
              step === 'create' ? 'bg-primary-500 text-white' : 'bg-gray-50 dark:bg-gray-800',
            ]"
            @click="step = 'create'"
          >
            Create
          </button>
          <button
            :class="[
              'flex-1 py-1.5 text-xs font-medium',
              step === 'cash' ? 'bg-primary-500 text-white' : 'bg-gray-50 dark:bg-gray-800',
            ]"
            @click="step = 'cash'"
          >
            Cash
          </button>
        </div>

        <!-- Create Check -->
        <template v-if="step === 'create'">
          <Input v-model="destination" label="Destination" placeholder="rAddress..." />
          <Input v-model="sendMaxAmount" label="Max Amount (XRP)" placeholder="0.000000" />
          <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
          <Button
            block
            :loading="loading"
            :disabled="!destination || !sendMaxAmount"
            @click="createCheck"
          >
            Create Check
          </Button>
        </template>

        <!-- Cash Check -->
        <template v-if="step === 'cash'">
          <Input v-model="checkID" label="Check ID" placeholder="Hash of the check object" />
          <Input
            v-model="cashAmount"
            label="Amount (XRP, optional)"
            placeholder="Exact amount to cash"
            hint="Leave empty to cash full amount"
          />
          <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
          <Button block :loading="loading" :disabled="!checkID" @click="cashCheck">
            Cash Check
          </Button>
        </template>
      </template>

      <!-- Result -->
      <template v-if="step === 'result'">
        <div class="text-center py-8">
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4"
          >
            <svg
              class="h-6 w-6 text-green-600 dark:text-green-400"
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
          </div>
          <h3 class="text-lg font-bold">Success</h3>
          <p class="mt-2 text-xs text-gray-500 font-mono break-all">{{ txHash }}</p>
        </div>
        <Button block @click="step = 'create'">Back</Button>
      </template>
    </div>
  </div>
</template>
