<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { ContractFunction, ContractCallParams } from '@otsu/types'
import { useContractStore } from '../../stores/contract'
import { useToast } from '../../composables/useToast'
import ContractFunctionCard from '../../components/contract/ContractFunctionCard.vue'
import ContractCallForm from '../../components/contract/ContractCallForm.vue'
import Skeleton from '../../components/common/Skeleton.vue'

const router = useRouter()
const contractStore = useContractStore()
const toast = useToast()

const addressInput = ref('')
const selectedFn = ref<ContractFunction | null>(null)

const hasContract = computed(() => contractStore.contractInfo !== null)

async function handleLookup() {
  const address = addressInput.value.trim()
  if (!address) return

  selectedFn.value = null
  await contractStore.fetchContractInfo(address)
}

function handleSelectFunction(fn: ContractFunction) {
  selectedFn.value = fn
}

async function handleCallSubmit(params: {
  contractAddress: string
  functionName: string
  parameters: Array<{ sType: string; value: string; flags: number }>
  fee: string
}) {
  const hash = await contractStore.callContract({
    ...params,
    parameters: params.parameters as ContractCallParams['parameters'],
  })
  if (hash) {
    toast.success(`Transaction submitted: ${hash.slice(0, 12)}...`)
    selectedFn.value = null
  } else if (contractStore.error) {
    toast.error(contractStore.error)
  }
}

function handleRecentClick(address: string) {
  addressInput.value = address
  handleLookup()
}

function truncate(addr: string): string {
  if (!addr || addr.length < 16) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
      <h2 class="text-sm font-bold">Contract Explorer</h2>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Address Input -->
      <div class="flex gap-2">
        <input
          v-model="addressInput"
          type="text"
          placeholder="Enter contract address (r...)"
          class="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
          @keyup.enter="handleLookup"
        />
        <button
          class="px-4 py-2 text-sm font-medium rounded-md bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors disabled:opacity-50"
          :disabled="contractStore.loading || !addressInput.trim()"
          @click="handleLookup"
        >
          Lookup
        </button>
      </div>

      <!-- Loading -->
      <div v-if="contractStore.loading" class="space-y-3">
        <Skeleton class="h-20 rounded-lg" />
        <Skeleton class="h-16 rounded-lg" />
        <Skeleton class="h-16 rounded-lg" />
      </div>

      <!-- Error -->
      <div
        v-else-if="contractStore.error"
        class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4"
      >
        <p class="text-sm font-medium text-red-800 dark:text-red-200">
          {{
            contractStore.error.includes('not enabled') ||
            contractStore.error.includes('CONTRACT_NOT_SUPPORTED')
              ? 'Not Supported'
              : 'Error'
          }}
        </p>
        <p class="text-xs text-red-700 dark:text-red-300 mt-1">
          {{ contractStore.error }}
        </p>
      </div>

      <!-- Contract Info -->
      <template v-else-if="hasContract">
        <!-- Info Card -->
        <div
          class="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 space-y-2"
        >
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500 dark:text-gray-400">Address</span>
            <span class="font-mono text-xs">{{
              truncate(contractStore.contractInfo!.address)
            }}</span>
          </div>
          <div
            v-if="contractStore.contractInfo!.owner"
            class="flex justify-between items-center text-sm"
          >
            <span class="text-gray-500 dark:text-gray-400">Owner</span>
            <span class="font-mono text-xs">{{
              truncate(contractStore.contractInfo!.owner!)
            }}</span>
          </div>
          <div class="flex justify-between items-center text-sm">
            <span class="text-gray-500 dark:text-gray-400">Functions</span>
            <span>{{ contractStore.contractInfo!.functions.length }}</span>
          </div>
        </div>

        <!-- Call Form (if function selected) -->
        <ContractCallForm
          v-if="selectedFn"
          :fn="selectedFn"
          :contract-address="contractStore.contractInfo!.address"
          :loading="contractStore.loading"
          @submit="handleCallSubmit"
          @cancel="selectedFn = null"
        />

        <!-- Function List -->
        <div v-else class="space-y-2">
          <h3
            class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
          >
            Functions
          </h3>
          <ContractFunctionCard
            v-for="fn in contractStore.contractInfo!.functions"
            :key="fn.name"
            :fn="fn"
            @call="handleSelectFunction"
          />
          <p
            v-if="contractStore.contractInfo!.functions.length === 0"
            class="text-sm text-gray-500 text-center py-4"
          >
            No callable functions found in this contract's ABI.
          </p>
        </div>
      </template>

      <!-- Recent Contracts -->
      <div
        v-else-if="contractStore.recentContracts.length > 0 && !contractStore.loading"
        class="space-y-2"
      >
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Recent Contracts
        </h3>
        <button
          v-for="addr in contractStore.recentContracts"
          :key="addr"
          class="w-full text-left px-3 py-2 text-sm font-mono rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          @click="handleRecentClick(addr)"
        >
          {{ truncate(addr) }}
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="!contractStore.loading"
        class="flex flex-col items-center justify-center py-8 text-center"
      >
        <svg
          class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
        <p class="text-sm text-gray-500">Enter a contract address to explore its functions</p>
        <p class="text-xs text-gray-400 mt-1">XLS-101 smart contracts (AlphaNet)</p>
      </div>
    </div>
  </div>
</template>
