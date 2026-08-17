import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  store: {
    authMethod: 'password',
    password: '',
    loading: false,
    error: null as string | null,
    setAuthMethod: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../stores/onboarding', () => ({ useOnboardingStore: () => mocks.store }))

import SetupAuth from './SetupAuth.vue'

describe('SetupAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.store.password = ''
    mocks.store.error = null
  })

  it('stores password protection and continues without creating the wallet yet', async () => {
    const wrapper = mount(SetupAuth)
    await flushPromises()
    const inputs = wrapper.findAll('input[type="password"]')
    await inputs[0].setValue('strong-password')
    await inputs[1].setValue('strong-password')
    await wrapper.get('form').trigger('submit')

    expect(mocks.store.setAuthMethod).toHaveBeenCalledWith('password')
    expect(mocks.store.password).toBe('strong-password')
    expect(mocks.push).toHaveBeenCalledWith('/recovery')
    expect(wrapper.get('[data-testid="onboarding-shell"]').classes()).toContain('bg-white')
  })
})
