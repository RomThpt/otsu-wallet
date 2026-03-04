import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { WalletSettings, DAppPermission } from '@otsu/types'
import { sendMessage } from '../lib/messaging'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<WalletSettings | null>(null)
  const permissions = ref<DAppPermission[]>([])
  const loading = ref(false)

  async function fetchSettings(): Promise<void> {
    const response = await sendMessage<WalletSettings>({ type: 'GET_SETTINGS' })
    if (response.success && response.data) {
      settings.value = response.data
    }
  }

  async function updateSettings(partial: Partial<WalletSettings>): Promise<void> {
    const response = await sendMessage<WalletSettings>({
      type: 'SET_SETTINGS',
      payload: { settings: partial },
    })
    if (response.success && response.data) {
      settings.value = response.data
    }
  }

  async function fetchPermissions(): Promise<void> {
    const response = await sendMessage<DAppPermission[]>({ type: 'GET_PERMISSIONS' })
    if (response.success && response.data) {
      permissions.value = response.data
    }
  }

  async function revokePermission(origin: string): Promise<void> {
    const response = await sendMessage({
      type: 'REVOKE_PERMISSION',
      payload: { origin },
    })
    if (response.success) {
      permissions.value = permissions.value.filter((p) => p.origin !== origin)
    }
  }

  return {
    settings,
    permissions,
    loading,
    fetchSettings,
    updateSettings,
    fetchPermissions,
    revokePermission,
  }
})
