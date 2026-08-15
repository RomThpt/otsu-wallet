<script setup lang="ts">
defineProps<{
  name: string
  amount: string
  usdValue: string | null
  unitPrice: string | null
  iconLabel: string
  balanceVisible: boolean
}>()

defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    type="button"
    data-testid="portfolio-asset-row"
    class="group grid min-h-[76px] w-full grid-cols-[44px_minmax(0,1fr)_auto_14px] items-center gap-3 rounded-[20px] bg-bg-subtle px-3 py-3 text-left shadow-card ring-1 ring-border/60 outline-none transition-all hover:-translate-y-px hover:ring-text-muted/35 focus-visible:ring-2 focus-visible:ring-text active:translate-y-0 active:scale-[0.995]"
    :aria-label="
      balanceVisible
        ? `View ${name}, balance ${amount}, value ${usdValue ?? 'unavailable'}, unit price ${unitPrice ?? 'unavailable'}`
        : `View ${name}, balances hidden`
    "
    @click="$emit('select')"
  >
    <span
      class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-text text-[13px] text-bg"
      aria-hidden="true"
    >
      {{ iconLabel }}
    </span>

    <span class="min-w-0 self-center">
      <span data-field="asset-name" class="block truncate text-[15px] leading-5 text-text">{{
        name
      }}</span>
      <span
        data-field="asset-amount"
        class="mt-0.5 block truncate text-[13px] leading-5 tabular-nums text-text-muted"
      >
        {{ balanceVisible ? amount : '••••' }}
      </span>
    </span>

    <span class="min-w-0 self-center text-right">
      <span
        data-field="asset-usd-value"
        class="block max-w-[112px] truncate text-[15px] leading-5 tabular-nums text-text"
      >
        {{ balanceVisible ? (usdValue ?? '$—') : '••••' }}
      </span>
      <span
        data-field="asset-unit-price"
        class="mt-0.5 block max-w-[112px] truncate text-[13px] leading-5 tabular-nums text-text-muted"
      >
        {{ balanceVisible ? (unitPrice ?? 'Price unavailable') : 'Hidden' }}
      </span>
    </span>

    <svg
      class="h-4 w-4 text-text-muted transition-transform group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 5l7 7-7 7" />
    </svg>
  </button>
</template>
