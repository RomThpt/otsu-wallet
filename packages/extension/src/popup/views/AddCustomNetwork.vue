<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'

const router = useRouter()
const wallet = useWalletStore()

const name = ref('')
const url = ref('')
const explorerUrl = ref('')
const faucetUrl = ref('')
const testing = ref(false)
const testResult = ref<'success' | 'error' | null>(null)
const saving = ref(false)
const error = ref('')

const isValidUrl = computed(() => /^wss?:\/\/.+/.test(url.value))

const canSave = computed(() => name.value.trim().length > 0 && isValidUrl.value)

async function testConnection() {
  testing.value = true
  testResult.value = null
  error.value = ''

  try {
    const ws = new WebSocket(url.value)
    const result = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        ws.close()
        resolve(false)
      }, 5000)

      ws.onopen = () => {
        clearTimeout(timeout)
        ws.close()
        resolve(true)
      }

      ws.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
    })

    testResult.value = result ? 'success' : 'error'
  } catch {
    testResult.value = 'error'
  } finally {
    testing.value = false
  }
}

async function handleSave() {
  if (!canSave.value) return
  saving.value = true
  error.value = ''

  try {
    const ok = await wallet.addCustomNetwork({
      name: name.value.trim(),
      url: url.value.trim(),
      explorer: explorerUrl.value.trim() || undefined,
      faucet: faucetUrl.value.trim() || undefined,
    })

    if (ok) {
      router.back()
    } else {
      error.value = 'Failed to add network'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
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
      <h2 class="text-sm font-bold">Add Custom Network</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <Input v-model="name" label="Network Name" placeholder="e.g. My Private Ledger" />

      <div>
        <Input
          v-model="url"
          label="RPC URL"
          placeholder="wss://..."
          :error="url && !isValidUrl ? 'Must start with wss:// or ws://' : ''"
        />
      </div>

      <Input v-model="explorerUrl" label="Explorer URL (optional)" placeholder="https://..." />

      <Input v-model="faucetUrl" label="Faucet URL (optional)" placeholder="https://..." />

      <div class="flex items-center gap-2">
        <Button
          variant="secondary"
          :disabled="!isValidUrl"
          :loading="testing"
          @click="testConnection"
        >
          Test Connection
        </Button>
        <span v-if="testResult === 'success'" class="text-xs text-success"> Connected </span>
        <span v-else-if="testResult === 'error'" class="text-xs text-danger"> Failed </span>
      </div>

      <p v-if="error" class="form-error" role="alert">{{ error }}</p>

      <Button block :disabled="!canSave" :loading="saving" @click="handleSave">
        Save Network
      </Button>
    </div>
  </div>
</template>
