import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const { mockUnlock, mockResetWallet, mockTabsCreate, mockAuthenticatorAvailable } = vi.hoisted(
  () => ({
    mockUnlock: vi.fn(),
    mockResetWallet: vi.fn(),
    mockTabsCreate: vi.fn(),
    mockAuthenticatorAvailable: vi.fn(),
  }),
)

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: { getURL: vi.fn((path: string) => path) },
    tabs: { create: mockTabsCreate },
  },
}))

vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({
    locked: true,
    loading: false,
    authMethod: 'password',
    unlock: mockUnlock,
    resetWallet: mockResetWallet,
  }),
}))

import Unlock from './Unlock.vue'

describe('Unlock', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockUnlock.mockReset()
    mockResetWallet.mockReset()
    mockTabsCreate.mockReset()
    mockAuthenticatorAvailable.mockReset().mockResolvedValue(false)
    vi.stubGlobal('PublicKeyCredential', {
      isUserVerifyingPlatformAuthenticatorAvailable: mockAuthenticatorAvailable,
    })
  })

  it('renders the branded password form with vector artwork', async () => {
    const wrapper = mount(Unlock)
    await flushPromises()

    expect(wrapper.get('[data-testid="otsu-mark"]').element.tagName).toBe('svg')
    expect(wrapper.get('[data-testid="unlock-landscape"]').element.tagName).toBe('svg')
    expect(wrapper.get('[data-testid="unlock-screen"]').classes()).toContain('bg-white')
    expect(wrapper.get('[data-testid="unlock-screen"]').classes()).not.toContain('bg-bg')
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Otsu is non-custodial. You own your keys.')
  })

  it('shows and hides the password without changing its value', async () => {
    const wrapper = mount(Unlock)
    const input = wrapper.get('#unlock-password')
    await input.setValue('mySecretPassword')

    const toggle = wrapper.get('button[aria-label="Show password"]')
    await toggle.trigger('click')
    expect(wrapper.get('#unlock-password').attributes('type')).toBe('text')
    expect((wrapper.get('#unlock-password').element as HTMLInputElement).value).toBe(
      'mySecretPassword',
    )

    await wrapper.get('button[aria-label="Hide password"]').trigger('click')
    expect(wrapper.get('#unlock-password').attributes('type')).toBe('password')
  })

  it('does not count an empty password as a failed attempt', async () => {
    const wrapper = mount(Unlock)
    await wrapper.get('form').trigger('submit')

    expect(wrapper.get('[role="alert"]').text()).toBe('Enter your password')
    expect(mockUnlock).not.toHaveBeenCalled()
  })

  it('shows an accessible error on failed unlock', async () => {
    mockUnlock.mockResolvedValue(false)
    const wrapper = mount(Unlock)
    await wrapper.get('#unlock-password').setValue('wrong-password')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('Invalid password')
  })

  it('calls wallet.unlock with method and password', async () => {
    mockUnlock.mockResolvedValue(true)
    const wrapper = mount(Unlock)
    await wrapper.get('#unlock-password').setValue('mySecretPassword')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mockUnlock).toHaveBeenCalledWith('password', 'mySecretPassword')
  })

  it('offers passkey unlock only when a platform authenticator is available', async () => {
    mockAuthenticatorAvailable.mockResolvedValue(true)
    mockUnlock.mockResolvedValue(true)
    const wrapper = mount(Unlock)
    await flushPromises()

    const passkeyButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Unlock with Passkey'))
    expect(passkeyButton).toBeDefined()
    await passkeyButton!.trigger('click')

    expect(mockUnlock).toHaveBeenCalledWith('passkey')
  })

  it('disables authentication after repeated failed attempts', async () => {
    vi.useFakeTimers()
    mockUnlock.mockResolvedValue(false)
    const wrapper = mount(Unlock)
    await wrapper.get('#unlock-password').setValue('wrong-password')

    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        await wrapper.get('form').trigger('submit')
        await Promise.resolve()
        await wrapper.vm.$nextTick()
      }

      expect(wrapper.text()).toContain('Too many attempts. Try again in 30s')
      expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  it('requires typed confirmation before resetting the wallet', async () => {
    mockResetWallet.mockResolvedValue(true)
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined)
    const wrapper = mount(Unlock)
    const resetLink = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Forgot password?'))!

    await resetLink.trigger('click')
    expect(wrapper.get('[role="alertdialog"]').attributes('aria-labelledby')).toBe('reset-title')
    const resetButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Reset wallet')!
    expect(resetButton.attributes('disabled')).toBeDefined()

    await wrapper.get('#reset-confirmation').setValue('RESET')
    await resetButton.trigger('click')
    await flushPromises()

    expect(mockResetWallet).toHaveBeenCalledOnce()
    expect(mockTabsCreate).toHaveBeenCalledWith({ url: 'tab.html' })
    expect(closeSpy).toHaveBeenCalledOnce()
    closeSpy.mockRestore()
  })
})
