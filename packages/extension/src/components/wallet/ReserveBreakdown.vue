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
  <div class="text-center">
    <p class="text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
    <p class="text-3xl font-bold mt-1">{{ totalXrp }}</p>
    <p class="text-sm text-gray-500 dark:text-gray-400">XRP</p>
    <p v-if="usdTotal" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
      ~${{ usdTotal }} USD
    </p>
  </div>

  <div class="mt-4 grid grid-cols-2 gap-4 text-sm">
    <div>
      <p class="text-gray-500 dark:text-gray-400">Available</p>
      <p class="font-medium">{{ availableXrp }} XRP</p>
    </div>
    <div>
      <p class="text-gray-500 dark:text-gray-400">Reserved</p>
      <p class="font-medium">{{ reservedXrp }} XRP</p>
    </div>
  </div>
</template>
