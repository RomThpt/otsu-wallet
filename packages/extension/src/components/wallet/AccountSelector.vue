<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { Account } from '@otsu/types'
import AccountTypeIcon from './AccountTypeIcon.vue'
import { useToast } from '../../composables/useToast'

const toast = useToast()

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
const focusedIndex = ref(-1)
const dropdownRef = ref<HTMLElement | null>(null)

const active = computed(() => props.accounts.find((a) => a.address === props.activeAccount))

watch(isOpen, (open) => {
  if (open) {
    const activeIndex = props.accounts.findIndex((a) => a.address === props.activeAccount)
    focusedIndex.value = activeIndex >= 0 ? activeIndex : 0
    nextTick(() => dropdownRef.value?.focus())
  } else {
    focusedIndex.value = -1
  }
})

function truncate(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function copyAddress(address: string): void {
  navigator.clipboard.writeText(address)
  toast.success('Address copied')
}

function selectAccount(address: string): void {
  emit('select', address)
  isOpen.value = false
}

function handleAddAccount(): void {
  emit('addAccount')
  isOpen.value = false
}

function handleLoadMore(): void {
  emit('loadMore')
  isOpen.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  const len = props.accounts.length
  if (len === 0) return

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusedIndex.value = (focusedIndex.value + 1) % len
      break
    case 'ArrowUp':
      event.preventDefault()
      focusedIndex.value = (focusedIndex.value - 1 + len) % len
      break
    case 'Enter':
      event.preventDefault()
      if (focusedIndex.value >= 0 && focusedIndex.value < len) {
        selectAccount(props.accounts[focusedIndex.value].address)
      }
      break
    case 'Escape':
      event.preventDefault()
      isOpen.value = false
      break
  }
}
</script>

<template>
  <div class="relative">
    <button
      aria-label="Select account"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      class="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
      @click="isOpen = !isOpen"
    >
      <template v-if="active">
        <AccountTypeIcon :type="active.type" />
        <div class="min-w-0">
          <p class="text-xs font-medium truncate max-w-[140px]">{{ active.label }}</p>
          <p class="text-[11px] text-gray-500 font-mono">{{ truncate(active.address) }}</p>
        </div>
      </template>
      <template v-else>
        <span class="text-xs text-gray-500">No account</span>
      </template>
      <svg
        class="w-3 h-3 text-gray-400 shrink-0"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <div
      v-if="isOpen"
      ref="dropdownRef"
      role="listbox"
      aria-label="Accounts"
      tabindex="-1"
      class="absolute top-full right-0 mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto outline-none"
      @keydown="handleKeydown"
    >
      <div class="p-1">
        <button
          v-for="(account, index) in accounts"
          :key="account.address"
          role="option"
          :aria-selected="account.address === activeAccount"
          class="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-left transition-colors"
          :class="{
            'bg-primary-50 dark:bg-primary-900/20': account.address === activeAccount,
            'hover:bg-gray-50 dark:hover:bg-gray-700': account.address !== activeAccount,
            'ring-2 ring-primary-500': index === focusedIndex,
          }"
          @click="selectAccount(account.address)"
        >
          <AccountTypeIcon :type="account.type" />
          <div class="min-w-0 flex-1">
            <p class="text-xs font-medium truncate">{{ account.label }}</p>
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-gray-500 font-mono">{{
                truncate(account.address)
              }}</span>
              <button
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                @click.stop="copyAddress(account.address)"
              >
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <svg
            v-if="account.address === activeAccount"
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
      </div>

      <div class="border-t border-gray-200 dark:border-gray-700 p-1">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="handleAddAccount"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Account
        </button>
        <button
          v-if="accounts.length >= 50"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          :disabled="loading"
          @click="handleLoadMore"
        >
          Load More Accounts
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
  </div>
</template>
