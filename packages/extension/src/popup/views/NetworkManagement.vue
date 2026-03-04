<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const wallet = useWalletStore()
const toast = useToast()

onMounted(async () => {
  await wallet.fetchNetworks()
})

async function handleSwitch(networkId: string) {
  await wallet.switchNetwork(networkId)
  await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice()])
  toast.success('Network switched')
}

async function handleRemove(networkId: string) {
  const ok = await wallet.removeCustomNetwork(networkId)
  if (ok) {
    toast.success('Network removed')
  }
}

function networkDotColor(type: string, isCustom: boolean): string {
  if (isCustom) return 'bg-gray-400'
  switch (type) {
    case 'mainnet':
      return 'bg-green-500'
    case 'testnet':
    case 'devnet':
      return 'bg-blue-500'
    default:
      return 'bg-purple-500'
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div
      class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <button
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          @click="router.back()"
        >
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
        class="text-xs text-primary-600 dark:text-primary-400 font-medium px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
        @click="router.push('/settings/networks/add')"
      >
        + Add
      </button>
    </div>

    <div class="flex-1 overflow-y-auto">
      <!-- Predefined networks -->
      <div class="px-4 py-2">
        <p class="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
          Built-in Networks
        </p>
      </div>
      <button
        v-for="config in Object.values(wallet.predefinedNetworks)"
        :key="config.id"
        class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        @click="handleSwitch(config.id)"
      >
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0"
          :class="networkDotColor(config.type, false)"
        />
        <div class="flex-1 min-w-0 text-left">
          <p class="text-sm font-medium">{{ config.name }}</p>
          <p class="text-xs text-gray-500 truncate">{{ config.url }}</p>
        </div>
        <svg
          v-if="config.id === wallet.network"
          class="w-4 h-4 text-primary-500 shrink-0"
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
          <p class="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
            Custom Networks
          </p>
        </div>
        <div
          v-for="config in wallet.customNetworks"
          :key="config.id"
          class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <button
            class="flex items-center gap-3 flex-1 min-w-0 text-left"
            @click="handleSwitch(config.id)"
          >
            <span class="w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium">{{ config.name }}</p>
              <p class="text-xs text-gray-500 truncate">{{ config.url }}</p>
            </div>
            <svg
              v-if="config.id === wallet.network"
              class="w-4 h-4 text-primary-500 shrink-0"
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
            class="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
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
