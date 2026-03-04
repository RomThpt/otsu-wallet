<script setup lang="ts">
import { computed } from 'vue'
import { DROPS_PER_XRP } from '@otsu/constants'

const props = defineProps<{
  amountDrops: string
  xrpPrice: string | null
}>()

const xrpAmount = computed(() => {
  return (Number(props.amountDrops) / DROPS_PER_XRP).toFixed(6)
})

const usdValue = computed(() => {
  if (!props.xrpPrice || props.xrpPrice === '0') return null
  const usd = (Number(props.amountDrops) / DROPS_PER_XRP) * Number(props.xrpPrice)
  return usd.toFixed(2)
})
</script>

<template>
  <span>
    {{ xrpAmount }} XRP
    <span v-if="usdValue" class="text-gray-500 dark:text-gray-400">
      (~${{ usdValue }})
    </span>
  </span>
</template>
