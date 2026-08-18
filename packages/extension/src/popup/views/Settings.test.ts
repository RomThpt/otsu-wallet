import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  fetchSettings: vi.fn(),
  updateSettings: vi.fn(),
  fetchIdentity: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../composables/useTheme', () => ({
  useTheme: () => ({ setTheme: vi.fn() }),
}))
vi.mock('../../stores/settings', () => ({
  useSettingsStore: () => ({
    settings: { blindSigningEnabled: false, autoLockMinutes: 15, theme: 'light' },
    fetchSettings: mocks.fetchSettings,
    updateSettings: mocks.updateSettings,
  }),
}))
vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({
    authMethod: 'password',
    activeAccount: 'rExample',
    changeAuthMethod: vi.fn(),
    lock: vi.fn(),
  }),
}))
vi.mock('../../stores/identity', () => ({
  useIdentityStore: () => ({
    loggedIn: false,
    loading: false,
    avatarUrl: null,
    displayName: null,
    initials: '',
    profile: null,
    linkedAddress: null,
    fetchState: mocks.fetchIdentity,
    login: vi.fn(),
    logout: vi.fn(),
    linkWallet: vi.fn(),
    unlinkWallet: vi.fn(),
  }),
}))

import Settings from './Settings.vue'

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchSettings.mockResolvedValue(undefined)
    mocks.fetchIdentity.mockResolvedValue(undefined)
  })

  it('renders the complete Settings hierarchy and routes wallet tools deterministically', async () => {
    const wrapper = mount(Settings)
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Settings')
    expect(wrapper.text()).toContain('Preferences')
    expect(wrapper.text()).toContain('Security')
    expect(wrapper.text()).toContain('Identity')
    expect(wrapper.text()).toContain('Wallet')
    expect(wrapper.get('[role="switch"]').attributes('aria-label')).toBe('Blind signing')

    for (const [label, path] of [
      ['Networks', '/settings/networks'],
      ['Address Book', '/address-book'],
      ['Backup Seed Phrase', '/settings/backup'],
      ['Connected dApps', '/settings/dapps'],
    ] as const) {
      await wrapper
        .findAll('button')
        .find((button) => button.text().includes(label))!
        .trigger('click')
      expect(mocks.push).toHaveBeenLastCalledWith(path)
    }
  })
})
