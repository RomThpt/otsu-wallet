<script setup lang="ts">
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import Button from '../../components/common/Button.vue'

function goToWallet() {
  window.close()
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-white px-6 py-10 text-zinc-950">
    <div class="w-full max-w-lg animate-slide-up space-y-10 text-center">
      <div role="status" aria-live="polite">
        <SuccessAnimation kind="wallet" size="hero" />
        <h1 class="mt-5 text-4xl font-bold tracking-tight">All Set!</h1>
        <p class="mt-3 text-base text-zinc-600">Your wallet is ready to use.</p>
      </div>

      <Button variant="ink" size="lg" block @click="goToWallet">Go to Wallet</Button>

      <p class="text-xs text-zinc-500">
        Click the Otsu icon in your browser toolbar whenever you need it.
      </p>
    </div>
  </main>
</template>
