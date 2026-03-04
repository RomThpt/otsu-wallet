<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts, dismiss } = useToast()

function colorClasses(type: 'success' | 'error' | 'info'): string {
  switch (type) {
    case 'success':
      return 'bg-green-600 text-white'
    case 'error':
      return 'bg-red-600 text-white'
    case 'info':
      return 'bg-blue-600 text-white'
  }
}
</script>

<template>
  <div class="fixed top-2 right-2 z-[100] flex flex-col gap-2 max-w-[320px]">
    <TransitionGroup
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-x-4"
      enter-to-class="opacity-100 translate-x-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-x-0"
      leave-to-class="opacity-0 translate-x-4"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        role="alert"
        aria-live="assertive"
        class="flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg text-sm"
        :class="colorClasses(toast.type)"
      >
        <span class="flex-1">{{ toast.message }}</span>
        <button
          aria-label="Dismiss"
          class="shrink-0 p-0.5 rounded hover:bg-white/20"
          @click="dismiss(toast.id)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
