<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import { DROPS_PER_XRP } from '@otsu/constants'
import type { TransactionIntent, TransactionReview } from '@otsu/types'
import { EvmContract, evmParseUnits } from '@otsu/core'
import { parseXrplUri } from '../../lib/uri-parser'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import AddressInput from '../../components/common/AddressInput.vue'
import TransactionReviewView from '../../components/security/TransactionReview.vue'
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import { confirmOnHardware } from '../../lib/hardware-review'

const router = useRouter()
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
const review = ref<TransactionReview | null>(null)

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

function buildTransactionIntent(): TransactionIntent {
  if (!isEvm.value) {
    const [currency, issuer] = isToken.value ? selectedCurrency.value.split(':') : []
    return {
      chainType: 'xrpl',
      kind: 'payment',
      destination: destination.value,
      amount: isToken.value ? amount.value : amountDrops.value,
      currency,
      issuer,
      destinationTag: destinationTag.value ? Number(destinationTag.value) : undefined,
      memos: memo.value ? [{ type: 'text/plain', data: memo.value }] : undefined,
    }
  }

  if (isToken.value) {
    const contractAddress = selectedCurrency.value.replace('erc20:', '')
    const token = wallet.evmTokens.find(
      (item) => item.contractAddress.toLowerCase() === contractAddress.toLowerCase(),
    )
    if (!token) throw new Error('Selected token is not available')
    const contract = new EvmContract(contractAddress, [
      'function transfer(address recipient, uint256 amount) returns (bool)',
    ])
    return {
      chainType: 'evm',
      kind: 'transaction',
      to: contractAddress,
      value: '0',
      data: contract.interface.encodeFunctionData('transfer', [
        destination.value,
        evmParseUnits(amount.value, token.decimals),
      ]),
    }
  }

  return {
    chainType: 'evm',
    kind: 'transaction',
    to: destination.value,
    value: amount.value,
  }
}

async function confirmSend() {
  if (!canSend.value) return
  error.value = ''
  loading.value = true

  try {
    review.value = await wallet.prepareTransaction(buildTransactionIntent())
    if (!review.value.simulation.success) {
      throw new Error(review.value.simulation.error ?? 'Transaction simulation failed')
    }
    step.value = 'confirm'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function executeSend() {
  if (destinationTag.value && !isValidTag(destinationTag.value)) {
    error.value = 'Destination tag must be an integer between 0 and 4294967295'
    step.value = 'form'
    return
  }

  loading.value = true
  error.value = ''

  try {
    if (!review.value) throw new Error('Transaction review expired. Review it again.')
    const { externalSignature, externalSignedTransaction } = await confirmOnHardware(review.value)
    txHash.value = await wallet.confirmTransaction(
      review.value.reviewId,
      externalSignature,
      externalSignedTransaction,
    )
    step.value = 'result'
    if (isEvm.value) await wallet.fetchEvmBalance()
    else await wallet.fetchBalance()
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
    <!-- Form Step -->
    <template v-if="step === 'form'">
      <h2 class="text-lg font-bold">Send {{ isToken ? selectedCurrency.split(':')[0] : 'XRP' }}</h2>

      <!-- Currency selector -->
      <div v-if="currencyOptions.length > 1" class="form-field">
        <label class="form-label">Currency</label>
        <select v-model="selectedCurrency" class="form-select">
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

      <div class="form-field">
        <div class="flex items-center justify-between">
          <label class="form-label"> Amount {{ isToken ? '' : '(XRP)' }} </label>
          <button class="text-xs text-accent" @click="setMax">Max</button>
        </div>
        <input
          v-model="amount"
          type="number"
          :step="isEvm ? '0.000000000000000001' : '0.000001'"
          min="0"
          :placeholder="isEvm ? '0.000000000000000000' : '0.000000'"
          class="form-control"
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

      <Button block :disabled="!canSend" :loading="loading" @click="confirmSend"> Review </Button>
    </template>

    <!-- Confirm Step -->
    <template v-else-if="step === 'confirm'">
      <TransactionReviewView v-if="review" :review="review" />

      <p v-if="error" class="text-xs text-danger">{{ error }}</p>

      <div class="flex gap-3">
        <Button variant="secondary" block @click="step = 'form'">Back</Button>
        <Button
          block
          :loading="loading"
          :disabled="!review?.simulation.success"
          @click="executeSend"
        >
          Send
        </Button>
      </div>
    </template>

    <!-- Result Step -->
    <template v-else>
      <div class="animate-slide-up py-8 text-center" role="status" aria-live="polite">
        <SuccessAnimation class="mb-3" kind="transaction" />
        <h2 class="text-lg font-bold">Transaction Sent</h2>
        <p class="mt-1 text-sm text-text-muted">Your transfer was submitted successfully.</p>
        <p class="mt-2 text-xs text-text-muted font-mono break-all">{{ txHash }}</p>
      </div>

      <Button block @click="router.push('/')">Back to Dashboard</Button>
    </template>
  </div>
</template>
