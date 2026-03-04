<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import { DROPS_PER_XRP } from '@otsu/constants'
import { sendMessage } from '../../lib/messaging'
import { parseXrplUri } from '../../lib/uri-parser'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import Card from '../../components/common/Card.vue'
import AddressInput from '../../components/common/AddressInput.vue'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const toast = useToast()
const route = useRoute()
const wallet = useWalletStore()

const destination = ref('')
const amount = ref('')
const destinationTag = ref('')
const memo = ref('')
const selectedCurrency = ref('XRP')
const step = ref<'form' | 'confirm' | 'result'>('form')
const loading = ref(false)
const error = ref('')
const txHash = ref('')

const currencyOptions = computed(() => {
  const options = [{ value: 'XRP', label: 'XRP' }]
  for (const token of wallet.tokens) {
    options.push({
      value: `${token.currency}:${token.issuer}`,
      label: token.currency,
    })
  }
  return options
})

const isToken = computed(() => selectedCurrency.value !== 'XRP')

const isValidAddress = computed(() => {
  return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(destination.value)
})

const amountDrops = computed(() => {
  const xrp = parseFloat(amount.value)
  if (isNaN(xrp) || xrp <= 0) return '0'
  return Math.floor(xrp * DROPS_PER_XRP).toString()
})

const canSend = computed(() => {
  return isValidAddress.value && parseFloat(amount.value) > 0
})

onMounted(async () => {
  if (wallet.tokens.length === 0) {
    try {
      await wallet.fetchTokens()
    } catch {
      /* ignore */
    }
  }

  // Pre-fill from xrpl: URI query param
  const uri = route.query.uri as string | undefined
  if (uri) {
    const parsed = parseXrplUri(decodeURIComponent(uri))
    if (parsed) {
      destination.value = parsed.address
      if (parsed.amount) amount.value = parsed.amount
      if (parsed.destinationTag !== undefined) destinationTag.value = String(parsed.destinationTag)
      if (parsed.currency && parsed.issuer) {
        selectedCurrency.value = `${parsed.currency}:${parsed.issuer}`
      }
    }
  }
})

function setMax() {
  if (isToken.value) {
    const [currency, issuer] = selectedCurrency.value.split(':')
    const token = wallet.tokens.find((t) => t.currency === currency && t.issuer === issuer)
    if (token) amount.value = token.value
  } else if (wallet.balance) {
    const available = Number(wallet.balance.available) / DROPS_PER_XRP
    amount.value = Math.max(0, available - 0.000012).toFixed(6)
  }
}

function confirmSend() {
  if (!canSend.value) return
  error.value = ''
  step.value = 'confirm'
}

async function executeSend() {
  loading.value = true
  error.value = ''

  try {
    if (isToken.value) {
      const [currency, issuer] = selectedCurrency.value.split(':')
      const hash = await wallet.sendTokenPayment({
        destination: destination.value,
        currency,
        issuer,
        value: amount.value,
        destinationTag: destinationTag.value ? Number(destinationTag.value) : undefined,
        memos: memo.value ? [{ type: 'text/plain', data: memo.value }] : undefined,
      })
      if (hash) {
        txHash.value = hash
        step.value = 'result'
        toast.success('Transaction sent successfully')
        await wallet.fetchBalance()
      } else {
        error.value = 'Transaction failed'
        toast.error('Transaction failed')
        step.value = 'form'
      }
    } else {
      const response = await sendMessage<{ hash: string }>({
        type: 'SEND_PAYMENT',
        payload: {
          destination: destination.value,
          amount: amountDrops.value,
          destinationTag: destinationTag.value ? Number(destinationTag.value) : undefined,
          memos: memo.value ? [{ type: 'text/plain', data: memo.value }] : undefined,
        },
      })

      if (response.success && response.data) {
        txHash.value = response.data.hash
        step.value = 'result'
        toast.success('Transaction sent successfully')
        await wallet.fetchBalance()
      } else {
        error.value = response.error ?? 'Transaction failed'
        toast.error(error.value)
        step.value = 'form'
      }
    }
  } catch (e) {
    error.value = (e as Error).message
    toast.error(error.value)
    step.value = 'form'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- Form Step -->
    <template v-if="step === 'form'">
      <h2 class="text-lg font-bold">Send {{ isToken ? selectedCurrency.split(':')[0] : 'XRP' }}</h2>

      <!-- Currency selector -->
      <div v-if="currencyOptions.length > 1">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Currency</label>
        <select
          v-model="selectedCurrency"
          class="mt-1.5 block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option v-for="opt in currencyOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <AddressInput
        v-model="destination"
        label="Destination Address"
        placeholder="rAddress..."
        :error="destination && !isValidAddress ? 'Invalid XRPL address' : ''"
        @select-contact="
          (c) => {
            if (c.tag) destinationTag = c.tag
          }
        "
      />

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Amount {{ isToken ? '' : '(XRP)' }}
          </label>
          <button class="text-xs text-primary-600 dark:text-primary-400" @click="setMax">
            Max
          </button>
        </div>
        <input
          v-model="amount"
          type="number"
          step="0.000001"
          min="0"
          placeholder="0.000000"
          class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <Input
        v-model="destinationTag"
        label="Destination Tag (optional)"
        placeholder="e.g. 12345"
        hint="Required for exchanges"
      />

      <Input
        v-model="memo"
        label="Memo (optional)"
        placeholder="e.g. Payment for invoice #123"
        hint="Text memo attached to the transaction"
      />

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

      <Button block :disabled="!canSend" @click="confirmSend"> Review </Button>
    </template>

    <!-- Confirm Step -->
    <template v-else-if="step === 'confirm'">
      <h2 class="text-lg font-bold">Confirm Transaction</h2>

      <Card>
        <div class="space-y-4 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">To</span>
            <span class="font-mono text-xs"
              >{{ destination.slice(0, 10) }}...{{ destination.slice(-6) }}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Amount</span>
            <span class="font-medium">
              {{ amount }} {{ isToken ? selectedCurrency.split(':')[0] : 'XRP' }}
            </span>
          </div>
          <div v-if="destinationTag" class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Tag</span>
            <span>{{ destinationTag }}</span>
          </div>
          <div v-if="memo" class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Memo</span>
            <span class="text-xs text-right break-all ml-4">{{ memo }}</span>
          </div>
        </div>
      </Card>

      <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="step = 'form'">Back</Button>
        <Button block :loading="loading" @click="executeSend">Send</Button>
      </div>
    </template>

    <!-- Result Step -->
    <template v-else>
      <div class="text-center py-8">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4"
        >
          <svg
            class="h-6 w-6 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 class="text-lg font-bold">Transaction Sent</h2>
        <p class="mt-2 text-xs text-gray-500 font-mono break-all">{{ txHash }}</p>
      </div>

      <Button block @click="router.push('/')">Back to Dashboard</Button>
    </template>
  </div>
</template>
