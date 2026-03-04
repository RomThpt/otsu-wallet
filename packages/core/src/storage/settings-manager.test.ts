import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@otsu/types'
import { SettingsManager } from './settings-manager'

declare const chrome: {
  storage: {
    local: {
      get: ReturnType<typeof vi.fn>
      set: ReturnType<typeof vi.fn>
    }
  }
}

let mockStorage: Record<string, unknown> = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items)
      }),
    },
  },
})

describe('SettingsManager', () => {
  let manager: SettingsManager

  beforeEach(() => {
    mockStorage = {}
    vi.clearAllMocks()
    manager = new SettingsManager()
  })

  it('returns DEFAULT_SETTINGS when nothing stored', async () => {
    const settings = await manager.getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })

  it('merges stored settings with defaults', async () => {
    mockStorage['otsu-settings'] = { theme: 'dark' }

    const settings = await manager.getSettings()
    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      theme: 'dark',
    })
  })

  it('updates and persists settings', async () => {
    const result = await manager.updateSettings({ autoLockMinutes: 15 })

    expect(result).toEqual({
      ...DEFAULT_SETTINGS,
      autoLockMinutes: 15,
    })

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      'otsu-settings': {
        ...DEFAULT_SETTINGS,
        autoLockMinutes: 15,
      },
    })

    const persisted = await manager.getSettings()
    expect(persisted.autoLockMinutes).toBe(15)
  })

  it('handles storage errors gracefully', async () => {
    vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage unavailable'))

    const settings = await manager.getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
  })
})
