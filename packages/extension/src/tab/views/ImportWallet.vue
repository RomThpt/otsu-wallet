<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendMessage } from '../../lib/messaging'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import Card from '../../components/common/Card.vue'
import MnemonicInput from '../../components/wallet/MnemonicInput.vue'
import XummNumbersInput from '../../components/wallet/XummNumbersInput.vue'
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import type { WalletState } from '@otsu/types'

const router = useRouter()

type ImportFormat =
  'mnemonic' | 'secret_key' | 'family_seed' | 'private_key_hex' | 'xumm_secret_numbers'

const step = ref<'format' | 'input' | 'auth' | 'complete' | 'existing-wallet'>('format')
const format = ref<ImportFormat>('mnemonic')
const inputValue = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const hasExistingWallet = ref(false)

onMounted(async () => {
  const response = await sendMessage<boolean>({ type: 'HAS_WALLET' })
  if (response.success && response.data) {
    hasExistingWallet.value = true
    await checkExistingWalletUnlocked()
  }
})

async function checkExistingWalletUnlocked() {
  loading.value = true
  error.value = ''
  try {
    const response = await sendMessage<WalletState>({ type: 'GET_STATE' })
    step.value =
      response.success && response.data && !response.data.locked ? 'format' : 'existing-wallet'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

const formats = [
  { id: 'mnemonic' as const, name: 'Recovery Phrase', desc: '12 or 24 word mnemonic' },
  { id: 'secret_key' as const, name: 'Secret Key', desc: 'XRPL s-prefixed key' },
  { id: 'family_seed' as const, name: 'Family Seed', desc: 'Base58 encoded seed' },
  { id: 'private_key_hex' as const, name: 'Private Key (Hex)', desc: '64-char hex string' },
  { id: 'xumm_secret_numbers' as const, name: 'Xumm Secret Numbers', desc: '8 rows of 6 digits' },
]

const passwordValid = computed(
  () => password.value.length >= 8 && password.value === confirmPassword.value,
)

function selectFormat(f: ImportFormat) {
  format.value = f
  inputValue.value = ''
  error.value = ''
  step.value = 'input'
}

function proceedToAuth() {
  if (!inputValue.value.trim()) {
    error.value = 'Please enter your credentials'
    return
  }
  error.value = ''
  if (hasExistingWallet.value) void handleImport()
  else step.value = 'auth'
}

async function handleImport() {
  if (!hasExistingWallet.value && !passwordValid.value) return
  loading.value = true
  error.value = ''

  try {
    if (hasExistingWallet.value) {
      const importResponse = await sendMessage({
        type: format.value === 'mnemonic' ? 'IMPORT_SEED' : 'IMPORT_ACCOUNT',
        payload:
          format.value === 'mnemonic'
            ? { mnemonic: inputValue.value.trim() }
            : { format: format.value, value: inputValue.value.trim() },
      })
      if (!importResponse.success) {
        error.value = importResponse.error ?? 'Import failed'
        return
      }
      step.value = 'complete'
      return
    }

    // Create the wallet with password
    const createResponse = await sendMessage({
      type: 'CREATE_WALLET',
      payload: {
        mnemonic: format.value === 'mnemonic' ? inputValue.value.trim() : undefined,
        authMethod: 'password' as const,
        password: password.value,
      },
    })

    if (!createResponse.success) {
      error.value = createResponse.error ?? 'Wallet creation failed'
      return
    }

    if (format.value !== 'mnemonic') {
      // Import the specific account
      const importResponse = await sendMessage({
        type: 'IMPORT_ACCOUNT',
        payload: {
          format: format.value,
          value: inputValue.value.trim(),
        },
      })

      if (!importResponse.success) {
        error.value = importResponse.error ?? 'Import failed'
        return
      }
    }

    step.value = 'complete'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="w-full max-w-md space-y-6 p-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold">{{ hasExistingWallet ? 'Add Wallet' : 'Import Wallet' }}</h1>
        <p class="mt-2 text-text-muted">
          {{
            hasExistingWallet
              ? 'Add another account without replacing your wallet'
              : 'Restore an existing XRPL wallet'
          }}
        </p>
      </div>

      <!-- Existing wallet must be unlocked before its encrypted vault can change. -->
      <template v-if="step === 'existing-wallet'">
        <Card>
          <p class="font-medium text-sm">Unlock Otsu to add another wallet</p>
          <p class="text-xs text-text-muted mt-2">
            Open the extension popup and unlock your wallet, then return here. Your existing
            accounts and recovery phrases will remain unchanged.
          </p>
        </Card>

        <p v-if="error" class="text-xs text-danger">{{ error }}</p>

        <div class="flex gap-3">
          <Button variant="secondary" block @click="router.push('/')">Cancel</Button>
          <Button block :loading="loading" @click="checkExistingWalletUnlocked">Check again</Button>
        </div>
      </template>

      <!-- Step 1: Format Selection -->
      <template v-else-if="step === 'format'">
        <div class="space-y-3">
          <Card
            v-for="f in formats"
            :key="f.id"
            class="cursor-pointer hover:border-accent transition-colors"
            @click="selectFormat(f.id)"
          >
            <p class="font-medium text-sm">{{ f.name }}</p>
            <p class="text-xs text-text-muted mt-0.5">{{ f.desc }}</p>
          </Card>
        </div>
        <Button variant="secondary" block @click="router.push('/')">Back</Button>
      </template>

      <!-- Step 2: Input -->
      <template v-else-if="step === 'input'">
        <template v-if="format === 'mnemonic'">
          <MnemonicInput v-model="inputValue" />
        </template>
        <template v-else-if="format === 'xumm_secret_numbers'">
          <XummNumbersInput @update:value="inputValue = $event" />
        </template>
        <template v-else-if="format === 'secret_key' || format === 'family_seed'">
          <Input
            v-model="inputValue"
            label="Secret Key"
            placeholder="sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            type="password"
          />
        </template>
        <template v-else>
          <Input
            v-model="inputValue"
            label="Private Key (Hex)"
            placeholder="00AABBCCDD..."
            type="password"
          />
        </template>

        <p v-if="error" class="text-xs text-danger">{{ error }}</p>

        <div class="flex gap-3">
          <Button variant="secondary" block @click="step = 'format'">Back</Button>
          <Button :loading="loading" block @click="proceedToAuth">
            {{ hasExistingWallet ? 'Add Wallet' : 'Continue' }}
          </Button>
        </div>
      </template>

      <!-- Step 3: Password Setup -->
      <template v-else-if="step === 'auth'">
        <Input
          v-model="password"
          label="Set Password"
          type="password"
          placeholder="Minimum 8 characters"
          :error="password && password.length < 8 ? 'Minimum 8 characters' : ''"
        />
        <Input
          v-model="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="Repeat password"
          :error="confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''"
        />

        <p v-if="error" class="text-xs text-danger">{{ error }}</p>

        <div class="flex gap-3">
          <Button variant="secondary" block @click="step = 'input'">Back</Button>
          <Button block :disabled="!passwordValid" :loading="loading" @click="handleImport">
            Import Wallet
          </Button>
        </div>
      </template>

      <!-- Step 4: Complete -->
      <template v-else>
        <div class="animate-slide-up py-8 text-center" role="status" aria-live="polite">
          <SuccessAnimation kind="wallet" size="hero" />
          <h2 class="text-xl font-bold">Wallet Imported</h2>
          <p class="mt-2 text-text-muted">You can close this tab and use the extension popup.</p>
        </div>
      </template>
    </div>
  </div>
</template>
