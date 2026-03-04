<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import TokenItem from '../../components/wallet/TokenItem.vue'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const wallet = useWalletStore()
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    await wallet.fetchTokens()
  } catch {
    // Will show empty
  } finally {
    loading.value = false
  }
})

function getMetadata(currency: string, issuer: string) {
  return wallet.tokenMetadata[`${currency}:${issuer}`]
}

async function handleRemoveTrustline(currency: string, issuer: string) {
  if (!confirm(`Remove trustline for ${currency}?`)) return
  await wallet.removeTrustline(currency, issuer)
  await wallet.fetchTokens()
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-bold">Tokens</h2>
      <Button size="sm" @click="router.push('/tokens/add')">Add Trustline</Button>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
    </div>

    <div v-else-if="wallet.tokens.length === 0" class="flex-1 flex items-center justify-center p-4">
      <div class="text-center">
        <p class="text-sm text-gray-500">No trustlines set</p>
        <p class="text-xs text-gray-400 mt-1">Add a trustline to hold tokens</p>
      </div>
    </div>

    <div v-else class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="token in wallet.tokens" :key="`${token.currency}:${token.issuer}`">
        <TokenItem
          :token="token"
          :metadata="getMetadata(token.currency, token.issuer)"
          :xrp-price="wallet.xrpPrice"
        />
        <div class="px-4 pb-2">
          <button
            class="text-xs text-red-500 hover:text-red-700"
            @click="handleRemoveTrustline(token.currency, token.issuer)"
          >
            Remove Trustline
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
