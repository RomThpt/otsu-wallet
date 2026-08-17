import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  store: { authMethod: 'password', password: 'strong-password' },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}))
vi.mock('../../stores/onboarding', () => ({ useOnboardingStore: () => mocks.store }))

import RecoveryIntro from './RecoveryIntro.vue'

describe('RecoveryIntro', () => {
  beforeEach(() => vi.clearAllMocks())

  it('requires a backup acknowledgement before revealing the phrase', async () => {
    const wrapper = mount(RecoveryIntro)
    expect(wrapper.text()).toContain('Keep it private and offline')
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Show Recovery Phrase')!
      .trigger('click')
    expect(mocks.push).toHaveBeenCalledWith('/generate')
  })
})
