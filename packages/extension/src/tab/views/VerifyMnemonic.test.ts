import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mnemonic =
  'abandon ability able about above absent absorb abstract absurd abuse access accident acoustic acquire across act action actor actress actual adapt add addict address'.split(
    ' ',
  )
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createWallet: vi.fn(),
  store: {
    mnemonic: [] as string[],
    authMethod: 'password',
    password: 'strong-password',
    loading: false,
    error: null as string | null,
    createWallet: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../stores/onboarding', () => ({ useOnboardingStore: () => mocks.store }))

import VerifyMnemonic from './VerifyMnemonic.vue'

describe('VerifyMnemonic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.store.mnemonic = [...mnemonic]
    mocks.store.createWallet.mockResolvedValue(true)
  })

  it('creates the wallet only after all recovery answers are correct', async () => {
    const wrapper = mount(VerifyMnemonic)
    await flushPromises()
    const groups = wrapper.findAll('[role="group"]')
    expect(groups).toHaveLength(3)

    for (const group of groups) {
      const position = Number((group.attributes('aria-label') ?? '').replace('Word ', ''))
      const correct = mnemonic[position - 1]
      await group
        .findAll('button')
        .find((button) => button.text().trim() === correct)!
        .trigger('click')
    }

    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Create Wallet')!
      .trigger('click')
    await flushPromises()

    expect(mocks.store.createWallet).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/complete')
  })
})
