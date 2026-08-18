import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  addCustomNetwork: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}))
vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({ addCustomNetwork: mocks.addCustomNetwork }),
}))

import AddCustomNetwork from './AddCustomNetwork.vue'

describe('AddCustomNetwork', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.addCustomNetwork.mockResolvedValue(true)
  })

  it('saves through its form and returns to Networks without leaving the form in history', async () => {
    const wrapper = mount(AddCustomNetwork)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('Private Ledger')
    await inputs[1].setValue('wss://ledger.example')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.addCustomNetwork).toHaveBeenCalledWith({
      name: 'Private Ledger',
      url: 'wss://ledger.example',
      explorer: undefined,
      faucet: undefined,
    })
    expect(mocks.replace).toHaveBeenCalledWith('/settings/networks')
  })
})
