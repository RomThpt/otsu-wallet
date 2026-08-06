<script setup lang="ts"></script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md space-y-6 p-8 text-center">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <svg class="h-8 w-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

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
