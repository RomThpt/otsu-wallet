<script setup lang="ts">
import { useRouter } from 'vue-router'

const props = withDefaults(
  defineProps<{
    title: string
    backTo: string
    backLabel?: string
    padded?: boolean
  }>(),
  {
    backLabel: 'Back',
    padded: true,
  },
)

const router = useRouter()

function goBack() {
  router.push(props.backTo)
}
</script>

<template>
  <div data-testid="settings-page" class="flex h-full min-h-0 flex-col bg-bg text-text">
    <header class="relative flex h-16 shrink-0 items-center justify-between px-3">
      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-2xl text-text-muted transition hover:bg-bg-hover hover:text-text focus:outline-none focus:ring-2 focus:ring-text focus:ring-offset-2 focus:ring-offset-bg"
        :aria-label="backLabel"
        @click="goBack"
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>

      <h1
        class="pointer-events-none absolute inset-x-14 text-center text-lg font-bold tracking-tight"
      >
        {{ title }}
      </h1>

      <div class="flex min-h-11 min-w-11 items-center justify-end">
        <slot name="action" />
      </div>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain" :class="padded && 'px-4 pb-5'">
      <slot />
    </div>
  </div>
</template>
