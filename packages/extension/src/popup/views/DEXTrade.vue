<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { OwnedXrplAsset, TransactionReview } from '@otsu/types'
import { useDexStore } from '../../stores/dex'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import TransactionReviewView from '../../components/security/TransactionReview.vue'
import { confirmOnHardware } from '../../lib/hardware-review'

const router = useRouter()
const dexStore = useDexStore()
const wallet = useWalletStore()

const step = ref<'form' | 'review' | 'result'>('form')
const fromKey = ref('')
const toKey = ref('')
const amount = ref('')
const slippageBps = ref(50)
const review = ref<TransactionReview | null>(null)
const txHash = ref('')
const loading = ref(false)
const error = ref('')

function hasPositiveBalance(asset: OwnedXrplAsset): boolean {
  const value = asset.transactionBalance.trim()
  return !value.startsWith('-') && /[1-9]/.test(value)
}

const sourceAssets = computed(() =>
  dexStore.ownedAssets.filter((asset) => asset.tradeable && hasPositiveBalance(asset)),
)
const fromAsset = computed(() => dexStore.ownedAssets.find((asset) => asset.key === fromKey.value))
const toAsset = computed(() => dexStore.ownedAssets.find((asset) => asset.key === toKey.value))
const destinationAssets = computed(() =>
  dexStore.ownedAssets.filter((asset) => asset.tradeable && asset.key !== fromKey.value),
)
const canReview = computed(
  () =>
    Boolean(fromAsset.value && toAsset.value) &&
    Number.isFinite(Number(amount.value)) &&
    Number(amount.value) > 0,
)

onMounted(async () => {
  try {
    await dexStore.fetchOwnedAssets()
    const preferred = sourceAssets.value.find((asset) => asset.asset.type === 'native')
    fromKey.value = (preferred ?? sourceAssets.value[0])?.key ?? ''
    toKey.value = dexStore.ownedAssets.find((asset) => asset.key !== fromKey.value)?.key ?? ''
  } catch (cause) {
    error.value = (cause as Error).message
  }
})

function setMax() {
  if (!fromAsset.value) return
  if (fromAsset.value.asset.type !== 'native') {
    amount.value = fromAsset.value.balance
    return
  }
  const drops = BigInt(fromAsset.value.transactionBalance)
  const spendableDrops = drops > 12n ? drops - 12n : 0n
  const padded = spendableDrops.toString().padStart(7, '0')
  const whole = padded.slice(0, -6)
  const fraction = padded.slice(-6).replace(/0+$/, '')
  amount.value = `${whole}${fraction ? `.${fraction}` : ''}`
}

function switchAssets() {
  if (!toAsset.value || !hasPositiveBalance(toAsset.value)) return
  const previousFrom = fromKey.value
  fromKey.value = toKey.value
  toKey.value = previousFrom
  amount.value = ''
}

async function reviewSwap() {
  if (!canReview.value || !fromAsset.value || !toAsset.value) return
  loading.value = true
  error.value = ''
  try {
    const quote = await dexStore.fetchSwapQuote({
      from: fromAsset.value.asset,
      to: toAsset.value.asset,
      amount: amount.value,
      slippageBps: slippageBps.value,
    })
    review.value = await wallet.prepareTransaction({
      chainType: 'xrpl',
      kind: 'swap',
      quoteId: quote.quoteId,
    })
    if (!review.value.simulation.success) {
      throw new Error(review.value.simulation.error || 'Swap simulation failed')
    }
    step.value = 'review'
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loading.value = false
  }
}

