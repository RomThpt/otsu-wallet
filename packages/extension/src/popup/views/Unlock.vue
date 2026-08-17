<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import browser from 'webextension-polyfill'
import { useWalletStore } from '../../stores/wallet'
import OtsuMark from '../../components/brand/OtsuMark.vue'
import UnlockLandscape from '../../components/brand/UnlockLandscape.vue'

const wallet = useWalletStore()
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const lockoutSeconds = ref(0)
let lockoutTimer: ReturnType<typeof setInterval> | undefined
const failedAttempts = ref(0)
const MAX_ATTEMPTS = 5
const BASE_LOCKOUT_S = 30
const passkeySupported = ref(false)

const showResetConfirm = ref(false)
const resetConfirmText = ref('')
const resetError = ref('')
const resetInput = ref<HTMLInputElement | null>(null)
const RESET_CONFIRM_PHRASE = 'RESET'

onMounted(async () => {
  try {
    passkeySupported.value =
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
  } catch {
    passkeySupported.value = false
  }
})

function startLockoutCountdown(seconds: number) {
  lockoutSeconds.value = seconds
  lockoutTimer = setInterval(() => {
    lockoutSeconds.value--
    if (lockoutSeconds.value <= 0) {
      clearInterval(lockoutTimer)
      lockoutTimer = undefined
    }
  }, 1000)
}

function handleFailedAttempt() {
  failedAttempts.value++
  if (failedAttempts.value >= MAX_ATTEMPTS) {
    const lockoutDuration = BASE_LOCKOUT_S * Math.pow(2, failedAttempts.value - MAX_ATTEMPTS)
    startLockoutCountdown(lockoutDuration)
    error.value = ''
  }
}

async function handleUnlock() {
  if (lockoutSeconds.value > 0) return
  if (!password.value) {
    error.value = 'Enter your password'
    return
  }

  error.value = ''
  try {
    const success = await wallet.unlock('password', password.value)
    if (success) {
      failedAttempts.value = 0
    } else {
      error.value = 'Invalid password'
      handleFailedAttempt()
    }
  } catch {
    error.value = 'Unable to unlock your wallet'
  }
}

async function handlePasskeyUnlock() {
  if (lockoutSeconds.value > 0) return

  error.value = ''
  try {
    const success = await wallet.unlock('passkey')
    if (success) {
      failedAttempts.value = 0
    } else {
      error.value = 'Passkey authentication failed'
      handleFailedAttempt()
    }
  } catch (passkeyError) {
    error.value = (passkeyError as Error).message
    handleFailedAttempt()
  }
}

async function openResetConfirm() {
  error.value = ''
  resetError.value = ''
  showResetConfirm.value = true
  await nextTick()
  resetInput.value?.focus()
}

async function handleReset() {
  if (resetConfirmText.value !== RESET_CONFIRM_PHRASE) return
  resetError.value = ''
  try {
    const success = await wallet.resetWallet()
    if (!success) {
      resetError.value = 'Unable to reset the wallet'
      return
    }
    await browser.tabs.create({ url: browser.runtime.getURL('tab.html') })
    window.close()
  } catch {
    resetError.value = 'Unable to reset the wallet'
  }
}

function cancelReset() {
  showResetConfirm.value = false
  resetConfirmText.value = ''
  resetError.value = ''
}

onUnmounted(() => {
  if (lockoutTimer) clearInterval(lockoutTimer)
})
</script>

