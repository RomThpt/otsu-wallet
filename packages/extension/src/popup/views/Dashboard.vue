<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useWalletStore } from '../../stores/wallet'
import ReserveBreakdown from '../../components/wallet/ReserveBreakdown.vue'
import Button from '../../components/common/Button.vue'
import Card from '../../components/common/Card.vue'

const wallet = useWalletStore()

const isActivated = computed(() => {
  if (!wallet.balance) return true
  return Number(wallet.balance.total) > 0
})

const hasFaucet = computed(() => {
  return ['testnet', 'devnet'].includes(wallet.network)
})

onMounted(async () => {
  try {
    await Promise.all([
      wallet.fetchBalance(),
      wallet.fetchXrpPrice(),
    ])
  } catch {
    // Will show "--" balances
  }
})

async function handleFaucet() {
  const success = await wallet.requestFaucet()
  if (success) {
    await wallet.fetchBalance()
  }
}

async function handleLock() {
  await wallet.lock()
}
</script>

<template>
  <div class="p-4 space-y-4">
    <Card>
      <ReserveBreakdown :balance="wallet.balance" :xrp-price="wallet.xrpPrice" />
    </Card>

    <div v-if="!isActivated" class="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm">
      <p class="font-medium text-yellow-800 dark:text-yellow-200">Account Not Activated</p>
      <p class="mt-1 text-yellow-700 dark:text-yellow-300 text-xs">
        Send at least 1 XRP to activate this account.
      </p>
      <Button
        v-if="hasFaucet"
        variant="secondary"
        size="sm"
        class="mt-2"
        :loading="wallet.loading"
        @click="handleFaucet"
      >
        Request Test XRP
      </Button>
    </div>

    <div v-else-if="hasFaucet">
      <Button
        variant="secondary"
        size="sm"
        block
        :loading="wallet.loading"
        @click="handleFaucet"
      >
        Request Test XRP
      </Button>
    </div>

    <Button variant="ghost" size="sm" block @click="handleLock">
      Lock Wallet
    </Button>
  </div>
</template>
