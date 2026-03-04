<script setup lang="ts">
defineProps<{
  variant?: 'text' | 'circle' | 'rect'
  width?: string
  height?: string
}>()
</script>

<template>
  <div
    class="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]"
    :class="{
      'h-4 rounded': variant === 'text' || !variant,
      'rounded-full': variant === 'circle',
      'rounded-lg': variant === 'rect',
    }"
    :style="{
      width: width ?? (variant === 'circle' ? '40px' : '100%'),
      height:
        height ??
        (variant === 'text' || !variant ? '16px' : variant === 'circle' ? '40px' : '100px'),
    }"
  />
</template>
