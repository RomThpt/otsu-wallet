import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../lib/messaging', () => ({ sendMessage: mocks.sendMessage }))

import ImportWallet from './ImportWallet.vue'

const mnemonic = 'legal winner thank year wave sausage worth useful legal winner thank yellow'

describe('ImportWallet existing vault flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendMessage.mockImplementation(async (message: { type: string }) => {
      if (message.type === 'HAS_WALLET') return { success: true, data: true }
      if (message.type === 'GET_STATE') return { success: true, data: { locked: false } }
      if (message.type === 'IMPORT_SEED') return { success: true, data: {} }
      return { success: false, error: `Unexpected ${message.type}` }
    })
  })

  it('adds a second seed without creating or resetting the existing wallet', async () => {
    const wrapper = mount(ImportWallet)
    await flushPromises()
    await wrapper
      .findAll('.cursor-pointer')
      .find((card) => card.text().includes('Recovery Phrase'))!
      .trigger('click')
    await wrapper.get('textarea').setValue(mnemonic)
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Add Wallet')!
      .trigger('click')
    await flushPromises()

    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: 'IMPORT_SEED',
      payload: { mnemonic },
    })
    expect(mocks.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'CREATE_WALLET' }),
    )
    expect(mocks.sendMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'RESET_WALLET' }),
    )
    expect(wrapper.text()).toContain('Wallet Imported')
    expect(wrapper.find('[data-testid="success-animation"]').exists()).toBe(true)
  })

  it('keeps the import form visible when the additive import fails', async () => {
    mocks.sendMessage.mockImplementation(async (message: { type: string }) => {
      if (message.type === 'HAS_WALLET') return { success: true, data: true }
      if (message.type === 'GET_STATE') return { success: true, data: { locked: false } }
      if (message.type === 'IMPORT_SEED') return { success: false, error: 'Seed already exists' }
      return { success: false, error: 'Unexpected message' }
    })
    const wrapper = mount(ImportWallet)
    await flushPromises()
    await wrapper
      .findAll('.cursor-pointer')
      .find((card) => card.text().includes('Recovery Phrase'))!
      .trigger('click')
    await wrapper.get('textarea').setValue(mnemonic)
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Add Wallet')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Seed already exists')
    expect(wrapper.find('textarea').exists()).toBe(true)
    expect(wrapper.find('[data-testid="success-animation"]').exists()).toBe(false)
  })
})
