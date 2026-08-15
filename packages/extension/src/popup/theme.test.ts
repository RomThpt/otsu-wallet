import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { useTheme } from '../composables/useTheme'

describe('useTheme', () => {
  let prefersDark = false
  let systemThemeListener: (() => void) | null = null
  const themeStorage = new Map<string, string>()
  const removeEventListener = vi.fn()

  beforeEach(() => {
    prefersDark = false
    systemThemeListener = null
    themeStorage.clear()
    removeEventListener.mockReset()
    document.documentElement.classList.remove('dark')

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => themeStorage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => themeStorage.set(key, value)),
      removeItem: vi.fn((key: string) => themeStorage.delete(key)),
      clear: vi.fn(() => themeStorage.clear()),
    })

    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return prefersDark
        },
        addEventListener: vi.fn((_event: string, listener: () => void) => {
          systemThemeListener = listener
        }),
        removeEventListener,
      })),
    )
  })

  it('follows system theme changes and removes its listener on unmount', () => {
    prefersDark = true
    const wrapper = mount(
      defineComponent({
        setup: useTheme,
        template: '<div />',
      }),
    )

    expect(document.documentElement.classList.contains('dark')).toBe(true)

    prefersDark = false
    systemThemeListener?.()
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    wrapper.unmount()
    expect(removeEventListener).toHaveBeenCalledOnce()
  })
})
