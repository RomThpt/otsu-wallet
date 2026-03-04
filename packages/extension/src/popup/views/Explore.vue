<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const items = [
  { path: '/explore/tokens', label: 'Tokens', description: 'Manage trustlines and token balances' },
  { path: '/explore/nfts', label: 'NFTs', description: 'View, mint, and trade NFTs' },
  { path: '/explore/dex', label: 'DEX', description: 'Trade on the decentralized exchange' },
  {
    path: '/explore/escrows',
    label: 'Escrows',
    description: 'Create and manage time-locked escrows',
  },
  { path: '/explore/checks', label: 'Checks', description: 'Create and cash XRPL checks' },
  {
    path: '/explore/contracts',
    label: 'Contracts',
    description: 'Interact with XLS-101 smart contracts',
  },
  {
    path: '/explore/account-settings',
    label: 'Account Settings',
    description: 'Configure account flags and domain',
  },
]
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-bold">Explore</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="item in items"
          :key="item.path"
          class="flex flex-col items-start p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-colors text-left"
          @click="router.push(item.path)"
        >
          <p class="text-sm font-medium">{{ item.label }}</p>
          <p class="text-xs text-gray-500 mt-1 leading-tight">{{ item.description }}</p>
        </button>
      </div>
    </div>
  </div>
</template>
