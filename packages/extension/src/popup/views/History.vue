<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import TransactionItem from '../../components/wallet/TransactionItem.vue'
import Skeleton from '../../components/common/Skeleton.vue'
import Button from '../../components/common/Button.vue'

const router = useRouter()

const wallet = useWalletStore()
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  loading.value = true
  try {
    await wallet.fetchTransactionHistory()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})

async function loadMore() {
  loading.value = true
  try {
    await wallet.fetchTransactionHistory(wallet.historyMarker)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col px-4 pb-5">
    <div class="pb-4 pt-3">
      <h1 class="text-2xl font-semibold tracking-tight">Activity</h1>
      <p class="mt-1 text-sm text-text-muted">Your recent XRPL transactions.</p>
    </div>

    <div
      v-if="loading && wallet.transactions.length === 0"
      class="flex-1 overflow-hidden rounded-[20px] bg-bg-subtle"
    >
      <div v-for="i in 4" :key="i" class="px-4 py-3 flex items-center gap-3">
        <Skeleton variant="circle" width="28px" height="28px" />
        <div class="flex-1 space-y-2">
          <Skeleton variant="text" width="50%" />
          <Skeleton variant="text" width="30%" height="12px" />
        </div>
        <Skeleton variant="text" width="50px" />
      </div>
    </div>

    <div
      v-else-if="wallet.transactions.length === 0"
      class="flex-1 flex items-center justify-center p-4"
    >
      <p class="text-sm text-text-muted">No transactions yet</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto rounded-[20px] bg-bg-subtle shadow-card">
      <TransactionItem
        v-for="tx in wallet.transactions"
        :key="tx.hash"
        :tx="tx"
        class="cursor-pointer border-b border-border/70 last:border-0"
        @click="router.push('/history/' + tx.hash)"
      />

      <div v-if="wallet.historyHasMore" class="p-4">
        <Button variant="secondary" size="sm" block :loading="loading" @click="loadMore">
          Load More
        </Button>
      </div>
    </div>

    <p v-if="error" class="px-4 py-2 text-xs text-danger">{{ error }}</p>
  </div>
</template>
