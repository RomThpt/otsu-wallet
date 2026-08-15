<script setup lang="ts">
import { computed } from 'vue'
import type { SimulationResult, TransactionReview } from '@otsu/types'
import Card from '../common/Card.vue'
import SimulationResultView from './SimulationResult.vue'

const props = defineProps<{ review: TransactionReview }>()

const xrplSimulation = computed<SimulationResult>(() => ({
  success: props.review.simulation.success,
  engineResult: props.review.simulation.engineResult,
  engineResultMessage: props.review.simulation.engineResultMessage,
  balanceChanges: props.review.simulation.balanceChanges ?? [],
  fee: props.review.networkFee,
  objectsCreated: props.review.simulation.objectsCreated ?? 0,
  objectsDeleted: props.review.simulation.objectsDeleted ?? 0,
  error: props.review.simulation.error,
}))
</script>

<template>
  <section class="space-y-4" data-testid="transaction-review">
    <header>
      <h2 class="text-lg font-semibold tracking-tight">{{ review.title }}</h2>
      <p v-if="review.description" class="mt-1 text-xs leading-5 text-text-muted">
        {{ review.description }}
      </p>
    </header>

    <Card>
      <dl class="space-y-3 text-sm">
        <div
          v-for="detail in review.details"
          :key="`${detail.label}:${detail.value}`"
          class="flex items-start justify-between gap-4"
        >
          <dt class="shrink-0 text-text-muted">{{ detail.label }}</dt>
          <dd
            class="min-w-0 break-all text-right font-medium"
            :class="detail.monospace ? 'font-mono text-xs' : ''"
          >
            {{ detail.value }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 border-t border-border pt-3">
          <dt class="text-text-muted">Maximum network fee</dt>
          <dd class="font-medium">{{ review.networkFee }} XRP</dd>
        </div>
        <div class="flex items-start justify-between gap-4 border-t border-border pt-3">
          <dt class="text-text-muted">From</dt>
          <dd class="min-w-0 break-all text-right font-mono text-xs">{{ review.account }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4">
          <dt class="text-text-muted">Network</dt>
          <dd class="font-medium">{{ review.network }}</dd>
        </div>
      </dl>
    </Card>

    <Card>
      <div class="mb-3">
        <p class="text-sm font-semibold">What will happen</p>
        <p class="mt-0.5 text-xs text-text-muted">
          {{
            review.chainType === 'xrpl'
              ? 'Simulated against the current XRP Ledger state'
              : 'Simulated against the current EVM state'
          }}
        </p>
      </div>
      <SimulationResultView v-if="review.chainType === 'xrpl'" :result="xrplSimulation" />
      <div
        v-else
        class="rounded-xl border px-3 py-2 text-xs font-medium"
        :class="
          review.simulation.success
            ? 'border-success/25 bg-success/10 text-success'
            : 'border-danger/25 bg-danger/10 text-danger'
        "
      >
        {{
          review.simulation.success
            ? 'Simulation completed successfully'
            : review.simulation.error || 'Simulation failed'
        }}
      </div>
    </Card>

    <p v-if="review.hardwareProvider" class="text-xs leading-5 text-text-muted">
      You will confirm this transaction on your
      {{ review.hardwareProvider === 'ledger' ? 'Ledger' : 'Trezor' }}.
    </p>
  </section>
</template>
