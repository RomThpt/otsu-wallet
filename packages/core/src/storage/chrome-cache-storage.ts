import type { CacheStorage } from './cache'

declare const chrome: {
  storage: {
    local: {
      get(keys: string | string[] | null): Promise<Record<string, unknown>>
      set(items: Record<string, unknown>): Promise<void>
      remove(keys: string | string[]): Promise<void>
    }
  }
}

export class ChromeCacheStorage implements CacheStorage {
  async get<T>(key: string): Promise<T | null> {
    const result = await chrome.storage.local.get(key)
    return (result[key] as T) ?? null
  }

  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value })
  }

  async remove(key: string): Promise<void> {
    await chrome.storage.local.remove(key)
  }

  async clear(): Promise<void> {
    const all = await chrome.storage.local.get(null)
    const cacheKeys = Object.keys(all).filter((k) => k.startsWith('otsu-cache:'))
    if (cacheKeys.length > 0) {
      await chrome.storage.local.remove(cacheKeys)
    }
  }
}
