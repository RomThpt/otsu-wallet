<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TransactionReview } from '@otsu/types'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import TransactionReviewView from '../../components/security/TransactionReview.vue'
import TrustlineWarning from '../../components/security/TrustlineWarning.vue'
import { confirmOnHardware } from '../../lib/hardware-review'

const router = useRouter()
const wallet = useWalletStore()

const step = ref<'form' | 'review' | 'result'>('form')
const assetType = ref<'trustline' | 'mpt'>('trustline')
const currency = ref('')
const issuer = ref('')
const limit = ref('1000000')
const issuanceId = ref('')
const loading = ref(false)
const error = ref('')
const review = ref<TransactionReview | null>(null)
const txHash = ref('')

const isValidIssuer = computed(() => /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(issuer.value))
const canSubmit = computed(() =>
  assetType.value === 'trustline'
    ? /^(?:[A-Za-z0-9]{3}|[A-Fa-f0-9]{40})$/.test(currency.value.trim()) &&
      isValidIssuer.value &&
      Number(limit.value) > 0
    : /^[A-Fa-f0-9]{48}$/.test(issuanceId.value.trim()),
)

async function prepareReview() {
  if (!canSubmit.value) return
  loading.value = true
  error.value = ''
  try {
    review.value = await wallet.prepareTransaction(
      assetType.value === 'trustline'
        ? {
            chainType: 'xrpl',
            kind: 'trustline',
            action: 'add',
            currency: currency.value.trim().toUpperCase(),
            issuer: issuer.value.trim(),
            limit: limit.value.trim(),
          }
        : {
            chainType: 'xrpl',
            kind: 'mpt-authorization',
            action: 'authorize',
            issuanceId: issuanceId.value.trim().toUpperCase(),
          },
    )
    if (!review.value.simulation.success) {
      throw new Error(review.value.simulation.error || 'Asset authorization simulation failed')
    }
    step.value = 'review'
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loading.value = false
  }
}

async function confirmAuthorization() {
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
    await wallet.fetchTokens()
    step.value = 'result'
  } catch (cause) {
    error.value = (cause as Error).message
    step.value = 'form'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4 p-4">
    <template v-if="step === 'form'">
      <div>
        <h1 class="text-lg font-semibold tracking-tight">Add asset</h1>
        <p class="mt-1 text-xs leading-5 text-text-muted">
          Add an issued-currency trustline or authorize an MPT on this account.
        </p>
      </div>

      <div class="grid grid-cols-2 rounded-xl bg-bg-subtle p-1">
        <button
          class="rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="assetType === 'trustline' ? 'bg-bg shadow-sm' : 'text-text-muted'"
          @click="assetType = 'trustline'"
        >
          Trustline
        </button>
        <button
          class="rounded-lg px-3 py-2 text-sm font-medium transition"
          :class="assetType === 'mpt' ? 'bg-bg shadow-sm' : 'text-text-muted'"
          @click="assetType = 'mpt'"
        >
          MPT
        </button>
      </div>

      <template v-if="assetType === 'trustline'">
        <Input v-model="currency" label="Currency code" placeholder="USD or 40-character hex" />
        <Input
          v-model="issuer"
          label="Issuer address"
          placeholder="rAddress..."
          :error="issuer && !isValidIssuer ? 'Invalid XRPL address' : ''"
        />
        <Input
          v-model="limit"
          label="Trust limit"
          placeholder="1000000"
          hint="Maximum amount this trustline can hold"
          inputmode="decimal"
        />
      </template>
      <Input
        v-else
        v-model="issuanceId"
        label="MPT issuance ID"
        placeholder="48-character hexadecimal ID"
        hint="The authorization creates a zero-balance MPT holding"
      />

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="flex gap-3">
        <Button variant="secondary" block @click="router.push('/explore/tokens')">Cancel</Button>
        <Button block :disabled="!canSubmit" :loading="loading" @click="prepareReview">
          Review
        </Button>
      </div>
    </template>

    <template v-else-if="step === 'review'">
      <TrustlineWarning v-if="assetType === 'trustline'" :issuer="issuer" />
      <TransactionReviewView v-if="review" :review="review" />
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="flex gap-3">
        <Button variant="secondary" block @click="step = 'form'">Back</Button>
        <Button
          block
          :loading="loading"
          :disabled="!review?.simulation.success"
          @click="confirmAuthorization"
        >
          Confirm
        </Button>
      </div>
    </template>

    <template v-else>
      <div class="py-8 text-center" role="status" aria-live="polite">
        <SuccessAnimation kind="wallet" size="hero" />
        <h2 class="mt-3 text-xl font-semibold">Asset added</h2>
        <p class="mt-2 text-sm text-text-muted">The authorization was submitted successfully.</p>
        <p class="mt-3 break-all font-mono text-[11px] text-text-subtle">{{ txHash }}</p>
        <Button class="mt-6" block @click="router.push('/explore/tokens')">View assets</Button>
      </div>
    </template>
  </div>
</template>
