<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import { networkIndicatorClass } from '../../lib/network-appearance'
import Button from '../../components/common/Button.vue'
import SettingsPageShell from '../../components/settings/SettingsPageShell.vue'
import SettingsSection from '../../components/settings/SettingsSection.vue'

const router = useRouter()
const wallet = useWalletStore()
const pendingNetworkId = ref<string | null>(null)
const removingNetworkId = ref<string | null>(null)
const error = ref('')

onMounted(async () => {
  await wallet.fetchNetworks()
})

async function handleSwitch(networkId: string) {
  if (pendingNetworkId.value) return
  pendingNetworkId.value = networkId
  error.value = ''
  try {
    await wallet.switchNetwork(networkId)
    await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice()])
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    pendingNetworkId.value = null
  }
}

async function handleRemove(networkId: string, networkName: string) {
  if (!confirm(`Remove ${networkName}?`)) return
  removingNetworkId.value = networkId
  error.value = ''
  try {
    const removed = await wallet.removeCustomNetwork(networkId)
    if (!removed) error.value = `Could not remove ${networkName}`
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    removingNetworkId.value = null
  }
}
</script>

<template>
  <SettingsPageShell title="Networks" back-to="/settings" back-label="Back to Settings">
    <template #action>
      <Button variant="ink" @click="router.push('/settings/networks/add')">Add</Button>
    </template>

    <div class="space-y-6 pt-2">
      <p class="px-1 text-sm leading-5 text-text-muted">
        Choose the network Otsu uses for balances, activity, and transactions.
      </p>

      <SettingsSection title="Built-in Networks">
        <button
          v-for="config in Object.values(wallet.predefinedNetworks)"
          :key="config.id"
          type="button"
          class="flex min-h-[68px] w-full items-center gap-3 px-4 py-3 transition hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-inset focus:ring-text"
          :aria-pressed="config.id === wallet.network"
          :disabled="pendingNetworkId !== null"
          @click="handleSwitch(config.id)"
        >
          <span
            class="h-3 w-3 shrink-0 rounded-full ring-4 ring-bg-hover"
            :class="networkIndicatorClass(config)"
          />
          <div class="min-w-0 flex-1 text-left">
            <p class="text-sm font-semibold text-text">{{ config.name }}</p>
            <p class="mt-0.5 truncate text-xs text-text-muted">{{ config.url }}</p>
          </div>
          <svg
            v-if="config.id === wallet.network"
            class="h-5 w-5 shrink-0 text-text"
            fill="none"
            viewBox="0 0 24 24"
            aria-label="Selected"
          >
            <path
              d="M6 12.5l4 4L18 8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </SettingsSection>

      <SettingsSection v-if="wallet.customNetworks.length > 0" title="Custom Networks">
        <div
          v-for="config in wallet.customNetworks"
          :key="config.id"
          class="flex min-h-[68px] items-center gap-2 px-3 py-2"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-text"
            :aria-pressed="config.id === wallet.network"
            :disabled="pendingNetworkId !== null || removingNetworkId === config.id"
            @click="handleSwitch(config.id)"
          >
            <span
              class="h-3 w-3 shrink-0 rounded-full ring-4 ring-bg-hover"
              :class="networkIndicatorClass(config)"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-text">{{ config.name }}</p>
              <p class="mt-0.5 truncate text-xs text-text-muted">{{ config.url }}</p>
            </div>
            <svg
              v-if="config.id === wallet.network"
              class="h-5 w-5 shrink-0 text-text"
              fill="none"
              viewBox="0 0 24 24"
              aria-label="Selected"
            >
              <path
                d="M6 12.5l4 4L18 8"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-muted transition hover:bg-danger/10 hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
            :aria-label="`Remove ${config.name}`"
            :disabled="removingNetworkId !== null || pendingNetworkId !== null"
            @click="handleRemove(config.id, config.name)"
          >
            <svg
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M8 8l8 8m0-8-8 8"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </SettingsSection>
      <p v-if="pendingNetworkId" class="text-center text-xs text-text-muted" role="status">
        Switching network…
      </p>
      <p v-if="error" class="text-center text-xs text-danger" role="alert">{{ error }}</p>
    </div>
  </SettingsPageShell>
</template>
