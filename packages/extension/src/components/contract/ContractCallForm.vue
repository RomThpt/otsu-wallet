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
  <div class="rounded-lg border border-border p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="text-sm font-bold">
        Call <span class="font-mono text-accent">{{ fn.name }}</span>
      </h4>
      <button class="text-xs text-text-muted hover:text-text" @click="emit('cancel')">
        Cancel
      </button>
    </div>

    <div v-if="fn.parameters.length > 0" class="space-y-3">
      <div v-for="(param, idx) in fn.parameters" :key="idx" class="form-field">
        <label class="form-label">
          <span class="font-mono px-1 py-0.5 rounded bg-bg-subtle text-link">
            {{ param.sType }}
          </span>
          <span v-if="param.label" class="ml-1.5">{{ param.label }}</span>
          <span v-else class="ml-1.5">Parameter {{ idx + 1 }}</span>
        </label>
        <input
          v-model="paramValues[idx]"
          type="text"
          class="form-control"
          :placeholder="`Enter ${param.sType} value`"
        />
      </div>
    </div>

    <div class="form-field">
      <label class="form-label">Gas limit (fee in drops)</label>
      <div class="flex items-center gap-2">
        <input v-model="fee" type="text" class="form-control min-w-0 flex-1 font-mono" />
        <span class="text-xs text-text-muted whitespace-nowrap">{{ feeXrp }} XRP</span>
      </div>
    </div>

    <button
      class="h-11 w-full rounded-[14px] bg-accent px-4 text-sm font-semibold text-accent-fg transition-colors hover:opacity-90 disabled:opacity-50"
      :disabled="loading"
      @click="handleSubmit"
    >
      {{ loading ? 'Submitting...' : 'Submit Call' }}
    </button>
  </div>
</template>
