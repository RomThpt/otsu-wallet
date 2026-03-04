<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import { DROPS_PER_XRP, NETWORKS } from '@otsu/constants'
import Card from '../../components/common/Card.vue'
import Button from '../../components/common/Button.vue'
import { useToast } from '../../composables/useToast'

const route = useRoute()
const router = useRouter()
const wallet = useWalletStore()
const toast = useToast()
const hash = route.params.hash as string

const tx = computed(() => wallet.transactions.find((t) => t.hash === hash))

const displayAmount = computed(() => {
  if (!tx.value) return ''
  if (tx.value.amount.currency === 'XRP') {
    return `${(Number(tx.value.amount.value) / DROPS_PER_XRP).toFixed(6)} XRP`
  }
  return `${tx.value.amount.value} ${tx.value.amount.currency}`
})

const displayFee = computed(() => {
  if (!tx.value) return ''
  return `${(Number(tx.value.fee) / DROPS_PER_XRP).toFixed(6)} XRP`
})

const formattedTime = computed(() => {
  if (!tx.value?.timestamp) return 'Unknown'
  return new Date(tx.value.timestamp).toLocaleString()
})

const explorerUrl = computed(() => {
  if (!tx.value) return ''
  const network = NETWORKS[wallet.network]
  if (!network?.explorer) return ''
  return `${network.explorer}/transactions/${tx.value.hash}`
})

const truncatedHash = computed(() => {
  if (!tx.value) return ''
  return `${tx.value.hash.slice(0, 12)}...${tx.value.hash.slice(-8)}`
})

const copied = ref(false)

function copyHash() {
  if (!tx.value) return
  navigator.clipboard.writeText(tx.value.hash)
  copied.value = true
  toast.success('Hash copied')
  setTimeout(() => {
    copied.value = false
  }, 2000)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="router.push('/history')"
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
      <h2 class="text-sm font-bold">Transaction Detail</h2>
    </div>

    <div v-if="!tx" class="flex-1 flex items-center justify-center p-4">
      <p class="text-sm text-gray-500">Transaction not found</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto p-4 space-y-3">
      <Card>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">Type</span>
            <span class="font-medium">{{ tx.type }}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">Direction</span>
            <span
              class="font-medium capitalize"
              :class="{
                'text-red-600 dark:text-red-400': tx.direction === 'sent',
                'text-green-600 dark:text-green-400': tx.direction === 'received',
              }"
            >
              {{ tx.direction }}
            </span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">Amount</span>
            <span class="font-medium">{{ displayAmount }}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">Fee</span>
            <span>{{ displayFee }}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">Result</span>
            <span
              class="text-xs px-1.5 py-0.5 rounded font-medium"
              :class="
                tx.successful
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              "
            >
              {{ tx.result }}
            </span>
          </div>

          <div class="flex justify-between items-start">
            <span class="text-gray-500 dark:text-gray-400">Hash</span>
            <div class="flex items-center gap-1">
              <span class="font-mono text-xs text-right">{{ truncatedHash }}</span>
              <button
                class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                @click="copyHash"
              >
                {{ copied ? 'Copied' : 'Copy' }}
              </button>
            </div>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">Time</span>
            <span class="text-xs">{{ formattedTime }}</span>
          </div>

          <div class="flex justify-between items-center">
            <span class="text-gray-500 dark:text-gray-400">Ledger</span>
            <span>{{ tx.ledgerIndex }}</span>
          </div>

          <div v-if="tx.destination" class="flex justify-between items-start">
            <span class="text-gray-500 dark:text-gray-400">Destination</span>
            <span class="font-mono text-xs text-right break-all ml-4">{{ tx.destination }}</span>
          </div>

          <div v-if="tx.memo" class="flex justify-between items-start">
            <span class="text-gray-500 dark:text-gray-400">Memo</span>
            <span class="text-xs text-right break-all ml-4">{{ tx.memo }}</span>
          </div>

          <!-- Contract Call metadata -->
          <template v-if="tx.contractCall">
            <div class="border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
              <p
                class="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2"
              >
                Contract Call
              </p>
            </div>
            <div class="flex justify-between items-start">
              <span class="text-gray-500 dark:text-gray-400">Contract</span>
              <span class="font-mono text-xs text-right break-all ml-4">
                {{ tx.contractCall.contractAddress }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-500 dark:text-gray-400">Function</span>
              <span class="font-mono text-xs font-medium">{{ tx.contractCall.functionName }}</span>
            </div>
            <div v-if="tx.contractCall.parameters && tx.contractCall.parameters.length > 0">
              <span class="text-gray-500 dark:text-gray-400 text-sm">Parameters</span>
              <div class="mt-1 space-y-1">
                <div
                  v-for="(param, idx) in tx.contractCall.parameters"
                  :key="idx"
                  class="flex items-center gap-2 text-xs"
                >
                  <span
                    class="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-mono"
                  >
                    {{ param.sType }}
                  </span>
                  <span class="font-mono text-gray-600 dark:text-gray-400 truncate">{{
                    param.value
                  }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </Card>

      <div class="space-y-2">
        <a
          v-if="explorerUrl"
          :href="explorerUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="block w-full text-center px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          View on Explorer
        </a>

        <Button variant="secondary" block @click="router.push('/history')">
          Back to History
        </Button>
      </div>
    </div>
  </div>
</template>
