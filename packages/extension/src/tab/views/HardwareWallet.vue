<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { HardwareAccountCandidate, WalletState } from '@otsu/types'
import Button from '../../components/common/Button.vue'
import SuccessAnimation from '../../components/common/SuccessAnimation.vue'
import { sendMessage } from '../../lib/messaging'

const ledgerSupported = __LEDGER_SUPPORTED__
const accountIndex = ref(0)
const candidates = ref<HardwareAccountCandidate[]>([])
const selected = ref(new Set<string>())
const loadingProvider = ref<'ledger' | 'trezor' | null>(null)
const saving = ref(false)
const locked = ref(false)
const error = ref('')
const complete = ref(false)
const ledgerMenuOpen = ref(false)

const selectedCandidates = computed(() =>
  candidates.value.filter((candidate) => selected.value.has(candidateKey(candidate))),
)

function candidateKey(candidate: HardwareAccountCandidate): string {
  return `${candidate.provider}:${candidate.chainType}:${candidate.address.toLowerCase()}`
}

function shortAddress(address: string): string {
  return `${address.slice(0, 10)}…${address.slice(-8)}`
}

function toggleCandidate(candidate: HardwareAccountCandidate) {
  const next = new Set(selected.value)
  const key = candidateKey(candidate)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selected.value = next
}

function closeWindow() {
  window.close()
}

async function connectTrezor() {
  loadingProvider.value = 'trezor'
  error.value = ''
  try {
    const { discoverTrezorAccounts } = await import('../../lib/trezor')
    const accounts = await discoverTrezorAccounts(accountIndex.value)
    candidates.value = accounts
    selected.value = new Set(accounts.map(candidateKey))
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loadingProvider.value = null
  }
}

async function connectLedgerXrpl() {
  loadingProvider.value = 'ledger'
  error.value = ''
  try {
    if (!__LEDGER_SUPPORTED__) {
      throw new Error('Ledger WebHID is available in the Chromium extension')
    }
    const { discoverLedgerXrplAccount } = await import('@ledger')
    const account = await discoverLedgerXrplAccount(accountIndex.value)
    candidates.value = [account]
    selected.value = new Set([candidateKey(account)])
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loadingProvider.value = null
  }
}

async function connectLedgerEvm() {
  loadingProvider.value = 'ledger'
  error.value = ''
  try {
    if (!__LEDGER_SUPPORTED__) {
      throw new Error('Ledger WebHID is available in the Chromium extension')
    }
    const { discoverLedgerEvmAccount } = await import('@ledger')
    const account = await discoverLedgerEvmAccount(accountIndex.value)
    candidates.value = [account]
    selected.value = new Set([candidateKey(account)])
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    loadingProvider.value = null
  }
}

async function addAccounts() {
  if (selectedCandidates.value.length === 0) return
  saving.value = true
  error.value = ''
  try {
    const response = await sendMessage({
      type: 'ADD_HARDWARE_ACCOUNTS',
      payload: { accounts: selectedCandidates.value },
    })
    if (!response.success) throw new Error(response.error || 'Could not add hardware accounts')
    complete.value = true
  } catch (cause) {
    error.value = (cause as Error).message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const response = await sendMessage<WalletState>({ type: 'GET_STATE' })
  locked.value = !response.success || response.data?.locked !== false
})
</script>

