<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import AccountTypeIcon from '../../components/wallet/AccountTypeIcon.vue'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const wallet = useWalletStore()
const loading = ref(false)
const editingAddress = ref<string | null>(null)
const editLabel = ref('')
const feedback = ref('')
const error = ref('')

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
    feedback.value = 'Label updated'
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
  feedback.value = ''
  error.value = ''
  try {
    await wallet.deriveMoreAccounts(1)
    feedback.value = 'Account derived'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function copyAddress(address: string, event: Event) {
  event.stopPropagation()
  error.value = ''
  try {
    await navigator.clipboard.writeText(address)
    feedback.value = 'Address copied'
  } catch {
    error.value = 'Could not copy address'
  }
}

function openImport() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('tab.html#/import'),
  })
}

function openHardwareWallet() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('tab.html#/hardware'),
  })
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
      <button class="p-1 rounded hover:bg-bg-hover transition-colors" @click="router.back()">
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

    <div class="flex-1 overflow-y-auto divide-y divide-border">
      <div
        v-for="account in wallet.accounts"
        :key="account.address"
        class="group flex items-center gap-2 px-4 py-2 hover:bg-bg-hover transition-colors cursor-pointer"
        :class="{
          'bg-bg-subtle': account.address === wallet.activeAccount,
        }"
        @click="handleSelect(account.address)"
      >
        <AccountTypeIcon :type="account.type" class="shrink-0" />

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <template v-if="editingAddress === account.address">
              <input
                v-model="editLabel"
                class="form-control h-8 w-full rounded-[10px] px-2 text-sm font-medium"
                @click.stop
                @keyup.enter="saveLabel(account.address)"
                @blur="saveLabel(account.address)"
              />
            </template>
            <template v-else>
              <span
                class="text-sm font-medium truncate cursor-default select-none"
                @dblclick.stop="startEdit(account.address, account.label)"
                >{{ account.label }}</span
              >
            </template>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-text-muted font-mono">{{ truncate(account.address) }}</span>
            <button
              class="text-text-muted hover:text-text shrink-0"
              @click.stop="copyAddress(account.address, $event)"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
          <p
            v-if="account.derivationPath"
            class="text-[10px] text-text-muted mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {{ account.derivationPath }}
          </p>
        </div>

        <div v-if="account.address === wallet.activeAccount" class="shrink-0">
          <span class="text-xs text-accent font-medium">Active</span>
        </div>
      </div>
    </div>

    <div class="p-4 space-y-2 border-t border-border">
      <p v-if="feedback" class="text-xs text-success" role="status">{{ feedback }}</p>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <Button block :loading="loading" @click="handleDerive"> Derive New Account </Button>
      <Button variant="secondary" block @click="openImport"> Import Account </Button>
      <Button variant="ghost" block @click="openHardwareWallet"> Connect Hardware Wallet </Button>
    </div>
  </div>
</template>
