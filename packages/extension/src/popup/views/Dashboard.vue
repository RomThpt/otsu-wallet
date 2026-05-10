<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import ReserveBreakdown from '../../components/wallet/ReserveBreakdown.vue'
import Skeleton from '../../components/common/Skeleton.vue'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const wallet = useWalletStore()
const loading = ref(true)

const isActivated = computed(() => {
  if (wallet.isEvmNetwork) return true
  if (!wallet.balance) return true
  return Number(wallet.balance.total) > 0
})

const hasFaucet = computed(() => {
  const config =
    wallet.predefinedNetworks[wallet.network] ??
    wallet.customNetworks.find((n) => n.id === wallet.network)
  return !!config?.faucet
})

onMounted(async () => {
  try {
    if (wallet.isEvmNetwork) {
      await wallet.fetchEvmBalance()
    } else {
      await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice()])
    }
  } catch {
    // Will show "--" balances
  } finally {
    loading.value = false
  }
})

async function handleFaucet() {
  const success = await wallet.requestFaucet()
  if (success) {
    if (wallet.isEvmNetwork) {
      await wallet.fetchEvmBalance()
    } else {
      await wallet.fetchBalance()
    }
  }
}
</script>

<template>
  <div class="px-5 py-6 space-y-6">
    <section>
      <p class="text-xs uppercase tracking-wider text-text-muted">Total Balance</p>

      <template v-if="loading">
        <div class="mt-2 space-y-2">
          <Skeleton variant="rect" height="32px" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </template>

      <template v-else-if="wallet.isEvmNetwork">
        <p class="mt-1 text-3xl font-semibold tracking-tight">
          {{ wallet.evmBalance?.formatted ?? '0' }}
          <span class="text-base font-normal text-text-muted">XRP</span>
        </p>
      </template>

      <ReserveBreakdown v-else :balance="wallet.balance" :xrp-price="wallet.xrpPrice" />
    </section>

    <div class="grid grid-cols-2 gap-3">
      <Button variant="primary" block @click="router.push('/send')">Send</Button>
      <Button variant="secondary" block @click="router.push('/receive')">Receive</Button>
    </div>

    <p v-if="!isActivated" class="flex items-start gap-2 text-sm text-warning">
      <span aria-hidden="true">●</span>
      <span>
        <span class="font-medium">Account not activated.</span>
        <span class="text-text-muted"> Send at least 1 XRP to activate this account.</span>
      </span>
    </p>

    <Button
      v-if="hasFaucet"
      variant="secondary"
      size="sm"
      block
      :loading="wallet.loading"
      @click="handleFaucet"
    >
      Request Test XRP
    </Button>
  </div>
</template>