<template>
  <main class="mx-auto flex min-h-screen w-full max-w-xl items-center px-6 py-10">
    <section class="w-full rounded-[28px] border border-border bg-bg-subtle p-6 shadow-card sm:p-8">
      <template v-if="complete">
        <div class="space-y-5 text-center" role="status" aria-live="polite">
          <SuccessAnimation kind="wallet" />
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Hardware wallet added</h1>
            <p class="mt-2 text-sm text-text-muted">
              The private keys remain on your device. You can close this tab and use the account.
            </p>
          </div>
          <Button size="lg" block @click="closeWindow">Done</Button>
        </div>
      </template>

      <template v-else-if="locked">
        <div class="space-y-5 text-center">
          <h1 class="text-2xl font-semibold tracking-tight">Unlock Otsu first</h1>
          <p class="text-sm text-text-muted">
            Hardware accounts are stored in your encrypted vault. Unlock the extension, then reopen
            this page.
          </p>
          <Button size="lg" block @click="closeWindow">Open wallet</Button>
        </div>
      </template>

      <template v-else>
        <header>
          <p class="text-sm font-medium text-accent">Hardware wallet</p>
          <h1 class="mt-1 text-3xl font-semibold tracking-tight">Connect a device</h1>
          <p class="mt-3 text-sm leading-6 text-text-muted">
            Verify every address on the hardware screen. Otsu stores only the public account and
            derivation path—never the recovery phrase or private key.
          </p>
        </header>

        <div class="mt-7">
          <label for="hardware-index" class="form-label">Account index</label>
          <input
            id="hardware-index"
            v-model.number="accountIndex"
            class="form-control mt-2"
            type="number"
            min="0"
            max="99"
            inputmode="numeric"
          />
        </div>

        <div class="mt-6 space-y-3">
          <button
            data-testid="connect-trezor"
            class="flex w-full items-center gap-4 rounded-2xl border border-border bg-bg p-4 text-left transition hover:border-accent/50 hover:bg-bg-hover disabled:opacity-50"
            :disabled="loadingProvider !== null"
            @click="connectTrezor"
          >
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black"
              aria-hidden="true"
            >
              <svg data-testid="trezor-logo" class="h-7 w-7" viewBox="0 0 32 32" fill="none">
                <path
                  d="M10.5 13V9.75a5.5 5.5 0 0 1 11 0V13M8 13h16v13H8V13Z"
                  stroke="currentColor"
                  stroke-width="2.4"
                  stroke-linejoin="round"
                />
                <path
                  d="M16 18v3"
                  stroke="currentColor"
                  stroke-width="2.4"
                  stroke-linecap="round"
                />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-base font-semibold">Trezor</span>
              <span class="mt-0.5 block text-xs leading-5 text-text-muted">
                XRP and EVM accounts
              </span>
              <span v-if="loadingProvider === 'trezor'" class="mt-1 block text-xs text-accent">
                Check your Trezor…
              </span>
            </span>
            <svg class="h-5 w-5 text-text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="m7 4 6 6-6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            v-if="ledgerSupported"
            data-testid="connect-ledger"
            class="flex w-full items-center gap-4 rounded-2xl border border-border bg-bg p-4 text-left transition hover:border-accent/50 hover:bg-bg-hover disabled:opacity-50"
            :disabled="loadingProvider !== null"
            :aria-expanded="ledgerMenuOpen"
            @click="ledgerMenuOpen = !ledgerMenuOpen"
          >
            <span
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black text-white dark:bg-white dark:text-black"
              aria-hidden="true"
            >
              <svg data-testid="ledger-logo" class="h-7 w-7" viewBox="0 0 28 28" fill="none">
                <path
                  fill="currentColor"
                  fill-rule="evenodd"
                  d="M11.65 4.4H4.4V9h1.1V5.5l6.15-.04V4.4Zm.05 5.95v7.25h4.6v-1.1h-3.5l-.04-6.15H11.7ZM4.4 23.6h7.25v-1.06L5.5 22.5V19H4.4v4.6ZM16.35 4.4h7.25V9h-1.1V5.5l-6.15-.04V4.4Zm7.25 19.2h-7.25v-1.06l6.15-.04V19h1.1v4.6Z"
                  clip-rule="evenodd"
                />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="text-base font-semibold">Ledger</span>
              <span class="mt-0.5 block text-xs leading-5 text-text-muted">
                XRP and EVM accounts · WebHID
              </span>
            </span>
            <svg
              class="h-5 w-5 text-text-muted transition-transform"
              :class="ledgerMenuOpen ? 'rotate-90' : ''"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m7 4 6 6-6 6"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div
            v-if="ledgerSupported && ledgerMenuOpen"
            data-testid="ledger-chain-options"
            class="grid gap-2 rounded-2xl border border-border bg-bg-subtle p-2 sm:grid-cols-2"
          >
            <button
              class="rounded-xl bg-bg px-4 py-3 text-left transition hover:bg-bg-hover disabled:opacity-50"
              :disabled="loadingProvider !== null"
              @click="connectLedgerXrpl"
            >
              <span class="block text-sm font-semibold">XRP account</span>
              <span class="mt-0.5 block text-xs text-text-muted">Open the XRP app</span>
            </button>
            <button
              class="rounded-xl bg-bg px-4 py-3 text-left transition hover:bg-bg-hover disabled:opacity-50"
              :disabled="loadingProvider !== null"
              @click="connectLedgerEvm"
            >
              <span class="block text-sm font-semibold">EVM account</span>
              <span class="mt-0.5 block text-xs text-text-muted">Open the Ethereum app</span>
            </button>
            <span
              v-if="loadingProvider === 'ledger'"
              class="px-2 pb-1 text-xs text-accent sm:col-span-2"
            >
              Check your Ledger…
            </span>
          </div>
        </div>

        <p
          v-if="error"
          class="mt-5 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {{ error }}
        </p>

        <div v-if="candidates.length" class="mt-6 space-y-3">
          <p class="form-label">Verified accounts</p>
          <button
            v-for="candidate in candidates"
            :key="candidateKey(candidate)"
            class="flex w-full items-center gap-3 rounded-2xl border border-border bg-bg px-4 py-3 text-left"
            @click="toggleCandidate(candidate)"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded-md border"
              :class="
                selected.has(candidateKey(candidate))
                  ? 'border-accent bg-accent text-accent-fg'
                  : 'border-border'
              "
            >
              <svg
                v-if="selected.has(candidateKey(candidate))"
                class="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
              >
                <path d="m4 10 4 4 8-9" stroke-width="2" stroke-linecap="round" />
              </svg>
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">{{ candidate.label }}</span>
              <span class="block truncate font-mono text-xs text-text-muted">
                {{ shortAddress(candidate.address) }} · {{ candidate.derivationPath }}
              </span>
            </span>
          </button>
          <Button
            class="mt-2"
            size="lg"
            block
            :loading="saving"
            :disabled="selectedCandidates.length === 0"
            @click="addAccounts"
          >
            Add {{ selectedCandidates.length }} account{{
              selectedCandidates.length === 1 ? '' : 's'
            }}
          </Button>
        </div>

        <p class="mt-6 text-xs leading-5 text-text-muted">
          Device access starts only after your click. Always confirm the address and transaction on
          the hardware screen.
        </p>
      </template>
    </section>
  </main>
</template>
