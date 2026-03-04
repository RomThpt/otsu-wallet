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
const step = ref<'form' | 'result'>('form')

// Create form
const destination = ref('')
const amount = ref('')
const finishAfterHours = ref('')
const cancelAfterHours = ref('')

function toRippleEpoch(hoursFromNow: number): number {
  return Math.floor(Date.now() / 1000) - RIPPLE_EPOCH + Math.floor(hoursFromNow * 3600)
}

function formatRippleTime(rippleTs: number): string {
  const unixMs = (rippleTs + RIPPLE_EPOCH) * 1000
  return new Date(unixMs).toLocaleString()
}

function canFinish(escrow: { finishAfter?: number; condition?: string }): boolean {
  if (escrow.condition) return false
  if (!escrow.finishAfter) return true
  const now = Math.floor(Date.now() / 1000) - RIPPLE_EPOCH
  return now >= escrow.finishAfter
}

function canCancel(escrow: { cancelAfter?: number }): boolean {
  if (!escrow.cancelAfter) return false
  const now = Math.floor(Date.now() / 1000) - RIPPLE_EPOCH
  return now >= escrow.cancelAfter
}

onMounted(async () => {
  listLoading.value = true
  try {
    await wallet.fetchAccountEscrows()
  } catch {
    // Silent fail
  } finally {
    listLoading.value = false
  }
})

async function createEscrow() {
  const dest = destination.value
  const amt = parseFloat(amount.value)
  if (!dest || isNaN(amt) || amt <= 0) return

  error.value = ''
  loading.value = true
  try {
    const payload: Record<string, unknown> = {
      destination: dest,
      amount: Math.floor(amt * DROPS_PER_XRP).toString(),
    }

    const finishHours = parseFloat(finishAfterHours.value)
    if (!isNaN(finishHours) && finishHours > 0) {
      payload.finishAfter = toRippleEpoch(finishHours)
    }

    const cancelHours = parseFloat(cancelAfterHours.value)
    if (!isNaN(cancelHours) && cancelHours > 0) {
      payload.cancelAfter = toRippleEpoch(cancelHours)
    }

    const response = await sendMessage<{ hash: string }>({
      type: 'CREATE_ESCROW',
      payload,
    })

    if (response.success && response.data) {
      txHash.value = response.data.hash
      step.value = 'result'
      toast.success('Escrow created')
      await wallet.fetchAccountEscrows()
    } else {
      error.value = response.error ?? 'Failed to create escrow'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function finishEscrow(owner: string, seq: number) {
  loading.value = true
  try {
    const response = await sendMessage<{ hash: string }>({
      type: 'FINISH_ESCROW',
      payload: { owner, offerSequence: seq },
    })
    if (response.success) {
      toast.success('Escrow finished')
      await wallet.fetchAccountEscrows()
    } else {
      toast.error(response.error ?? 'Failed')
    }
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

async function cancelEscrow(owner: string, seq: number) {
  loading.value = true
  try {
    const response = await sendMessage<{ hash: string }>({
      type: 'CANCEL_ESCROW',
      payload: { owner, offerSequence: seq },
    })
    if (response.success) {
      toast.success('Escrow cancelled')
      await wallet.fetchAccountEscrows()
    } else {
      toast.error(response.error ?? 'Failed')
    }
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
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
      <h2 class="text-sm font-bold">Escrows</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Pending Escrows List -->
      <div>
        <h3 class="text-sm font-bold mb-2">Pending Escrows</h3>

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

        <div v-else-if="wallet.escrows.length === 0" class="py-3">
          <p class="text-xs text-gray-500 text-center">No pending escrows</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="escrow in wallet.escrows"
            :key="escrow.seq"
            class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2"
          >
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">To</span>
              <span class="font-mono">{{ escrow.destination.slice(0, 8) }}...</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500">Amount</span>
              <span class="font-medium"
                >{{ (Number(escrow.amount) / DROPS_PER_XRP).toFixed(6) }} XRP</span
              >
            </div>
            <div v-if="escrow.finishAfter" class="flex justify-between text-xs">
              <span class="text-gray-500">Finish After</span>
              <span>{{ formatRippleTime(escrow.finishAfter) }}</span>
            </div>
            <div v-if="escrow.cancelAfter" class="flex justify-between text-xs">
              <span class="text-gray-500">Cancel After</span>
              <span>{{ formatRippleTime(escrow.cancelAfter) }}</span>
            </div>
            <div class="flex gap-2 pt-1">
              <button
                v-if="canFinish(escrow)"
                class="flex-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                :disabled="loading"
                @click="finishEscrow(escrow.account, escrow.seq)"
              >
                Finish
              </button>
              <button
                v-if="canCancel(escrow)"
                class="flex-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                :disabled="loading"
                @click="cancelEscrow(escrow.account, escrow.seq)"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>

      <hr class="border-gray-200 dark:border-gray-700" />

      <!-- Create Escrow Form -->
      <template v-if="step === 'form'">
        <h3 class="text-sm font-bold">Create Escrow</h3>

        <Input v-model="destination" label="Destination" placeholder="rAddress..." />

        <Input v-model="amount" label="Amount (XRP)" placeholder="0.000000" />

        <Input
          v-model="finishAfterHours"
          label="Finish After (hours from now)"
          placeholder="e.g. 24"
          hint="Earliest time the escrow can be finished"
        />

        <Input
          v-model="cancelAfterHours"
          label="Cancel After (hours from now)"
          placeholder="e.g. 168"
          hint="Time after which the escrow can be cancelled"
        />

        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

        <Button block :loading="loading" :disabled="!destination || !amount" @click="createEscrow">
          Create Escrow
        </Button>
      </template>

      <template v-else>
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
          <h3 class="text-lg font-bold">Escrow Created</h3>
          <p class="mt-2 text-xs text-gray-500 font-mono break-all">{{ txHash }}</p>
        </div>
        <Button block @click="step = 'form'">Create Another</Button>
      </template>
    </div>
  </div>
</template>
