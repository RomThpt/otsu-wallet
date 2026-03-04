<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDexStore } from '../../stores/dex'
import { DROPS_PER_XRP } from '@otsu/constants'
import OrderBookTable from '../../components/dex/OrderBookTable.vue'
import CurrencyPairSelector from '../../components/dex/CurrencyPairSelector.vue'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const dexStore = useDexStore()
const tab = ref<'buy' | 'sell'>('buy')
const price = ref('')
const amount = ref('')
const error = ref('')
const txHash = ref('')

onMounted(async () => {
  await dexStore.fetchOrderBook()
})

function handlePairUpdate(
  base: { currency: string; issuer?: string },
  quote: { currency: string; issuer?: string },
) {
  dexStore.baseCurrency = base
  dexStore.quoteCurrency = quote
  dexStore.fetchOrderBook()
}

async function placeOrder() {
  const priceNum = parseFloat(price.value)
  const amountNum = parseFloat(amount.value)
  if (isNaN(priceNum) || isNaN(amountNum) || priceNum <= 0 || amountNum <= 0) return

  error.value = ''
  const base = dexStore.baseCurrency
  const quote = dexStore.quoteCurrency

  let takerGets: string | { currency: string; issuer: string; value: string }
  let takerPays: string | { currency: string; issuer: string; value: string }

  if (tab.value === 'buy') {
    // Buying base with quote: TakerGets = quote (what we give), TakerPays = base (what we want)
    takerGets = base.issuer
      ? { currency: base.currency, issuer: base.issuer, value: amountNum.toString() }
      : Math.floor(amountNum * DROPS_PER_XRP).toString()
    takerPays = quote.issuer
      ? { currency: quote.currency, issuer: quote.issuer, value: (amountNum * priceNum).toString() }
      : Math.floor(amountNum * priceNum * DROPS_PER_XRP).toString()
  } else {
    // Selling base for quote: TakerGets = base (what we give), TakerPays = quote (what we want)
    takerPays = base.issuer
      ? { currency: base.currency, issuer: base.issuer, value: amountNum.toString() }
      : Math.floor(amountNum * DROPS_PER_XRP).toString()
    takerGets = quote.issuer
      ? { currency: quote.currency, issuer: quote.issuer, value: (amountNum * priceNum).toString() }
      : Math.floor(amountNum * priceNum * DROPS_PER_XRP).toString()
  }

  const hash = await dexStore.createOffer({ takerGets, takerPays })
  if (hash) {
    txHash.value = hash
    price.value = ''
    amount.value = ''
    await dexStore.fetchOrderBook()
  } else {
    error.value = 'Failed to place order'
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
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
        <h2 class="text-sm font-bold">DEX</h2>
      </div>
      <Button size="sm" variant="secondary" @click="router.push('/explore/dex/offers')"
        >My Offers</Button
      >
    </div>

    <div class="flex-1 overflow-y-auto">
      <div class="p-3">
        <CurrencyPairSelector
          :base="dexStore.baseCurrency"
          :quote="dexStore.quoteCurrency"
          @update="handlePairUpdate"
        />
      </div>

      <!-- Order Book -->
      <div v-if="dexStore.loading" class="flex items-center justify-center py-4">
        <div
          class="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"
        />
      </div>
      <OrderBookTable
        v-else-if="dexStore.orderBook"
        :bids="dexStore.orderBook.bids"
        :asks="dexStore.orderBook.asks"
      />

      <!-- Place Order -->
      <div class="p-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <div class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            :class="[
              'flex-1 py-1.5 text-xs font-medium transition-colors',
              tab === 'buy' ? 'bg-green-500 text-white' : 'bg-gray-50 dark:bg-gray-800',
            ]"
            @click="tab = 'buy'"
          >
            Buy
          </button>
          <button
            :class="[
              'flex-1 py-1.5 text-xs font-medium transition-colors',
              tab === 'sell' ? 'bg-red-500 text-white' : 'bg-gray-50 dark:bg-gray-800',
            ]"
            @click="tab = 'sell'"
          >
            Sell
          </button>
        </div>

        <div class="space-y-2">
          <input
            v-model="price"
            type="number"
            step="0.000001"
            placeholder="Price"
            class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            v-model="amount"
            type="number"
            step="0.000001"
            placeholder="Amount"
            class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
        <p v-if="txHash" class="text-xs text-green-600">
          Order placed: {{ txHash.slice(0, 12) }}...
        </p>

        <Button
          block
          :loading="dexStore.loading"
          :class="tab === 'buy' ? '' : ''"
          @click="placeOrder"
        >
          {{ tab === 'buy' ? 'Place Buy Order' : 'Place Sell Order' }}
        </Button>
      </div>
    </div>
  </div>
</template>
