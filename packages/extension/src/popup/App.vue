<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useWalletStore } from '../stores/wallet'
import { useIdentityStore } from '../stores/identity'
import Unlock from './views/Unlock.vue'
import AccountSelector from '../components/wallet/AccountSelector.vue'
import NetworkSelector from '../components/wallet/NetworkSelector.vue'
import OfflineBanner from '../components/common/OfflineBanner.vue'
import { useOnlineStatus } from '../composables/useOnlineStatus'
import { useRouter } from 'vue-router'

useTheme()
const router = useRouter()
const wallet = useWalletStore()
const identity = useIdentityStore()
const { isOnline } = useOnlineStatus()
const initialized = ref(false)
const portfolioRoutes = new Set([
  '/send',
  '/receive',
  '/history',
  '/explore',
  '/explore/tokens',
  '/explore/nfts',
  '/explore/dex',
  '/bridge',
])
const showPortfolioBack = computed(() => portfolioRoutes.has(router.currentRoute.value.path))
const isDashboard = computed(() => router.currentRoute.value.path === '/')
const isSettingsFlow = computed(() => {
  const path = router.currentRoute.value.path
  return path === '/settings' || path.startsWith('/settings/') || path === '/address-book'
})

onMounted(async () => {
  try {
    await wallet.fetchState()
    await wallet.fetchNetworks()
    if (!wallet.locked) await wallet.hydrateCachedData()
    await identity.fetchState()
  } catch (error) {
    console.error('Failed to fetch wallet state:', error)
  } finally {
    initialized.value = true
  }
})

async function handleSelectAccount(address: string) {
  await wallet.setActiveAccount(address)
  if (wallet.isEvmNetwork) {
    await Promise.all([wallet.fetchEvmBalance(), wallet.fetchEvmTokens()])
  } else {
    await wallet.hydrateCachedData()
    await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice(), wallet.fetchTokens()])
  }
}

async function handleDeriveMore() {
  await wallet.deriveMoreAccounts(25)
}

async function handleSwitchNetwork(networkId: string) {
  await wallet.switchNetwork(networkId)
  if (wallet.isEvmNetwork) {
    await Promise.all([wallet.fetchEvmBalance(), wallet.fetchEvmTokens()])
  } else {
    await wallet.hydrateCachedData()
    await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice(), wallet.fetchTokens()])
  }
}
</script>

<template>
  <div class="w-popup h-popup bg-bg text-text flex flex-col overflow-hidden relative">
    <template v-if="!initialized">
      <div class="flex-1 flex items-center justify-center">
        <div
          class="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full"
        />
      </div>
    </template>

    <template v-else-if="wallet.locked">
      <Unlock />
    </template>

    <template v-else>
      <header
        v-if="!isSettingsFlow"
        class="relative z-10 flex shrink-0 items-center justify-between"
        :class="isDashboard ? 'h-[72px] px-4' : 'h-16 px-3'"
      >
        <button
          v-if="showPortfolioBack"
          type="button"
          aria-label="Back to wallet overview"
          class="flex h-11 items-center gap-2 rounded-2xl px-2 text-sm font-semibold transition-colors hover:bg-bg-hover active:bg-bg-hover"
          @click="router.push('/')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Wallet
        </button>
        <AccountSelector
          v-else
          :accounts="wallet.accounts"
          :active-account="wallet.activeAccount"
          :loading="wallet.loading"
          :chain-type="wallet.currentChainType"
          :prominent="isDashboard"
          @select="handleSelectAccount"
          @add-account="$router.push('/accounts')"
          @load-more="handleDeriveMore"
        />
        <div class="flex items-center gap-1.5">
          <NetworkSelector
            :active-network="wallet.network"
            :predefined-networks="wallet.predefinedNetworks"
            :custom-networks="wallet.customNetworks"
            @switch="handleSwitchNetwork"
            @manage="router.push('/settings/networks')"
          />
          <router-link
            to="/settings"
            aria-label="Settings"
            class="flex h-10 w-10 items-center justify-center rounded-full text-text-muted transition-all duration-150 hover:bg-bg-hover hover:text-text active:scale-95"
          >
            <img
              v-if="identity.loggedIn && identity.avatarUrl"
              :src="identity.avatarUrl"
              alt="Profile"
              class="h-7 w-7 rounded-full object-cover"
            />
            <div
              v-else-if="identity.loggedIn && identity.initials"
              class="h-7 w-7 rounded-full bg-bg-subtle text-text flex items-center justify-center text-[10px] font-semibold ring-1 ring-border"
            >
              {{ identity.initials }}
            </div>
            <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </router-link>
        </div>
      </header>

      <OfflineBanner v-if="!isOnline" />

      <main class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </template>
  </div>
</template>