<template>
  <main
    data-testid="unlock-screen"
    class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-6 text-zinc-950"
  >
    <UnlockLandscape
      class="pointer-events-none absolute inset-x-0 bottom-0 h-[116px] w-full text-zinc-400"
    />

    <div class="relative z-10 flex min-h-0 flex-1 flex-col">
      <header class="text-center" :class="showResetConfirm ? 'pt-10' : 'pt-[66px]'">
        <OtsuMark class="mx-auto h-[62px] w-[62px] text-zinc-950" />
        <h1 class="mt-1 text-[30px] font-medium leading-none tracking-[-0.04em]">Otsu</h1>
        <p class="mt-2 text-sm text-zinc-500">
          {{ showResetConfirm ? 'Protect your recovery phrase' : 'Unlock your wallet' }}
        </p>
      </header>

      <template v-if="!showResetConfirm">
        <section class="mt-7" aria-labelledby="unlock-heading">
          <h2 id="unlock-heading" class="sr-only">Unlock Otsu</h2>

          <form class="space-y-3" novalidate @submit.prevent="handleUnlock">
            <div
              class="flex h-12 items-center rounded-[18px] border bg-white px-3.5 shadow-sm transition duration-150 focus-within:ring-4"
              :class="
                error
                  ? 'border-red-500 focus-within:border-red-500 focus-within:ring-red-500/10'
                  : 'border-zinc-200 hover:border-zinc-400 focus-within:border-zinc-950 focus-within:ring-zinc-950/10'
              "
            >
              <svg
                class="h-5 w-5 shrink-0 text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <rect x="5.5" y="10" width="13" height="10" rx="2.5" stroke-width="1.7" />
                <path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" stroke-width="1.7" />
                <path d="M12 14v2.5" stroke-width="1.7" stroke-linecap="round" />
              </svg>
              <label for="unlock-password" class="sr-only">Password</label>
              <input
                id="unlock-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                spellcheck="false"
                placeholder="Enter password"
                :disabled="wallet.loading || lockoutSeconds > 0"
                class="min-w-0 flex-1 bg-transparent px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed"
                @input="error = ''"
              />
              <button
                type="button"
                class="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-950/30"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="showPassword"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="!showPassword"
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z"
                    stroke-width="1.7"
                    stroke-linejoin="round"
                  />
                  <circle cx="12" cy="12" r="2.5" stroke-width="1.7" />
                </svg>
                <svg
                  v-else
                  class="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path d="M3 3l18 18" stroke-width="1.7" stroke-linecap="round" />
                  <path
                    d="M10.7 6.6c.4-.1.8-.1 1.3-.1 6 0 9.5 5.5 9.5 5.5a17 17 0 0 1-2.7 3.2M6.2 7.8A17.6 17.6 0 0 0 2.5 12s3.5 5.5 9.5 5.5c1 0 2-.2 2.8-.4"
                    stroke-width="1.7"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>

            <button
              type="submit"
              class="relative flex h-12 w-full items-center justify-center rounded-[18px] bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-black active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="wallet.loading || lockoutSeconds > 0"
            >
              <svg
                v-if="wallet.loading"
                class="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  stroke-width="2"
                  opacity="0.3"
                />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              <span>Unlock</span>
              <svg
                v-if="!wallet.loading"
                class="absolute right-4 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M5 12h13M13 6l6 6-6 6"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </form>

          <div class="min-h-5 pt-1 text-center">
            <p v-if="error" role="alert" aria-live="assertive" class="text-xs text-red-600">
              {{ error }}
            </p>
            <p v-else-if="lockoutSeconds > 0" role="status" class="text-xs text-red-600">
              Too many attempts. Try again in {{ lockoutSeconds }}s
            </p>
          </div>

          <template v-if="passkeySupported">
            <div class="my-2 flex items-center gap-3" aria-hidden="true">
              <div class="h-px flex-1 bg-zinc-200" />
              <span class="text-xs text-zinc-500">or</span>
              <div class="h-px flex-1 bg-zinc-200" />
            </div>

            <button
              type="button"
              class="relative flex h-12 w-full items-center justify-center rounded-[18px] border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm transition-all duration-150 hover:bg-zinc-50 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-zinc-950/30 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="wallet.loading || lockoutSeconds > 0"
              @click="handlePasskeyUnlock"
            >
              <svg
                class="mr-2.5 h-5 w-5 text-zinc-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M9 4H7a3 3 0 0 0-3 3v2M15 4h2a3 3 0 0 1 3 3v2M9 20H7a3 3 0 0 1-3-3v-2M15 20h2a3 3 0 0 0 3-3v-2"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
                <circle cx="12" cy="10" r="2.2" stroke-width="1.6" />
                <path
                  d="M8.5 17c.5-2 1.7-3 3.5-3s3 1 3.5 3"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
              Unlock with Passkey
              <svg
                class="absolute right-4 h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  d="M5 12h13M13 6l6 6-6 6"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </template>

          <button
            type="button"
            class="mx-auto mt-5 block rounded-md text-xs text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-950 hover:underline focus:text-zinc-950 focus:underline focus:outline-none focus:ring-2 focus:ring-zinc-950/30"
            @click="openResetConfirm"
          >
            Forgot password? <span aria-hidden="true">•</span> Reset wallet
          </button>
        </section>
      </template>

      <section v-else role="alertdialog" aria-labelledby="reset-title" class="mt-7">
        <div class="rounded-[18px] border border-red-200 bg-red-50 p-4">
          <h2 id="reset-title" class="text-sm font-semibold text-red-600">Reset this wallet?</h2>
          <p class="mt-2 text-xs leading-5 text-zinc-600">
            This permanently deletes every account stored in Otsu. You can only restore them with
            their recovery phrases.
          </p>
        </div>

        <label for="reset-confirmation" class="mt-4 block text-xs text-zinc-500">
          Type <span class="font-mono font-bold text-zinc-950">{{ RESET_CONFIRM_PHRASE }}</span> to
          confirm
        </label>
        <input
          id="reset-confirmation"
          ref="resetInput"
          v-model="resetConfirmText"
          type="text"
          autocomplete="off"
          spellcheck="false"
          placeholder="Type RESET to confirm"
          class="mt-2 h-12 w-full rounded-[18px] border border-zinc-200 bg-white px-4 text-sm text-zinc-950 shadow-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
        />

        <p v-if="resetError" role="alert" class="mt-2 text-center text-xs text-red-600">
          {{ resetError }}
        </p>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            class="h-11 rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-950/30"
            @click="cancelReset"
          >
            Cancel
          </button>
          <button
            type="button"
            class="h-11 rounded-full bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="resetConfirmText !== RESET_CONFIRM_PHRASE"
            @click="handleReset"
          >
            Reset wallet
          </button>
        </div>
      </section>

      <footer
        class="mt-auto flex items-center justify-center gap-1.5 pb-4 pt-3 text-[11px] text-zinc-500"
      >
        <svg
          class="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <rect x="5.5" y="10" width="13" height="10" rx="2.5" stroke-width="1.7" />
          <path d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" stroke-width="1.7" />
        </svg>
        <span>Otsu is non-custodial. You own your keys.</span>
      </footer>
    </div>
  </main>
</template>
