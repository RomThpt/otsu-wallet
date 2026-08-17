import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const phrase =
  'abandon ability able about above absent absorb abstract absurd abuse access accident acoustic acquire across act action actor actress actual adapt add addict address'
const words = phrase.split(' ')
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  generate: vi.fn(),
  writeText: vi.fn(),
  store: {
    mnemonic: [] as string[],
    setMnemonic: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@otsu/core', () => ({
  generateNewMnemonic: mocks.generate,
  mnemonicToWordArray: (value: string) => value.split(' '),
}))
vi.mock('../../stores/onboarding', () => ({ useOnboardingStore: () => mocks.store }))

import GenerateMnemonic from './GenerateMnemonic.vue'

describe('GenerateMnemonic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.store.mnemonic = []
    mocks.generate.mockReturnValue(phrase)
    mocks.store.setMnemonic.mockImplementation((value: string[]) => {
      mocks.store.mnemonic = [...value]
    })
    mocks.writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mocks.writeText },
    })
  })

  it('preserves the generated phrase when the view is revisited', async () => {
    const first = mount(GenerateMnemonic)
    await flushPromises()
    expect(first.text()).toContain(words[23])
    first.unmount()

    const second = mount(GenerateMnemonic)
    await flushPromises()
    expect(second.text()).toContain(words[23])
    expect(mocks.generate).toHaveBeenCalledTimes(1)
  })

  it('does not claim copy success when the clipboard rejects', async () => {
    mocks.writeText.mockRejectedValue(new Error('denied'))
    const wrapper = mount(GenerateMnemonic)
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Copy to clipboard'))!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Could not copy the recovery phrase')
    expect(wrapper.text()).toContain(words[0])
    expect(wrapper.text()).not.toContain('Copied to clipboard')
  })
})
