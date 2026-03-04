import type { WalletSettings } from '@otsu/types'
import { DEFAULT_SETTINGS } from '@otsu/types'

declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
    }
  }
}

const SETTINGS_STORAGE_KEY = 'otsu-settings'

export class SettingsManager {
  async getSettings(): Promise<WalletSettings> {
    try {
      const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
      const stored = result[SETTINGS_STORAGE_KEY] as Partial<WalletSettings> | undefined
      return { ...DEFAULT_SETTINGS, ...stored }
    } catch {
      return { ...DEFAULT_SETTINGS }
    }
  }

  async updateSettings(partial: Partial<WalletSettings>): Promise<WalletSettings> {
    const current = await this.getSettings()
    const updated = { ...current, ...partial }
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: updated })
    return updated
  }
}
