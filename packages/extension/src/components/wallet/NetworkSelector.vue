<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { NetworkConfig, CustomNetworkConfig, ChainType } from '@otsu/types'

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

interface NetworkGroup {
  label: string
  chainType: ChainType
  networks: NetworkConfig[]
}

const networkGroups = computed((): NetworkGroup[] => {
  const predefined = Object.values(props.predefinedNetworks)
  const all = [...predefined, ...props.customNetworks]

  const xrpl = all.filter((n) => n.chainType === 'xrpl')
  const evm = all.filter((n) => n.chainType === 'evm')

  const groups: NetworkGroup[] = []
  if (xrpl.length > 0) groups.push({ label: 'XRPL', chainType: 'xrpl', networks: xrpl })
  if (evm.length > 0) groups.push({ label: 'EVM Sidechain', chainType: 'evm', networks: evm })
  return groups
})

const flatNetworks = computed(() => networkGroups.value.flatMap((g) => g.networks))

const activeConfig = computed(() => {
  return flatNetworks.value.find((n) => n.id === props.activeNetwork)
})

const dotColor = computed(() => {
  if (!activeConfig.value) return 'bg-gray-400'
  return networkDotColor(activeConfig.value)
})

const chainBadge = computed(() => {
  if (!activeConfig.value) return null
  return activeConfig.value.chainType === 'evm' ? 'EVM' : null
})

function networkDotColor(config: NetworkConfig): string {
  if (config.chainType === 'evm') return 'bg-orange-500'
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
    const idx = flatNetworks.value.findIndex((n) => n.id === props.activeNetwork)
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
  const len = flatNetworks.value.length
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
        selectNetwork(flatNetworks.value[focusedIndex.value].id)
      }
      break
    case 'Escape':
      event.preventDefault()
      isOpen.value = false
      break
  }
}

function flatIndex(groupIdx: number, itemIdx: number): number {
  let offset = 0
  for (let g = 0; g < groupIdx; g++) {
    offset += networkGroups.value[g].networks.length
  }
  return offset + itemIdx
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
          activeConfig?.chainType === 'xrpl' && activeConfig?.type === 'mainnet',
        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300':
          activeConfig?.chainType === 'evm',
        'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300':
          activeConfig?.chainType === 'xrpl' && activeConfig?.type !== 'mainnet',
      }"
      @click="isOpen = !isOpen"
    >
      <span class="w-2 h-2 rounded-full shrink-0" :class="dotColor" />
      {{ activeConfig?.name ?? activeNetwork }}
      <span
        v-if="chainBadge"
        class="px-1 py-0.5 rounded text-[9px] font-semibold bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200"
      >
        {{ chainBadge }}
      </span>
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
      <div
        v-for="(group, gIdx) in networkGroups"
        :key="group.chainType"
        :class="{ 'border-t border-gray-200 dark:border-gray-700': gIdx > 0 }"
        class="p-1"
      >
        <p class="px-3 py-1.5 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
          {{ group.label }}
        </p>
        <button
          v-for="(config, nIdx) in group.networks"
          :key="config.id"
          role="option"
          :aria-selected="config.id === activeNetwork"
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors"
          :class="{
            'bg-primary-50 dark:bg-primary-900/20': config.id === activeNetwork,
            'hover:bg-gray-50 dark:hover:bg-gray-700': config.id !== activeNetwork,
            'ring-2 ring-primary-500': flatIndex(gIdx, nIdx) === focusedIndex,
          }"
          @click="selectNetwork(config.id)"
        >
          <span class="w-2 h-2 rounded-full shrink-0" :class="networkDotColor(config)" />
          <span class="flex-1 truncate">{{ config.name }}</span>
          <span
            v-if="config.chainType === 'evm'"
            class="px-1 py-0.5 rounded text-[9px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
          >
            EVM
          </span>
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
