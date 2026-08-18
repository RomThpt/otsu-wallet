import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  exportMnemonic: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}))

vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({ authMethod: 'password', exportMnemonic: mocks.exportMnemonic }),
}))

import BackupSeedPhrase from './BackupSeedPhrase.vue'

const mnemonic =
  'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega'

describe('BackupSeedPhrase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.exportMnemonic.mockResolvedValue(mnemonic)
  })

  it('returns to Settings without extending the backup history loop', async () => {
    const wrapper = mount(BackupSeedPhrase)

    await wrapper.get('button[aria-label="Back to Settings"]').trigger('click')

    expect(mocks.push).toHaveBeenCalledWith('/settings')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('clears a revealed phrase and replaces the route when Done is selected', async () => {
    const wrapper = mount(BackupSeedPhrase)
    await wrapper.get('input[type="password"]').setValue('correct horse battery staple')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Reveal Seed Phrase'))!
      .trigger('click')
    await flushPromises()

    expect(wrapper.findAll('ol li')).toHaveLength(24)
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Done')!
      .trigger('click')

    expect(wrapper.find('ol').exists()).toBe(false)
    expect(mocks.replace).toHaveBeenCalledWith('/settings')
  })
})
