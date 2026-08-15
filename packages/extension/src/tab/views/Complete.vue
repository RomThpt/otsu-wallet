<script setup lang="ts">
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div
      class="w-full max-w-md animate-slide-up space-y-6 p-8 text-center"
      role="status"
      aria-live="polite"
    >
      <SuccessAnimation kind="wallet" size="hero" />

      <div>
        <h2 class="text-2xl font-bold">Wallet Created</h2>
        <p class="mt-2 text-text-muted">
          Your wallet is ready to use. You can close this tab and use the extension popup.
        </p>
      </div>

      <p class="text-xs text-text-muted">
        Click the Otsu icon in your browser toolbar to open your wallet.
      </p>
    </div>
  </div>
</template>
