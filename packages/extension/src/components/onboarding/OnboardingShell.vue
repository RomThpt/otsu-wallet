<script setup lang="ts">
withDefaults(
  defineProps<{
    step?: number
    total?: number
    backLabel?: string
    wide?: boolean
    showBack?: boolean
  }>(),
  {
    step: undefined,
    total: 4,
    backLabel: 'Go back',
    wide: false,
    showBack: true,
  },
)

defineEmits<{ back: [] }>()
</script>

<template>
  <main data-testid="onboarding-shell" class="min-h-screen bg-white text-zinc-950">
    <div class="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-5 sm:px-10 sm:py-7">
      <header class="grid h-10 shrink-0 grid-cols-3 items-center" aria-label="Onboarding progress">
        <button
          v-if="showBack"
          type="button"
          class="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
          :aria-label="backLabel"
          @click="$emit('back')"
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
        <div v-else />

        <p v-if="step" class="text-center text-sm font-semibold tracking-tight text-zinc-600">
          {{ step }} / {{ total }}
        </p>
      </header>

      <section class="flex flex-1 items-center justify-center py-8 sm:py-12">
        <div class="w-full" :class="wide ? 'max-w-2xl' : 'max-w-lg'">
          <slot />
        </div>
      </section>
    </div>
  </main>
</template>
