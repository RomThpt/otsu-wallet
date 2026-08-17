<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'ink'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}>()
</script>

<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center rounded-full font-semibold transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-2 focus:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50',
      {
        'w-full': block,
        'h-9 px-3.5 text-sm': size === 'sm',
        'h-11 px-5 text-sm': size === 'md' || !size,
        'h-12 px-6 text-base': size === 'lg',
        'bg-accent text-accent-fg shadow-card hover:brightness-95':
          variant === 'primary' || !variant,
        'border border-border bg-bg-subtle text-text shadow-sm hover:bg-bg-hover':
          variant === 'secondary',
        'bg-danger text-white hover:opacity-90': variant === 'danger',
        'bg-zinc-950 text-white shadow-card hover:bg-zinc-800': variant === 'ink',
        'bg-transparent text-text-muted hover:bg-bg-hover hover:text-text': variant === 'ghost',
      },
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
    <slot />
  </button>
</template>
