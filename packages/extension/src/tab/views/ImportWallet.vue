<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { sendMessage } from '../../lib/messaging'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'
import MnemonicInput from '../../components/wallet/MnemonicInput.vue'
import XummNumbersInput from '../../components/wallet/XummNumbersInput.vue'
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import OnboardingShell from '../../components/onboarding/OnboardingShell.vue'
import type { WalletState } from '@otsu/types'
import { performPasskeyRegistration } from '@otsu/core'

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
const passkeySupported = ref(false)

onMounted(async () => {
  try {
    passkeySupported.value =
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    passkeySupported.value = false
  }
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
const selectedFormat = computed(() => formats.find((item) => item.id === format.value)!)
const stepNumber = computed(() => {
  if (step.value === 'format') return 1
  if (step.value === 'input') return 2
  if (step.value === 'auth') return 3
  return undefined
})
const stepTotal = computed(() => (hasExistingWallet.value ? 2 : 3))

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

async function handleImport(authMethod: 'password' | 'passkey' = 'password') {
  if (!hasExistingWallet.value && authMethod === 'password' && !passwordValid.value) return
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

    let credentialId: string | undefined
    let prfKey: string | undefined
    if (authMethod === 'passkey') {
      if (!passkeySupported.value) throw new Error('Passkeys are not supported on this device')
      const credential = await performPasskeyRegistration()
      credentialId = credential.credentialId
      prfKey = credential.prfKey
    }

    const createResponse = await sendMessage(
      format.value === 'mnemonic'
        ? {
            type: 'CREATE_WALLET',
            payload: {
              mnemonic: inputValue.value.trim(),
              authMethod,
              password: authMethod === 'password' ? password.value : undefined,
              credentialId,
              prfKey,
            },
          }
        : {
            type: 'CREATE_IMPORTED_WALLET',
            payload: {
              format: format.value,
              value: inputValue.value.trim(),
              authMethod,
              password: authMethod === 'password' ? password.value : undefined,
              credentialId,
              prfKey,
            },
          },
    )

    if (!createResponse.success) {
      error.value = createResponse.error ?? 'Wallet creation failed'
      return
    }

    step.value = 'complete'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

function goBack() {
  error.value = ''
  if (step.value === 'input') step.value = 'format'
  else if (step.value === 'auth') step.value = 'input'
  else router.push('/')
}

function goToWallet() {
  window.close()
}
</script>

<template>
  <OnboardingShell
    :step="stepNumber"
    :total="stepTotal"
    :show-back="step !== 'complete'"
    wide
    @back="goBack"
  >
    <div class="space-y-8">
      <template v-if="step === 'existing-wallet'">
        <div class="space-y-4 text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <svg viewBox="0 0 24 24" class="h-7 w-7" fill="none" aria-hidden="true">
              <path
                d="M8 11V7a4 4 0 118 0v4m-9 0h10a2 2 0 012 2v6H5v-6a2 2 0 012-2z"
                stroke="currentColor"
                stroke-width="1.7"
              />
            </svg>
          </div>
          <h1 class="text-3xl font-bold tracking-tight">Unlock Otsu</h1>
          <p class="mx-auto max-w-md text-zinc-600">
            Open the extension popup and unlock your wallet, then return here. Your existing
            accounts and recovery phrases stay unchanged.
          </p>
        </div>
        <p v-if="error" class="text-center text-sm text-red-600" role="alert">{{ error }}</p>
        <div class="flex gap-3">
          <Button variant="secondary" block @click="router.push('/')">Cancel</Button>
          <Button variant="ink" block :loading="loading" @click="checkExistingWalletUnlocked"
            >Check again</Button
          >
        </div>
      </template>

      <template v-else-if="step === 'format'">
        <div class="text-center">
          <h1 class="text-3xl font-bold tracking-tight">
            {{ hasExistingWallet ? 'Add Wallet' : 'Import Wallet' }}
          </h1>
          <p class="mt-2 text-base text-zinc-600">
            {{
              hasExistingWallet
                ? 'Choose the account you want to add.'
                : 'Choose how you would like to import your wallet.'
            }}
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <button
            v-for="f in formats"
            :key="f.id"
            type="button"
            data-testid="import-format"
            class="cursor-pointer flex min-h-20 items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-left transition hover:border-zinc-400 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
            @click="selectFormat(f.id)"
          >
            <span
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-700 shadow-sm"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" aria-hidden="true">
                <path
                  v-if="f.id === 'mnemonic'"
                  d="M5 7h14M5 12h9M5 17h12"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                />
                <path
                  v-else-if="f.id === 'xumm_secret_numbers'"
                  d="M7 5v14M12 5v14M17 5v14M5 8h14M5 16h14"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                />
                <path
                  v-else
                  d="M9.5 14.5l5-5m-1.5-2a3 3 0 114 4l-5.5 5.5H8v-3.5l1.5-1.5"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-semibold text-zinc-950">{{ f.name }}</span>
              <span class="mt-0.5 block text-sm text-zinc-500">{{ f.desc }}</span>
            </span>
            <svg
              viewBox="0 0 24 24"
              class="h-5 w-5 shrink-0 text-zinc-400"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M9 6l6 6-6 6"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>
      </template>

      <template v-else-if="step === 'input'">
        <div class="text-center">
          <h1 class="text-3xl font-bold tracking-tight">Enter {{ selectedFormat.name }}</h1>
          <p class="mt-2 text-base text-zinc-600">
            Your credentials are processed locally and stored encrypted.
          </p>
        </div>
        <div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
          <MnemonicInput v-if="format === 'mnemonic'" v-model="inputValue" />
          <XummNumbersInput
            v-else-if="format === 'xumm_secret_numbers'"
            @update:value="inputValue = $event"
          />
          <Input
            v-else-if="format === 'secret_key' || format === 'family_seed'"
            v-model="inputValue"
            label="Secret Key"
            placeholder="sXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            type="password"
          />
          <Input
            v-else
            v-model="inputValue"
            label="Private Key (Hex)"
            placeholder="00AABBCCDD..."
            type="password"
          />
        </div>
        <p v-if="error" class="text-center text-sm text-red-600" role="alert">{{ error }}</p>
        <div class="flex gap-3">
          <Button variant="secondary" block @click="goBack">Back</Button>
          <Button variant="ink" :loading="loading" block @click="proceedToAuth">
            {{ hasExistingWallet ? 'Add Wallet' : 'Continue' }}
          </Button>
        </div>
      </template>

      <template v-else-if="step === 'auth'">
        <div class="text-center">
          <h1 class="text-3xl font-bold tracking-tight">Protect Your Wallet</h1>
          <p class="mt-2 text-base text-zinc-600">Set the password you will use to unlock Otsu.</p>
        </div>
        <div class="space-y-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
          <Input
            v-model="password"
            label="Password"
            type="password"
            autocomplete="new-password"
            placeholder="Minimum 8 characters"
            :error="password && password.length < 8 ? 'Minimum 8 characters' : ''"
          />
          <Input
            v-model="confirmPassword"
            label="Confirm Password"
            type="password"
            autocomplete="new-password"
            placeholder="Repeat password"
            :error="confirmPassword && password !== confirmPassword ? 'Passwords do not match' : ''"
          />
        </div>
        <p v-if="error" class="text-center text-sm text-red-600" role="alert">{{ error }}</p>
        <div class="flex gap-3">
          <Button variant="secondary" block @click="goBack">Back</Button>
          <Button
            variant="ink"
            block
            :disabled="!passwordValid"
            :loading="loading"
            @click="handleImport()"
            >Import Wallet</Button
          >
        </div>
        <div class="flex items-center gap-4 text-sm text-zinc-500" aria-hidden="true">
          <span class="h-px flex-1 bg-zinc-200" />
          <span>or</span>
          <span class="h-px flex-1 bg-zinc-200" />
        </div>
        <Button
          variant="secondary"
          size="lg"
          block
          :disabled="!passkeySupported"
          :loading="loading"
          @click="handleImport('passkey')"
        >
          Continue with Passkey
        </Button>
      </template>

      <template v-else>
        <div class="animate-slide-up space-y-8 text-center">
          <div role="status" aria-live="polite">
            <SuccessAnimation kind="wallet" size="hero" />
            <h1 class="mt-5 text-4xl font-bold tracking-tight">Wallet Imported</h1>
            <p class="mt-2 text-zinc-600">Your wallet is ready to use.</p>
          </div>
          <Button variant="ink" size="lg" block @click="goToWallet">Go to Wallet</Button>
        </div>
      </template>
    </div>
  </OnboardingShell>
</template>
