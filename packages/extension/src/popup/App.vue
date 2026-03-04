<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useWalletStore } from '../stores/wallet'
import Unlock from './views/Unlock.vue'
import AccountSelector from '../components/wallet/AccountSelector.vue'
import NetworkBadge from '../components/wallet/NetworkBadge.vue'
import OfflineBanner from '../components/common/OfflineBanner.vue'
import { useOnlineStatus } from '../composables/useOnlineStatus'

useTheme()
const wallet = useWalletStore()
const { isOnline } = useOnlineStatus()
const initialized = ref(false)

onMounted(async () => {
  await wallet.fetchState()
  initialized.value = true
})

async function handleSelectAccount(address: string) {
  await wallet.setActiveAccount(address)
  await wallet.fetchBalance()
}

async function handleDeriveMore() {
  await wallet.deriveMoreAccounts(25)
}
</script>

<template>
  <div class="w-[360px] h-[600px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col overflow-hidden">
    <template v-if="!initialized">
      <div class="flex-1 flex items-center justify-center">
        <div class="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
      </div>
    </template>

    <template v-else-if="wallet.locked">
      <Unlock />
    </template>

    <template v-else>
      <header class="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold">Otsu</span>
          <NetworkBadge :network="wallet.network" />
          <router-link to="/settings" class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <svg class="h-4 w-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </router-link>
        </div>
        <AccountSelector
          :accounts="wallet.accounts"
          :active-account="wallet.activeAccount"
          :loading="wallet.loading"
          @select="handleSelectAccount"
          @add-account="$router.push('/tokens')"
          @load-more="handleDeriveMore"
        />
      </header>

      <OfflineBanner v-if="!isOnline" />

      <main class="flex-1 overflow-y-auto">
        <router-view />
      </main>

      <nav class="flex border-t border-gray-200 dark:border-gray-700">
        <router-link
          v-for="item in [
            { to: '/', label: 'Dashboard' },
            { to: '/send', label: 'Send' },
            { to: '/receive', label: 'Receive' },
            { to: '/history', label: 'History' },
            { to: '/tokens', label: 'Tokens' },
          ]"
          :key="item.to"
          :to="item.to"
          class="flex-1 py-3 text-center text-xs font-medium transition-colors"
          active-class="text-primary-600 dark:text-primary-400"
          exact-active-class="text-primary-600 dark:text-primary-400"
        >
          {{ item.label }}
        </router-link>
      </nav>
    </template>
  </div>
</template>
