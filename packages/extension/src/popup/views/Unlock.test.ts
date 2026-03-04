import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

const mockUnlock = vi.fn()
const mockResetWallet = vi.fn()

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
  })

  it('renders form with password input and unlock button', () => {
    const wrapper = mount(Unlock)
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Unlock')
  })

  it('shows error on failed unlock', async () => {
    mockUnlock.mockResolvedValue(false)
    const wrapper = mount(Unlock)
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Invalid password')
  })

  it('calls wallet.unlock with method and password', async () => {
    mockUnlock.mockResolvedValue(true)
    const wrapper = mount(Unlock)
    const input = wrapper.find('input[type="password"]')
    await input.setValue('mySecretPassword')
    await wrapper.find('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(mockUnlock).toHaveBeenCalledWith('password', 'mySecretPassword')
  })
})
