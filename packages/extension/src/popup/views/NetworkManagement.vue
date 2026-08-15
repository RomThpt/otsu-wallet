<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import { networkIndicatorClass } from '../../lib/network-appearance'

const router = useRouter()
const wallet = useWalletStore()

onMounted(async () => {
  await wallet.fetchNetworks()
})

async function handleSwitch(networkId: string) {
  await wallet.switchNetwork(networkId)
  await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice()])
}

async function handleRemove(networkId: string) {
  const ok = await wallet.removeCustomNetwork(networkId)
  if (ok) {
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-3 border-b border-border">
      <div class="flex items-center gap-2">
        <button class="p-1 rounded hover:bg-bg-hover transition-colors" @click="router.back()">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 class="text-sm font-bold">Networks</h2>
      </div>
      <button
        class="text-xs text-accent font-medium px-2 py-1 rounded hover:bg-bg-subtle transition-colors"
        @click="router.push('/settings/networks/add')"
      >
        + Add
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Predefined networks -->
      <div class="px-4 py-2">
        <p class="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
          Built-in Networks
        </p>
      </div>
      <button
        v-for="config in Object.values(wallet.predefinedNetworks)"
        :key="config.id"
        class="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
        @click="handleSwitch(config.id)"
      >
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="networkIndicatorClass(config)" />
        <div class="flex-1 min-w-0 text-left">
          <p class="text-sm font-medium text-text">{{ config.name }}</p>
          <p class="text-xs text-text-muted truncate">{{ config.url }}</p>
        </div>
        <svg
          v-if="config.id === wallet.network"
          class="w-4 h-4 text-accent shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <!-- Custom networks -->
      <template v-if="wallet.customNetworks.length > 0">
        <div class="px-4 py-2 mt-2">
          <p class="text-[11px] font-medium text-text-muted uppercase tracking-wide mb-1">
            Custom Networks
          </p>
        </div>
        <div
          v-for="config in wallet.customNetworks"
          :key="config.id"
          class="flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors"
        >
          <button
            class="flex items-center gap-3 flex-1 min-w-0 text-left"
            @click="handleSwitch(config.id)"
          >
            <span
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              :class="networkIndicatorClass(config)"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-text">{{ config.name }}</p>
              <p class="text-xs text-text-muted truncate">{{ config.url }}</p>
            </div>
            <svg
              v-if="config.id === wallet.network"
              class="w-4 h-4 text-accent shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <button
            class="p-1 rounded text-text-muted hover:text-danger hover:bg-bg-subtle transition-colors shrink-0"
            title="Remove network"
            @click="handleRemove(config.id)"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
