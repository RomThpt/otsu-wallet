<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { NetworkConfig, CustomNetworkConfig } from '@otsu/types'

const props = defineProps<{
  activeNetwork: string
  predefinedNetworks: Record<string, NetworkConfig>
  customNetworks: CustomNetworkConfig[]
}>()

const emit = defineEmits<{
  switch: [networkId: string]
  manage: []
}>()

const isOpen = ref(false)
const focusedIndex = ref(-1)
const dropdownRef = ref<HTMLElement | null>(null)

const allNetworks = computed(() => {
  const predefined = Object.values(props.predefinedNetworks)
  return [...predefined, ...props.customNetworks]
})

const activeConfig = computed(() => {
  return allNetworks.value.find((n) => n.id === props.activeNetwork)
})

const dotColor = computed(() => {
  if (!activeConfig.value) return 'bg-gray-400'
  return networkDotColor(activeConfig.value)
})

function networkDotColor(config: NetworkConfig): string {
  switch (config.type) {
    case 'mainnet':
      return 'bg-green-500'
    case 'testnet':
    case 'devnet':
      return 'bg-blue-500'
    case 'custom':
      if ('addedAt' in config) return 'bg-gray-400'
      return 'bg-purple-500'
    default:
      return 'bg-gray-400'
  }
}

watch(isOpen, (open) => {
  if (open) {
    const idx = allNetworks.value.findIndex((n) => n.id === props.activeNetwork)
    focusedIndex.value = idx >= 0 ? idx : 0
    nextTick(() => dropdownRef.value?.focus())
  } else {
    focusedIndex.value = -1
  }
})

function selectNetwork(networkId: string): void {
  emit('switch', networkId)
  isOpen.value = false
}

function handleManage(): void {
  emit('manage')
  isOpen.value = false
}

function handleKeydown(event: KeyboardEvent): void {
  const len = allNetworks.value.length
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
        selectNetwork(allNetworks.value[focusedIndex.value].id)
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
      aria-label="Select network"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors"
      :class="{
        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300':
          activeNetwork === 'mainnet',
        'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300':
          activeNetwork !== 'mainnet',
      }"
      @click="isOpen = !isOpen"
    >
      <span class="w-2 h-2 rounded-full shrink-0" :class="dotColor" />
      {{ activeConfig?.name ?? activeNetwork }}
      <svg
        class="w-3 h-3 opacity-60 shrink-0"
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
      aria-label="Networks"
      tabindex="-1"
      class="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-80 overflow-y-auto outline-none"
      @keydown="handleKeydown"
    >
      <!-- Predefined networks -->
      <div class="p-1">
        <p class="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Networks
        </p>
        <button
          v-for="(config, index) in Object.values(predefinedNetworks)"
          :key="config.id"
          role="option"
          :aria-selected="config.id === activeNetwork"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors"
          :class="{
            'bg-primary-50 dark:bg-primary-900/20': config.id === activeNetwork,
            'hover:bg-gray-50 dark:hover:bg-gray-700': config.id !== activeNetwork,
            'ring-2 ring-primary-500': index === focusedIndex,
          }"
          @click="selectNetwork(config.id)"
        >
          <span class="w-2 h-2 rounded-full shrink-0" :class="networkDotColor(config)" />
          <span class="flex-1 truncate">{{ config.name }}</span>
          <svg
            v-if="config.id === activeNetwork"
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

      <!-- Custom networks -->
      <div
        v-if="customNetworks.length > 0"
        class="border-t border-gray-200 dark:border-gray-700 p-1"
      >
        <p class="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          Custom
        </p>
        <button
          v-for="(config, i) in customNetworks"
          :key="config.id"
          role="option"
          :aria-selected="config.id === activeNetwork"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors"
          :class="{
            'bg-primary-50 dark:bg-primary-900/20': config.id === activeNetwork,
            'hover:bg-gray-50 dark:hover:bg-gray-700': config.id !== activeNetwork,
            'ring-2 ring-primary-500': i + Object.keys(predefinedNetworks).length === focusedIndex,
          }"
          @click="selectNetwork(config.id)"
        >
          <span class="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
          <span class="flex-1 truncate">{{ config.name }}</span>
          <svg
            v-if="config.id === activeNetwork"
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

      <!-- Manage Networks link -->
      <div class="border-t border-gray-200 dark:border-gray-700 p-1">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          @click="handleManage"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Manage Networks
        </button>
      </div>
    </div>

    <!-- Backdrop -->
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
  </div>
</template>
