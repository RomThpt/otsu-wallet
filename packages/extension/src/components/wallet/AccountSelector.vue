<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Account } from '@otsu/types'
import AccountTypeIcon from './AccountTypeIcon.vue'

const props = defineProps<{
  accounts: Account[]
  activeAccount: string | null
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [address: string]
  addAccount: []
  loadMore: []
}>()

const isOpen = ref(false)

const active = computed(() =>
  props.accounts.find((a) => a.address === props.activeAccount),
)

function truncate(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function selectAccount(address: string): void {
  emit('select', address)
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      @click="isOpen = !isOpen"
    >
      <template v-if="active">
        <AccountTypeIcon :type="active.type" />
        <div class="min-w-0">
          <p class="text-xs font-medium truncate max-w-[120px]">{{ active.label }}</p>
          <p class="text-[10px] text-gray-500 font-mono">{{ truncate(active.address) }}</p>
        </div>
      </template>
      <template v-else>
        <span class="text-xs text-gray-500">No account</span>
      </template>
      <svg class="w-3 h-3 text-gray-400 shrink-0" :class="{ 'rotate-180': isOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      class="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto"
    >
      <div class="p-1">
        <button
          v-for="account in accounts"
          :key="account.address"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors"
          :class="{
            'bg-primary-50 dark:bg-primary-900/20': account.address === activeAccount,
            'hover:bg-gray-50 dark:hover:bg-gray-700': account.address !== activeAccount,
          }"
          @click="selectAccount(account.address)"
        >
          <AccountTypeIcon :type="account.type" />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium truncate">{{ account.label }}</p>
            <p class="text-[10px] text-gray-500 font-mono">{{ truncate(account.address) }}</p>
          </div>
          <svg
            v-if="account.address === activeAccount"
            class="w-4 h-4 text-primary-500 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700 p-1">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="emit('addAccount'); isOpen = false"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Account
        </button>
        <button
          v-if="accounts.length >= 50"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          :disabled="loading"
          @click="emit('loadMore'); isOpen = false"
        >
          Load More Accounts
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
  </div>
</template>
