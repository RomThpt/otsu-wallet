import { vi } from 'vitest'

const storage: Record<string, unknown> = {}

export const chromeMock = {
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[] | null) => {
        if (keys === null) {
          return { ...storage }
        }
        if (typeof keys === 'string') {
          return { [keys]: storage[keys] }
        }
        const result: Record<string, unknown> = {}
        for (const key of keys) {
          result[key] = storage[key]
        }
        return result
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storage, items)
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const arr = typeof keys === 'string' ? [keys] : keys
        for (const key of arr) {
          delete storage[key]
        }
      }),
    },
    session: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') {
          return { [keys]: storage[`session:${keys}`] }
        }
        const result: Record<string, unknown> = {}
        for (const key of keys) {
          result[key] = storage[`session:${key}`]
        }
        return result
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        for (const [key, value] of Object.entries(items)) {
          storage[`session:${key}`] = value
        }
      }),
    },
  },
  alarms: {
    create: vi.fn(),
    clear: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
}

export function resetChromeMock() {
  for (const key of Object.keys(storage)) {
    delete storage[key]
  }
  vi.clearAllMocks()
}

Object.defineProperty(globalThis, 'chrome', {
  value: chromeMock,
  writable: true,
})
