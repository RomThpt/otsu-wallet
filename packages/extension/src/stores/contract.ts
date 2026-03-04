import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ContractInfo, ContractCallParams } from '@otsu/types'
import { sendMessage } from '../lib/messaging'

const MAX_RECENT_CONTRACTS = 10

export const useContractStore = defineStore('contract', () => {
  const contractInfo = ref<ContractInfo | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const recentContracts = ref<string[]>([])

  async function fetchContractInfo(address: string): Promise<void> {
    loading.value = true
    error.value = null
    contractInfo.value = null

    try {
      const response = await sendMessage<ContractInfo>({
        type: 'GET_CONTRACT_INFO',
        payload: { contractAddress: address },
      })

      if (response.success && response.data) {
        contractInfo.value = response.data
        addRecent(address)
      } else {
        error.value = response.error ?? 'Failed to fetch contract info'
      }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function callContract(params: ContractCallParams): Promise<string | null> {
    loading.value = true
    error.value = null

    try {
      const response = await sendMessage<{ hash: string }>({
        type: 'CALL_CONTRACT',
        payload: params,
      })

      if (response.success && response.data) {
        return response.data.hash
      }

      error.value = response.error ?? 'Contract call failed'
      return null
    } catch (e) {
      error.value = (e as Error).message
      return null
    } finally {
      loading.value = false
    }
  }

  function clearContract(): void {
    contractInfo.value = null
    error.value = null
  }

  function addRecent(address: string): void {
    const filtered = recentContracts.value.filter((a) => a !== address)
    recentContracts.value = [address, ...filtered].slice(0, MAX_RECENT_CONTRACTS)
  }

  return {
    contractInfo,
    loading,
    error,
    recentContracts,
    fetchContractInfo,
    callContract,
    clearContract,
  }
})
