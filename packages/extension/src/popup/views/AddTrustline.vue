<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import TrustlineWarning from '../../components/security/TrustlineWarning.vue'

const router = useRouter()
const wallet = useWalletStore()

const step = ref<'form' | 'confirm'>('form')
const currency = ref('')
const issuer = ref('')
const limit = ref('1000000')
const loading = ref(false)
const error = ref('')

const isValidIssuer = computed(() => /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(issuer.value))

const canSubmit = computed(() => currency.value.trim().length > 0 && isValidIssuer.value)

async function handleConfirm() {
  loading.value = true
  error.value = ''

  try {
    const hash = await wallet.setTrustline({
      currency: currency.value.trim().toUpperCase(),
      issuer: issuer.value.trim(),
      limit: limit.value,
    })
    if (hash) {
      router.push('/explore/tokens')
    } else {
      error.value = 'Failed to set trustline'
      step.value = 'form'
    }
  } catch (e) {
    error.value = (e as Error).message
    step.value = 'form'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <template v-if="step === 'form'">
      <h2 class="text-lg font-bold">Add Trustline</h2>

      <Input v-model="currency" label="Currency Code" placeholder="e.g. USD, EUR" />

      <Input
        v-model="issuer"
        label="Issuer Address"
        placeholder="rAddress..."
        :error="issuer && !isValidIssuer ? 'Invalid address' : ''"
      />

      <Input
        v-model="limit"
        label="Trust Limit"
        placeholder="1000000"
        hint="Maximum amount you can hold"
      />

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="router.push('/explore/tokens')">Cancel</Button>
        <Button block :disabled="!canSubmit" @click="step = 'confirm'">Review</Button>
      </div>
    </template>

    <template v-else>
      <h2 class="text-lg font-bold">Confirm Trustline</h2>

      <TrustlineWarning :issuer="issuer" />

      <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-500">Currency</span>
          <span class="font-medium">{{ currency.toUpperCase() }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Issuer</span>
          <span class="font-mono text-xs">{{ issuer.slice(0, 10) }}...{{ issuer.slice(-6) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Limit</span>
          <span>{{ limit }}</span>
        </div>
      </div>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="step = 'form'">Back</Button>
        <Button block :loading="loading" @click="handleConfirm">Confirm</Button>
      </div>
    </template>
  </div>
</template>
