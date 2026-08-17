import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  reset: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../stores/onboarding', () => ({
  useOnboardingStore: () => ({ reset: mocks.reset }),
}))
vi.mock('../../lib/messaging', () => ({ sendMessage: mocks.sendMessage }))

import Welcome from './Welcome.vue'

describe('Welcome', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.sendMessage.mockResolvedValue({ success: true, data: false })
  })

  it('starts a clean, light create flow', async () => {
    const wrapper = mount(Welcome)
    await flushPromises()

    expect(wrapper.get('main').classes()).toContain('bg-white')
    expect(wrapper.find('[data-testid="otsu-mark"]').exists()).toBe(true)
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Create New Wallet')!
      .trigger('click')

    expect(mocks.reset).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/auth')
  })

  it('shows a retry surface when wallet detection fails', async () => {
    mocks.sendMessage.mockRejectedValueOnce(new Error('Background unavailable'))
    const wrapper = mount(Welcome)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Background unavailable')
    expect(wrapper.text()).toContain('Try again')
  })
})
