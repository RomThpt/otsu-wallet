<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from '../../components/common/Button.vue'

const router = useRouter()
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md space-y-8 p-8">
      <div class="text-center">
        <h1 class="text-4xl font-bold tracking-tight">Otsu</h1>
        <p class="mt-3 text-lg text-gray-600 dark:text-gray-400">Your XRPL wallet</p>
      </div>

      <div class="space-y-4">
        <Button block size="lg" @click="router.push('/generate')"> Create New Wallet </Button>
        <Button block size="lg" variant="secondary" @click="router.push('/import')">
          Import Existing Wallet
        </Button>
      </div>

      <p class="text-center text-xs text-gray-500 dark:text-gray-500">v0.1.0</p>
    </div>
  </div>
</template>
