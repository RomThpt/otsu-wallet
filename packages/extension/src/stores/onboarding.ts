import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AuthMethod } from '@otsu/types'
import { sendMessage } from '../lib/messaging'

export const useOnboardingStore = defineStore('onboarding', () => {
  const mnemonic = ref<string[]>([])
  const authMethod = ref<AuthMethod>('password')
  const password = ref('')
  const loading = ref(false)
  const error = ref<string | null>(null)

  function setMnemonic(words: string[]): void {
    mnemonic.value = words
  }

  function setAuthMethod(method: AuthMethod): void {
    authMethod.value = method
  }

  async function createWallet(): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const response = await sendMessage({
        type: 'CREATE_WALLET',
        payload: {
          mnemonic: mnemonic.value.join(' '),
          authMethod: authMethod.value,
          password: password.value || undefined,
        },
      })

      if (!response.success) {
        error.value = response.error ?? 'Failed to create wallet'
        return false
      }

      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  async function importWallet(format: string, value: string, label?: string): Promise<boolean> {
    loading.value = true
    error.value = null

    try {
      const response = await sendMessage({
        type: 'IMPORT_ACCOUNT',
        payload: { format, value, label },
      })

      if (!response.success) {
        error.value = response.error ?? 'Failed to import wallet'
        return false
      }

      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    mnemonic.value = []
    authMethod.value = 'password'
    password.value = ''
    loading.value = false
    error.value = null
  }

  return {
    mnemonic,
    authMethod,
    password,
    loading,
    error,
    setMnemonic,
    setAuthMethod,
    createWallet,
    importWallet,
    reset,
  }
})
