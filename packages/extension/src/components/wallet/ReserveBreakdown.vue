<script setup lang="ts">
import { computed } from 'vue'
import { DROPS_PER_XRP } from '@otsu/constants'

const props = defineProps<{
  balance: { available: string; total: string; reserved: string } | null
  xrpPrice: string | null
}>()

const totalXrp = computed(() => {
  if (!props.balance) return '--'
  return (Number(props.balance.total) / DROPS_PER_XRP).toFixed(6)
})

const availableXrp = computed(() => {
  if (!props.balance) return '--'
  return (Number(props.balance.available) / DROPS_PER_XRP).toFixed(6)
})

const reservedXrp = computed(() => {
  if (!props.balance) return '--'
  return (Number(props.balance.reserved) / DROPS_PER_XRP).toFixed(6)
})

const usdTotal = computed(() => {
  if (!props.balance || !props.xrpPrice || props.xrpPrice === '0') return null
  const usd = (Number(props.balance.total) / DROPS_PER_XRP) * Number(props.xrpPrice)
  return usd.toFixed(2)
})
</script>

<template>
  <p class="mt-2 text-4xl font-semibold tracking-tight">
    {{ totalXrp }}
    <span class="text-base font-normal text-text-muted">XRP</span>
  </p>
  <p v-if="usdTotal" class="mt-1 text-sm text-text-muted">~${{ usdTotal }} USD</p>

  <div class="mt-5 grid grid-cols-2 gap-5 border-t border-border pt-4 text-sm">
    <div>
      <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted">Available</p>
      <p class="mt-1 font-medium">{{ availableXrp }} XRP</p>
    </div>
    <div>
      <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted">Reserved</p>
      <p class="mt-1 font-medium">{{ reservedXrp }} XRP</p>
    </div>
  </div>
</template>
