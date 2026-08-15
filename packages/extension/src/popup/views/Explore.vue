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
  <div class="flex h-full flex-col">
    <div class="px-4 pb-4 pt-3">
      <h1 class="text-2xl font-semibold tracking-tight">Explore</h1>
      <p class="mt-1 text-sm text-text-muted">Tools for the XRP Ledger.</p>
    </div>

    <div class="flex-1 overflow-y-auto px-4 pb-5">
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="item in items"
          :key="item.path"
          class="flex min-h-[112px] flex-col items-start rounded-[20px] bg-bg-subtle p-4 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99]"
          @click="router.push(item.path)"
        >
          <span
            class="mb-3 flex h-8 w-8 items-center justify-center rounded-xl bg-bg-hover text-sm font-semibold text-text-muted"
          >
            {{ item.label.slice(0, 1) }}
          </span>
          <p class="text-sm font-semibold">{{ item.label }}</p>
          <p class="mt-1 text-xs leading-5 text-text-muted">{{ item.description }}</p>
        </button>
      </div>
    </div>
  </div>
</template>
