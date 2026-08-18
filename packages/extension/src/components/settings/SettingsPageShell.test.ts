import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

import SettingsPageShell from './SettingsPageShell.vue'

describe('SettingsPageShell', () => {
  beforeEach(() => {
    mocks.push.mockReset()
  })

  it('renders one accessible page header and uses its deterministic return route', async () => {
    const wrapper = mount(SettingsPageShell, {
      props: {
        title: 'Networks',
        backTo: '/settings',
        backLabel: 'Back to Settings',
      },
      slots: { default: '<p>Page content</p>' },
    })

    expect(wrapper.get('h1').text()).toBe('Networks')
    expect(wrapper.find('main').exists()).toBe(false)
    await wrapper.get('button[aria-label="Back to Settings"]').trigger('click')

    expect(mocks.push).toHaveBeenCalledWith('/settings')
  })
})
