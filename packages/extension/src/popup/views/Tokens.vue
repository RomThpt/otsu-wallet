<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { OwnedXrplAsset, TransactionReview } from '@otsu/types'
import { useDexStore } from '../../stores/dex'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Skeleton from '../../components/common/Skeleton.vue'
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import TransactionReviewView from '../../components/security/TransactionReview.vue'
import { confirmOnHardware } from '../../lib/hardware-review'

const router = useRouter()
const wallet = useWalletStore()
const dexStore = useDexStore()
const step = ref<'list' | 'review' | 'result'>('list')
const selectedAsset = ref<OwnedXrplAsset | null>(null)
const review = ref<TransactionReview | null>(null)
const loading = ref(false)
const error = ref('')

const addedAssets = computed(() =>
  dexStore.ownedAssets.filter((asset) => asset.asset.type !== 'native'),
)

onMounted(loadAssets)

async function loadAssets() {
  loading.value = true
  error.value = ''
  try {
    await dexStore.fetchOwnedAssets()
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loading.value = false
  }
}

function assetIdentifier(asset: OwnedXrplAsset): string {
  if (asset.asset.type === 'issued') return asset.asset.issuer
  if (asset.asset.type === 'mpt') return asset.asset.issuanceId
  return 'XRP'
}

async function reviewRemoval(asset: OwnedXrplAsset) {
  if (asset.asset.type === 'native') return
  loading.value = true
  error.value = ''
  selectedAsset.value = asset
  try {
    review.value = await wallet.prepareTransaction(
      asset.asset.type === 'issued'
        ? {
            chainType: 'xrpl',
            kind: 'trustline',
            action: 'remove',
            currency: asset.asset.currency,
            issuer: asset.asset.issuer,
          }
        : {
            chainType: 'xrpl',
            kind: 'mpt-authorization',
            action: 'unauthorize',
            issuanceId: asset.asset.issuanceId,
          },
    )
    if (!review.value.simulation.success) {
      throw new Error(review.value.simulation.error || 'Removal simulation failed')
    }
    step.value = 'review'
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loading.value = false
  }
}

async function confirmRemoval() {
  if (!review.value) return
  loading.value = true
  error.value = ''
  try {
    const confirmation = await confirmOnHardware(review.value)
    await wallet.confirmTransaction(
      review.value.reviewId,
      confirmation.externalSignature,
      confirmation.externalSignedTransaction,
    )
    await Promise.all([wallet.fetchBalance(), dexStore.fetchOwnedAssets()])
    step.value = 'result'
  } catch (cause) {
    error.value = (cause as Error).message
    step.value = 'list'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col px-4 pb-5">
    <template v-if="step === 'list'">
      <header class="flex items-center justify-between pb-4 pt-3">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Assets</h1>
          <p class="mt-1 text-sm text-text-muted">Trustlines and multi-purpose tokens.</p>
        </div>
        <Button size="sm" @click="router.push('/explore/tokens/add')">Add asset</Button>
      </header>

      <div v-if="loading" class="flex-1 overflow-hidden rounded-[20px] bg-bg-subtle">
        <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-4 py-3">
          <Skeleton variant="circle" width="32px" height="32px" />
          <div class="flex-1 space-y-2">
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" height="12px" />
          </div>
          <Skeleton variant="text" width="60px" />
        </div>
      </div>

      <div v-else-if="addedAssets.length === 0" class="flex flex-1 items-center justify-center p-4">
        <div class="text-center">
          <p class="text-sm font-medium">No assets added</p>
          <p class="mt-1 text-xs text-text-muted">Add a trustline or authorize an MPT.</p>
        </div>
      </div>

      <div v-else class="flex-1 overflow-y-auto rounded-[20px] bg-bg-subtle shadow-card">
        <article
          v-for="asset in addedAssets"
          :key="asset.key"
          class="border-b border-border/70 p-4 last:border-0"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <p class="font-semibold">{{ asset.symbol }}</p>
                <span
                  class="rounded-full bg-bg px-2 py-0.5 text-[10px] font-medium text-text-muted"
                >
                  {{ asset.asset.type === 'issued' ? 'Trustline' : 'MPT' }}
                </span>
                <span
                  v-if="!asset.tradeable"
                  class="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning"
                >
                  {{ asset.disabledReason || 'Trading disabled' }}
                </span>
              </div>
              <p class="mt-1 truncate font-mono text-[11px] text-text-subtle">
                {{ assetIdentifier(asset) }}
              </p>
            </div>
            <p class="shrink-0 text-right text-sm font-semibold">{{ asset.balance }}</p>
          </div>
          <button
            class="mt-3 text-xs font-medium text-danger"
            :disabled="loading"
            @click="reviewRemoval(asset)"
          >
            {{ asset.asset.type === 'issued' ? 'Remove trustline' : 'Remove MPT' }}
          </button>
        </article>
      </div>

      <p v-if="error" class="mt-3 form-error" role="alert">{{ error }}</p>
    </template>

    <template v-else-if="step === 'review'">
      <div class="flex-1 overflow-y-auto pt-4">
        <TransactionReviewView v-if="review" :review="review" />
        <p v-if="error" class="mt-3 form-error" role="alert">{{ error }}</p>
      </div>
      <div class="mt-4 flex gap-3">
        <Button variant="secondary" block @click="step = 'list'">Back</Button>
        <Button
          block
          :loading="loading"
          :disabled="!review?.simulation.success"
          @click="confirmRemoval"
        >
          Remove
        </Button>
      </div>
    </template>

    <template v-else>
      <div
        class="flex flex-1 flex-col items-center justify-center text-center"
        role="status"
        aria-live="polite"
      >
        <SuccessAnimation kind="wallet" size="hero" />
        <h2 class="mt-3 text-xl font-semibold">Asset removed</h2>
        <p class="mt-2 text-sm text-text-muted">The zero-balance authorization was removed.</p>
        <Button class="mt-6" block @click="step = 'list'">Done</Button>
      </div>
    </template>
  </div>
</template>
