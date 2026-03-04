<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  base: { currency: string; issuer?: string }
  quote: { currency: string; issuer?: string }
}>()

const emit = defineEmits<{
  update: [
    base: { currency: string; issuer?: string },
    quote: { currency: string; issuer?: string },
  ]
}>()

const pairs = [
  {
    label: 'XRP / USD.Bitstamp',
    base: { currency: 'XRP' },
    quote: { currency: 'USD', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' },
  },
  {
    label: 'XRP / EUR.Bitstamp',
    base: { currency: 'XRP' },
    quote: { currency: 'EUR', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' },
  },
  {
    label: 'XRP / BTC.Bitstamp',
    base: { currency: 'XRP' },
    quote: { currency: 'BTC', issuer: 'rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B' },
  },
]

const selectedIndex = ref(0)

function selectPair(index: number) {
  selectedIndex.value = index
  const pair = pairs[index]
  emit('update', pair.base, pair.quote)
}
</script>

<template>
  <div class="flex gap-1 flex-wrap">
    <button
      v-for="(pair, i) in pairs"
      :key="pair.label"
      :class="[
        'px-2 py-1 text-xs rounded-md border transition-colors',
        selectedIndex === i
          ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
      ]"
      @click="selectPair(i)"
    >
      {{ pair.label }}
    </button>
  </div>
</template>
