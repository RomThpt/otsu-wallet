<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import AccountTypeIcon from '../../components/wallet/AccountTypeIcon.vue'
import Button from '../../components/common/Button.vue'
import { useToast } from '../../composables/useToast'

const router = useRouter()
const wallet = useWalletStore()
const toast = useToast()
const loading = ref(false)
const editingAddress = ref<string | null>(null)
const editLabel = ref('')

function truncate(addr: string): string {
  if (!addr) return ''
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

function startEdit(address: string, currentLabel: string) {
  editingAddress.value = address
  editLabel.value = currentLabel
}

async function saveLabel(address: string) {
  if (editLabel.value.trim()) {
    await wallet.updateAccountLabel(address, editLabel.value.trim())
    toast.success('Label updated')
  }
  editingAddress.value = null
}

async function handleSelect(address: string) {
  if (editingAddress.value) return
  await wallet.setActiveAccount(address)
  await wallet.fetchBalance()
  router.push('/')
}

async function handleDerive() {
  loading.value = true
  try {
    await wallet.deriveMoreAccounts(1)
    toast.success('Account derived')
  } catch (e) {
    toast.error((e as Error).message)
  } finally {
    loading.value = false
  }
}

function copyAddress(address: string, event: Event) {
  event.stopPropagation()
  navigator.clipboard.writeText(address)
  toast.success('Address copied')
}

function openImport() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('tab.html#/import'),
  })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="router.back()"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h2 class="text-sm font-bold">Accounts</h2>
    </div>

    <div class="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
      <div
        v-for="account in wallet.accounts"
        :key="account.address"
        class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
        :class="{
          'bg-primary-50 dark:bg-primary-900/10': account.address === wallet.activeAccount,
        }"
        @click="handleSelect(account.address)"
      >
        <AccountTypeIcon :type="account.type" class="shrink-0" />

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <template v-if="editingAddress === account.address">
              <input
                v-model="editLabel"
                class="text-sm font-medium bg-transparent border-b border-primary-500 focus:outline-none w-full"
                @click.stop
                @keyup.enter="saveLabel(account.address)"
                @blur="saveLabel(account.address)"
              />
            </template>
            <template v-else>
              <span class="text-sm font-medium truncate">{{ account.label }}</span>
              <button
                class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                @click.stop="startEdit(account.address, account.label)"
              >
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
            </template>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-gray-500 font-mono">{{ truncate(account.address) }}</span>
            <button
              class="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              @click.stop="copyAddress(account.address, $event)"
            >
              Copy
            </button>
          </div>
          <p v-if="account.derivationPath" class="text-[10px] text-gray-400 mt-0.5">
            {{ account.derivationPath }}
          </p>
        </div>

        <div v-if="account.address === wallet.activeAccount" class="shrink-0">
          <span class="text-xs text-primary-600 dark:text-primary-400 font-medium">Active</span>
        </div>
      </div>
    </div>

    <div class="p-4 space-y-2 border-t border-gray-200 dark:border-gray-700">
      <Button block :loading="loading" @click="handleDerive"> Derive New Account </Button>
      <Button variant="secondary" block @click="openImport"> Import Account </Button>
    </div>
  </div>
</template>