async function executeSwap() {
  if (!review.value) return
  loading.value = true
  error.value = ''
  try {
    const confirmation = await confirmOnHardware(review.value)
    txHash.value = await wallet.confirmTransaction(
      review.value.reviewId,
      confirmation.externalSignature,
      confirmation.externalSignedTransaction,
    )
    step.value = 'result'
    await Promise.all([wallet.fetchBalance(), dexStore.fetchOwnedAssets()])
  } catch (cause) {
    error.value = (cause as Error).message
    step.value = 'form'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border px-4 py-3">
      <div class="flex items-center gap-2">
        <button
          class="-ml-1 rounded-lg p-1.5 text-text-muted transition hover:bg-bg-hover hover:text-text"
          aria-label="Back to Explore"
          @click="router.push('/explore')"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m15 18-6-6 6-6"
            />
          </svg>
        </button>
        <h1 class="text-base font-semibold">Swap</h1>
      </div>
      <button
        class="text-xs font-medium text-text-muted hover:text-text"
        @click="router.push('/explore/dex/offers')"
      >
        Open offers
      </button>
    </header>

    <main class="flex-1 overflow-y-auto p-4">
      <template v-if="step === 'form'">
        <div class="space-y-2">
          <section class="rounded-[22px] border border-border bg-bg-subtle p-4">
            <div class="flex items-center justify-between">
              <label for="swap-from-amount" class="text-xs font-medium text-text-muted"
                >You pay</label
              >
              <button class="text-xs font-medium text-accent" type="button" @click="setMax">
                Balance {{ fromAsset?.balance ?? '0' }} · Max
              </button>
            </div>
            <div class="mt-3 flex items-center gap-3">
              <input
                id="swap-from-amount"
                v-model="amount"
                class="min-w-0 flex-1 bg-transparent text-3xl font-medium tracking-tight outline-none placeholder:text-text-subtle"
                inputmode="decimal"
                placeholder="0"
                autocomplete="off"
              />
              <select v-model="fromKey" class="form-select w-auto max-w-[132px] font-semibold">
                <option v-for="asset in sourceAssets" :key="asset.key" :value="asset.key">
                  {{ asset.symbol }}
                </option>
              </select>
            </div>
          </section>

          <div class="relative z-10 flex h-5 items-center justify-center">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-bg shadow-sm transition hover:border-accent disabled:opacity-40"
              aria-label="Switch assets"
              :disabled="!toAsset || !hasPositiveBalance(toAsset)"
              @click="switchAssets"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m7 7 3-3 3 3M10 4v13m7 0-3 3-3-3m3 3V7"
                />
              </svg>
            </button>
          </div>

          <section class="rounded-[22px] border border-border bg-bg-subtle p-4">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-text-muted">You receive</span>
              <button
                class="text-xs font-medium text-accent"
                @click="router.push('/explore/tokens/add')"
              >
                + Add asset
              </button>
            </div>
            <div class="mt-3 flex items-center gap-3">
              <span class="min-w-0 flex-1 text-3xl font-medium text-text-subtle">—</span>
              <select v-model="toKey" class="form-select w-auto max-w-[132px] font-semibold">
                <option v-for="asset in destinationAssets" :key="asset.key" :value="asset.key">
                  {{ asset.symbol }}
                </option>
              </select>
            </div>
          </section>
        </div>

        <div class="mt-4 flex items-center justify-between rounded-2xl px-1 text-xs">
          <span class="text-text-muted">Maximum slippage</span>
          <select
            v-model.number="slippageBps"
            class="rounded-lg border border-border bg-bg px-2 py-1.5 font-medium"
          >
            <option :value="25">0.25%</option>
            <option :value="50">0.50%</option>
            <option :value="100">1.00%</option>
            <option :value="300">3.00%</option>
          </select>
        </div>

        <p
          v-if="sourceAssets.length === 0"
          class="mt-4 rounded-2xl bg-warning/10 p-3 text-xs text-warning"
        >
          No spendable assets are available. Add a trustline or MPT, then fund it before swapping.
        </p>
        <p v-if="error || dexStore.error" class="mt-4 form-error" role="alert">
          {{ error || dexStore.error }}
        </p>

        <Button class="mt-5" block :disabled="!canReview" :loading="loading" @click="reviewSwap">
          Review swap
        </Button>
      </template>

      <template v-else-if="step === 'review'">
        <TransactionReviewView v-if="review" :review="review" />
        <p v-if="error" class="mt-4 form-error" role="alert">{{ error }}</p>
        <div class="mt-5 flex gap-3">
          <Button variant="secondary" block @click="step = 'form'">Back</Button>
          <Button
            block
            :loading="loading"
            :disabled="!review?.simulation.success"
            @click="executeSwap"
          >
            Swap
          </Button>
        </div>
      </template>

      <template v-else>
        <div class="py-8 text-center" role="status" aria-live="polite">
          <SuccessAnimation kind="transaction" size="hero" />
          <h2 class="mt-3 text-xl font-semibold">Swap submitted</h2>
          <p class="mt-2 text-sm text-text-muted">The swap was sent to the XRP Ledger.</p>
          <p class="mt-3 break-all font-mono text-[11px] text-text-subtle">{{ txHash }}</p>
          <Button class="mt-6" block @click="router.push('/')">Back to wallet</Button>
        </div>
      </template>
    </main>
  </div>
</template>
