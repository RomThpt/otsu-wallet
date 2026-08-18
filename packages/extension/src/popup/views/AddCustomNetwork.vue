<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import SettingsPageShell from '../../components/settings/SettingsPageShell.vue'
import SettingsSection from '../../components/settings/SettingsSection.vue'

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
      await router.replace('/settings/networks')
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
  <SettingsPageShell title="Add Network" back-to="/settings/networks" back-label="Back to Networks">
    <form class="space-y-6 pt-2" @submit.prevent="handleSave">
      <p class="px-1 text-sm leading-5 text-text-muted">
        Connect Otsu to an XRPL-compatible WebSocket endpoint you trust.
      </p>

      <SettingsSection title="Network Details">
        <div class="space-y-4 p-4">
          <Input
            v-model="name"
            label="Network name"
            autocomplete="off"
            placeholder="My Private Ledger"
          />
          <Input
            v-model="url"
            label="WebSocket URL"
            autocomplete="url"
            placeholder="wss://..."
            hint="Secure wss:// endpoints are recommended."
            :error="url && !isValidUrl ? 'Must start with wss:// or ws://' : ''"
          />
          <Input
            v-model="explorerUrl"
            type="url"
            label="Explorer URL (optional)"
            autocomplete="url"
            placeholder="https://..."
          />
          <Input
            v-model="faucetUrl"
            type="url"
            label="Faucet URL (optional)"
            autocomplete="url"
            placeholder="https://..."
          />
        </div>
      </SettingsSection>

      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <Button
            variant="secondary"
            :disabled="!isValidUrl"
            :loading="testing"
            @click="testConnection"
          >
            Test Connection
          </Button>
          <p
            v-if="testResult"
            class="text-xs font-semibold"
            :class="testResult === 'success' ? 'text-success' : 'text-danger'"
            :role="testResult === 'error' ? 'alert' : 'status'"
          >
            {{ testResult === 'success' ? 'Connection successful' : 'Connection failed' }}
          </p>
        </div>

        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <Button type="submit" variant="ink" block :disabled="!canSave" :loading="saving">
          Save Network
        </Button>
      </div>
    </form>
  </SettingsPageShell>
</template>
