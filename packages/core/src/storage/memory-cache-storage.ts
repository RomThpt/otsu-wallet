import type { CacheStorage } from './cache'

export class MemoryCacheStorage implements CacheStorage {
  private store = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | null> {
    const value = this.store.get(key)
    return (value as T) ?? null
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key)
  }

  async clear(): Promise<void> {
    this.store.clear()
  }
}
