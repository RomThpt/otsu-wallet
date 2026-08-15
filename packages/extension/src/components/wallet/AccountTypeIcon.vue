<script setup lang="ts">
defineProps<{
  type: 'hd' | 'imported' | 'hardware' | 'multisig'
}>()
</script>

<template>
  <span
    class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bg-hover text-text-muted"
    :title="type"
  >
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        v-if="type === 'hd'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
        d="M5 7.5h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-11a2 2 0 012-2h11m1 8h.01"
      />
      <path
        v-else-if="type === 'imported'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
        d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14"
      />
      <path
        v-else-if="type === 'hardware'"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
        d="M8 3h8a2 2 0 012 2v14a2 2 0 01-2 2H8a2 2 0 01-2-2V5a2 2 0 012-2zm2 3h4m-3 12h2"
      />
      <path
        v-else
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.75"
        d="M8.5 11a3 3 0 100-6 3 3 0 000 6zm7-1a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3 19a5.5 5.5 0 0111 0m0-6a5 5 0 017 5"
      />
    </svg>
    <span class="sr-only">{{ type }} account</span>
  </span>
</template>
