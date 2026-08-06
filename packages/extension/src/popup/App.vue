<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useWalletStore } from '../stores/wallet'
import { useIdentityStore } from '../stores/identity'
import Unlock from './views/Unlock.vue'
import AccountSelector from '../components/wallet/AccountSelector.vue'
import NetworkSelector from '../components/wallet/NetworkSelector.vue'
import OfflineBanner from '../components/common/OfflineBanner.vue'
import ToastContainer from '../components/common/ToastContainer.vue'
import IconHome from '../components/common/icons/IconHome.vue'
import IconArrowUp from '../components/common/icons/IconArrowUp.vue'
import IconArrowDown from '../components/common/icons/IconArrowDown.vue'
import IconClock from '../components/common/icons/IconClock.vue'
import IconCompass from '../components/common/icons/IconCompass.vue'
import { useOnlineStatus } from '../composables/useOnlineStatus'
import { useRouter } from 'vue-router'

useTheme()
const router = useRouter()
const wallet = useWalletStore()
const identity = useIdentityStore()
const { isOnline } = useOnlineStatus()
const initialized = ref(false)

const navItems = [
  { to: '/', label: 'Home', exact: true, icon: IconHome },
  { to: '/send', label: 'Send', exact: true, icon: IconArrowUp },
  { to: '/receive', label: 'Receive', exact: true, icon: IconArrowDown },
  { to: '/history', label: 'History', exact: true, icon: IconClock },
  { to: '/explore', label: 'Explore', exact: false, icon: IconCompass },
] as const

onMounted(async () => {
  try {
    await wallet.fetchState()
    await Promise.all([wallet.fetchNetworks(), identity.fetchState()])
  } catch (error) {
    console.error('Failed to fetch wallet state:', error)
  } finally {
    initialized.value = true
  }
})

async function handleSelectAccount(address: string) {
  await wallet.setActiveAccount(address)
  await wallet.fetchBalance()
}

async function handleDeriveMore() {
  await wallet.deriveMoreAccounts(25)
}

async function handleSwitchNetwork(networkId: string) {
  await wallet.switchNetwork(networkId)
  await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice()])
}

function isActive(item: (typeof navItems)[number]): boolean {
  const path = router.currentRoute.value.path
  return item.exact ? path === item.to : path.startsWith(item.to)
}
</script>

<template>
  <div class="w-[360px] h-[600px] bg-bg text-text flex flex-col overflow-hidden">
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
      <header class="flex items-center justify-between px-4 h-11 border-b border-border">
        <AccountSelector
          :accounts="wallet.accounts"
          :active-account="wallet.activeAccount"
          :loading="wallet.loading"
          :chain-type="wallet.currentChainType"
          @select="handleSelectAccount"
          @add-account="$router.push('/accounts')"
          @load-more="handleDeriveMore"
        />
        <div class="flex items-center gap-1">
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
            class="p-1.5 rounded hover:bg-bg-hover transition-colors"
          >
            <img
              v-if="identity.loggedIn && identity.avatarUrl"
              :src="identity.avatarUrl"
              alt="Profile"
              class="h-5 w-5 rounded-full object-cover"
            />
            <div
              v-else-if="identity.loggedIn && identity.initials"
              class="h-5 w-5 rounded-full bg-bg-subtle text-text flex items-center justify-center text-[9px] font-medium"
            >
              {{ identity.initials }}
            </div>
            <svg
              v-else
              class="h-5 w-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

      <ToastContainer />
      <OfflineBanner v-if="!isOnline" />

      <main class="flex-1 overflow-y-auto p-3">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <nav class="grid grid-cols-5 border-t border-border">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] transition-colors rounded-full mx-0.5"
          :class="isActive(item) ? 'bg-accent/10 text-accent' : 'text-text-muted hover:text-text'"
        >
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </template>
  </div>
</template>
