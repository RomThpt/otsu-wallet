import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  fetchPermissions: vi.fn(),
  revokePermission: vi.fn(),
  permissions: [
    {
      origin: 'https://example.com',
      title: 'Example',
      connectedAt: 1_700_000_000_000,
      address: 'rExample',
      scopes: ['read', 'sign'],
    },
  ],
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../../stores/settings', () => ({
  useSettingsStore: () => ({
    permissions: mocks.permissions,
    fetchPermissions: mocks.fetchPermissions,
    revokePermission: mocks.revokePermission,
  }),
}))

import ConnectedDApps from './ConnectedDApps.vue'

describe('ConnectedDApps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchPermissions.mockResolvedValue(undefined)
    mocks.revokePermission.mockResolvedValue(undefined)
  })

  it('requires confirmation before disconnecting a site', async () => {
    const wrapper = mount(ConnectedDApps)
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Disconnect')!
      .trigger('click')
    expect(mocks.revokePermission).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('Disconnect this site from Otsu?')

    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Disconnect')!
      .trigger('click')
    await flushPromises()

    expect(mocks.revokePermission).toHaveBeenCalledWith('https://example.com')
  })
})
