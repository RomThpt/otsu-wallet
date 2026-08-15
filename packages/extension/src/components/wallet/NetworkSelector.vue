<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { NetworkConfig, CustomNetworkConfig, ChainType } from '@otsu/types'
import { networkIndicatorClass } from '../../lib/network-appearance'

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
  return networkIndicatorClass(activeConfig.value)
})

const chainBadge = computed(() => {
  if (!activeConfig.value) return null
  return activeConfig.value.chainType === 'evm' ? 'EVM' : null
})

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
      :aria-label="`Select network, current network ${activeConfig?.name ?? activeNetwork}`"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      class="flex h-10 max-w-[104px] items-center gap-1.5 rounded-full bg-bg-subtle px-3 text-xs font-medium text-text shadow-card ring-1 ring-border/70 transition-all active:scale-[0.98]"
      @click="isOpen = !isOpen"
    >
      <span
        data-testid="active-network-indicator"
        class="h-2 w-2 shrink-0 rounded-full"
        :class="dotColor"
      />
      <span class="min-w-0 truncate">{{ activeConfig?.name ?? activeNetwork }}</span>
      <span
        v-if="chainBadge"
        class="px-1 py-0.5 rounded text-[9px] font-semibold bg-accent/10 text-accent"
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
      class="absolute top-full right-0 z-50 mt-2 max-h-80 w-56 overflow-y-auto rounded-[20px] border border-border bg-bg-subtle p-1 shadow-lg outline-none"
      @keydown="handleKeydown"
    >
      <div
        v-for="(group, gIdx) in networkGroups"
        :key="group.chainType"
        :class="{ 'border-t border-border': gIdx > 0 }"
        class="p-1"
      >
        <p class="px-3 py-1.5 text-[11px] font-medium text-text-muted uppercase tracking-wide">
          {{ group.label }}
        </p>
        <button
          v-for="(config, nIdx) in group.networks"
          :key="config.id"
          role="option"
          :aria-selected="config.id === activeNetwork"
          class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-text transition-colors"
          :class="{
            'bg-bg-hover': config.id === activeNetwork,
            'hover:bg-bg-hover': config.id !== activeNetwork,
            'ring-2 ring-link': flatIndex(gIdx, nIdx) === focusedIndex,
          }"
          @click="selectNetwork(config.id)"
        >
          <span
            data-testid="network-indicator"
            class="h-2 w-2 shrink-0 rounded-full"
            :class="networkIndicatorClass(config)"
          />
          <span class="flex-1 truncate">{{ config.name }}</span>
          <span
            v-if="config.chainType === 'evm'"
            class="px-1 py-0.5 rounded text-[9px] font-semibold bg-accent/10 text-accent"
          >
            EVM
          </span>
          <svg
            v-if="config.id === activeNetwork"
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
      </div>

      <!-- Manage Networks link -->
      <div class="border-t border-border p-1">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-xs text-accent hover:bg-bg-hover"
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
