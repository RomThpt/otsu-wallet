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
const estimatedGas = ref<string | null>(null)

const isEvm = computed(() => wallet.isEvmNetwork)

const currencyOptions = computed(() => {
  if (isEvm.value) {
    const options = [{ value: 'XRP', label: 'XRP' }]
    for (const token of wallet.evmTokens) {
      options.push({
        value: `erc20:${token.contractAddress}`,
        label: token.symbol,
      })
    }
    return options
  }
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

function isValidTag(raw: unknown): raw is string {
  if (typeof raw !== 'string' && typeof raw !== 'number') return false
  const s = String(raw).trim()
  if (s === '') return false
  return /^\d+$/.test(s) && Number(s) <= 4294967295
}

const isValidAddress = computed(() => {
  if (isEvm.value) {
    return /^0x[0-9a-fA-F]{40}$/.test(destination.value)
  }
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

const addressPlaceholder = computed(() => {
  return isEvm.value ? '0x...' : 'rAddress...'
})

const addressError = computed(() => {
  if (!destination.value) return ''
  if (!isValidAddress.value) {
    return isEvm.value ? 'Invalid EVM address' : 'Invalid XRPL address'
  }
  return ''
})

onMounted(async () => {
  if (isEvm.value) {
    try {
      await wallet.fetchEvmTokens()
    } catch {
      /* ignore */
    }
  } else if (wallet.tokens.length === 0) {
    try {
      await wallet.fetchTokens()
    } catch {
      /* ignore */
    }
  }

  // Pre-fill from xrpl: URI query param (XRPL only)
  if (!isEvm.value) {
    const uri = route.query.uri as string | undefined
    if (uri) {
      const parsed = parseXrplUri(decodeURIComponent(uri))
      if (parsed) {
        destination.value = parsed.address
        if (parsed.amount) amount.value = parsed.amount
        if (parsed.destinationTag !== undefined) {
          if (isValidTag(parsed.destinationTag)) {
            destinationTag.value = String(parsed.destinationTag).trim()
          } else {
            error.value = 'Invalid destination tag in link (must be an integer)'
          }
        }
        if (parsed.currency && parsed.issuer) {
          selectedCurrency.value = `${parsed.currency}:${parsed.issuer}`
        }
      }
    }
  }
})

function setMax() {
  if (isEvm.value) {
    if (isToken.value) {
      const addr = selectedCurrency.value.replace('erc20:', '')
      const token = wallet.evmTokens.find((t) => t.contractAddress === addr)
      if (token) amount.value = token.formattedBalance
    } else if (wallet.evmBalance) {
      amount.value = wallet.evmBalance.formatted
    }
  } else {
    if (isToken.value) {
      const [currency, issuer] = selectedCurrency.value.split(':')
      const token = wallet.tokens.find((t) => t.currency === currency && t.issuer === issuer)
      if (token) amount.value = token.value
    } else if (wallet.balance) {
      const available = Number(wallet.balance.available) / DROPS_PER_XRP
      amount.value = Math.max(0, available - 0.000012).toFixed(6)
    }
  }
}

async function confirmSend() {
  if (!canSend.value) return
  error.value = ''

  if (isEvm.value) {
    try {
      const gas = await wallet.estimateEvmGas({
        to: destination.value,
        value: isToken.value ? undefined : amount.value,
      })
      estimatedGas.value = gas
    } catch {
      estimatedGas.value = null
    }
  }

  step.value = 'confirm'
}

async function executeSend() {
  if (destinationTag.value && !isValidTag(destinationTag.value)) {
    error.value = 'Destination tag must be an integer between 0 and 4294967295'
    toast.error(error.value)
    step.value = 'form'
    return
  }

  loading.value = true
  error.value = ''

  try {
    if (isEvm.value) {
      const hash = await wallet.sendEvmTransaction({
        to: destination.value,
        value: isToken.value ? undefined : amount.value,
      })
      if (hash) {
        txHash.value = hash
        step.value = 'result'
        toast.success('Transaction sent successfully')
        await wallet.fetchEvmBalance()
      } else {
        error.value = 'Transaction failed'
        toast.error('Transaction failed')
        step.value = 'form'
      }
    } else if (isToken.value) {
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
        <label class="text-sm font-medium text-text">Currency</label>
        <select
          v-model="selectedCurrency"
          class="mt-1.5 block w-full rounded-lg border border-border px-3 py-2 text-sm bg-bg-subtle text-text focus:outline-none focus:ring-2 focus:ring-link"
        >
          <option v-for="opt in currencyOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>

      <AddressInput
        v-model="destination"
        label="Destination Address"
        :placeholder="addressPlaceholder"
        :error="addressError"
        @select-contact="
          (c) => {
            if (c.tag) {
              if (isValidTag(c.tag)) destinationTag = String(c.tag).trim()
              else error = 'Address book entry has an invalid destination tag'
            }
          }
        "
      />

      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-text"> Amount {{ isToken ? '' : '(XRP)' }} </label>
          <button class="text-xs text-accent" @click="setMax">Max</button>
        </div>
        <input
          v-model="amount"
          type="number"
          :step="isEvm ? '0.000000000000000001' : '0.000001'"
          min="0"
          :placeholder="isEvm ? '0.000000000000000000' : '0.000000'"
          class="block w-full rounded-lg border border-border px-3 py-2 text-sm bg-bg-subtle text-text focus:outline-none focus:ring-2 focus:ring-link"
        />
      </div>

      <!-- Destination tag and memo (XRPL only) -->
      <template v-if="!isEvm">
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
      </template>

      <p v-if="error" class="text-xs text-danger">{{ error }}</p>

      <Button block :disabled="!canSend" @click="confirmSend"> Review </Button>
    </template>

    <!-- Confirm Step -->
    <template v-else-if="step === 'confirm'">
      <h2 class="text-lg font-bold">Confirm Transaction</h2>

      <Card>
        <div class="space-y-4 text-sm">
          <div class="flex justify-between">
            <span class="text-text-muted">To</span>
            <span class="font-mono text-xs"
              >{{ destination.slice(0, 10) }}...{{ destination.slice(-6) }}</span
            >
          </div>
          <div class="flex justify-between">
            <span class="text-text-muted">Amount</span>
            <span class="font-medium">
              {{ amount }} {{ isToken ? selectedCurrency.split(':')[0] : 'XRP' }}
            </span>
          </div>
          <div v-if="!isEvm && destinationTag" class="flex justify-between">
            <span class="text-text-muted">Tag</span>
            <span>{{ destinationTag }}</span>
          </div>
          <div v-if="!isEvm && memo" class="flex justify-between">
            <span class="text-text-muted">Memo</span>
            <span class="text-xs text-right break-all ml-4">{{ memo }}</span>
          </div>
          <div v-if="isEvm && estimatedGas" class="flex justify-between">
            <span class="text-text-muted">Est. Gas</span>
            <span class="text-xs">{{ estimatedGas }}</span>
          </div>
          <div v-if="isEvm" class="flex justify-between">
            <span class="text-text-muted">Network</span>
            <span class="text-xs">EVM Sidechain</span>
          </div>
        </div>
      </Card>

      <p v-if="error" class="text-xs text-danger">{{ error }}</p>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="step = 'form'">Back</Button>
        <Button block :loading="loading" @click="executeSend">Send</Button>
      </div>
    </template>

    <!-- Result Step -->
    <template v-else>
      <div class="text-center py-8">
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-bg-subtle mb-4"
        >
          <svg class="h-6 w-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 class="text-lg font-bold">Transaction Sent</h2>
        <p class="mt-2 text-xs text-text-muted font-mono break-all">{{ txHash }}</p>
      </div>

      <Button block @click="router.push('/')">Back to Dashboard</Button>
    </template>
  </div>
</template>
