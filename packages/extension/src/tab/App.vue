<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
useTheme()
</script>

<template>
  <div class="min-h-screen bg-bg text-text">
    <router-view />
  </div>
</template>
