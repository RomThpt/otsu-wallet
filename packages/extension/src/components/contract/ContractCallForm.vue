<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ContractFunction, ContractParameterValue, ContractSType } from '@otsu/types'
import { CONTRACT_DEFAULT_FEE, DROPS_PER_XRP } from '@otsu/constants'

const props = defineProps<{
  fn: ContractFunction
  contractAddress: string
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [
    params: {
      contractAddress: string
      functionName: string
      parameters: ContractParameterValue[]
      fee: string
    },
  ]
  cancel: []
}>()

const paramValues = ref<string[]>(props.fn.parameters.map(() => ''))
const fee = ref(CONTRACT_DEFAULT_FEE)

const feeXrp = computed(() => (Number(fee.value) / DROPS_PER_XRP).toFixed(6))

function handleSubmit() {
  const parameters: ContractParameterValue[] = props.fn.parameters.map((def, idx) => ({
    sType: def.sType as ContractSType,
    value: paramValues.value[idx] ?? '',
    flags: def.flags,
  }))

  emit('submit', {
    contractAddress: props.contractAddress,
    functionName: props.fn.name,
    parameters,
    fee: fee.value,
  })
}
</script>

<template>
  <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-bold">
        Call <span class="font-mono text-primary-600 dark:text-primary-400">{{ fn.name }}</span>
      </h4>
      <button
        class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        @click="emit('cancel')"
      >
        Cancel
      </button>
    </div>

    <div v-if="fn.parameters.length > 0" class="space-y-3">
      <div v-for="(param, idx) in fn.parameters" :key="idx">
        <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span
            class="font-mono px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          >
            {{ param.sType }}
          </span>
          <span v-if="param.label" class="ml-1.5">{{ param.label }}</span>
          <span v-else class="ml-1.5">Parameter {{ idx + 1 }}</span>
        </label>
        <input
          v-model="paramValues[idx]"
          type="text"
          class="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          :placeholder="`Enter ${param.sType} value`"
        />
      </div>
    </div>

    <div>
      <label class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
        Gas limit (fee in drops)
      </label>
      <div class="flex items-center gap-2">
        <input
          v-model="fee"
          type="text"
          class="flex-1 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
        />
        <span class="text-xs text-gray-500 whitespace-nowrap">{{ feeXrp }} XRP</span>
      </div>
    </div>

    <button
      class="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors disabled:opacity-50"
      :disabled="loading"
      @click="handleSubmit"
    >
      {{ loading ? 'Submitting...' : 'Submit Call' }}
    </button>
  </div>
</template>
