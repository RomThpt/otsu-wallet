<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
useTheme()
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <router-view />
  </div>
</template>
