import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  fetchState: vi.fn(),
  fetchNetworks: vi.fn(),
  fetchIdentity: vi.fn(),
  switchNetwork: vi.fn(),
  fetchBalance: vi.fn(),
  fetchXrpPrice: vi.fn(),
  fetchTokens: vi.fn(),
  fetchEvmBalance: vi.fn(),
  fetchEvmTokens: vi.fn(),
  setActiveAccount: vi.fn(),
  deriveMoreAccounts: vi.fn(),
  hydrateCachedData: vi.fn(),
  push: vi.fn(),
  currentRoute: { value: { path: '/' } },
}))

vi.mock('webextension-polyfill', () => ({
  default: {
    runtime: { sendMessage: vi.fn() },
  },
}))

vi.mock('../composables/useTheme', () => ({ useTheme: vi.fn() }))
vi.mock('../composables/useOnlineStatus', () => ({ useOnlineStatus: () => ({ isOnline: true }) }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ currentRoute: mocks.currentRoute, push: mocks.push }),
}))
vi.mock('../stores/wallet', () => ({
  useWalletStore: () => ({
    locked: false,
    loading: false,
    accounts: [],
    activeAccount: null,
    currentChainType: 'xrpl',
    isEvmNetwork: false,
    network: 'mainnet',
    predefinedNetworks: {},
    customNetworks: [],
    fetchState: mocks.fetchState,
    fetchNetworks: mocks.fetchNetworks,
    switchNetwork: mocks.switchNetwork,
    fetchBalance: mocks.fetchBalance,
    fetchXrpPrice: mocks.fetchXrpPrice,
    fetchTokens: mocks.fetchTokens,
    fetchEvmBalance: mocks.fetchEvmBalance,
    fetchEvmTokens: mocks.fetchEvmTokens,
    setActiveAccount: mocks.setActiveAccount,
    deriveMoreAccounts: mocks.deriveMoreAccounts,
    hydrateCachedData: mocks.hydrateCachedData,
  }),
}))
vi.mock('../stores/identity', () => ({
  useIdentityStore: () => ({
    loggedIn: false,
    avatarUrl: null,
    initials: '',
    fetchState: mocks.fetchIdentity,
  }),
}))

import App from './App.vue'

describe('popup shell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchState.mockResolvedValue(undefined)
    mocks.fetchNetworks.mockResolvedValue(undefined)
    mocks.fetchIdentity.mockResolvedValue(undefined)
    mocks.hydrateCachedData.mockResolvedValue(undefined)
    mocks.currentRoute.value.path = '/'
  })

  it('hydrates cached portfolio data before rendering the unlocked wallet', async () => {
    mount(App, {
      global: {
        stubs: {
          AccountSelector: true,
          NetworkSelector: true,
          OfflineBanner: true,
          Unlock: true,
          RouterView: true,
          RouterLink: true,
        },
      },
    })
    await flushPromises()

    expect(mocks.fetchState).toHaveBeenCalledOnce()
    expect(mocks.hydrateCachedData).toHaveBeenCalledOnce()
    expect(mocks.fetchIdentity).toHaveBeenCalledOnce()
    expect(mocks.fetchState.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.hydrateCachedData.mock.invocationCallOrder[0],
    )
  })

  it('keeps one header and lets the dashboard own primary navigation', async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          AccountSelector: { template: '<button>Account</button>' },
          NetworkSelector: { template: '<button>Network</button>' },
          OfflineBanner: true,
          Unlock: true,
          RouterView: { template: '<div data-test="route-view" />' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })
    await flushPromises()

    expect(wrapper.findAll('header')).toHaveLength(1)
    expect(wrapper.find('nav').exists()).toBe(false)
    expect(wrapper.find('[data-test="route-view"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Send')
    expect(wrapper.text()).not.toContain('Receive')
  })

  it('returns action flows to the wallet overview', async () => {
    mocks.currentRoute.value.path = '/send'
    const wrapper = mount(App, {
      global: {
        stubs: {
          AccountSelector: true,
          NetworkSelector: true,
          OfflineBanner: true,
          Unlock: true,
          RouterView: true,
          RouterLink: true,
        },
      },
    })
    await flushPromises()

    await wrapper.get('[aria-label="Back to wallet overview"]').trigger('click')
    expect(mocks.push).toHaveBeenCalledWith('/')
  })

  it.each([
    '/settings',
    '/settings/networks',
    '/settings/networks/add',
    '/settings/backup',
    '/settings/dapps',
    '/address-book',
  ])('lets the immersive Settings screen own the header on %s', async (path) => {
    mocks.currentRoute.value.path = path
    const wrapper = mount(App, {
      global: {
        stubs: {
          AccountSelector: true,
          NetworkSelector: true,
          OfflineBanner: true,
          Unlock: true,
          RouterView: { template: '<div data-test="route-view" />' },
          RouterLink: true,
        },
      },
    })
    await flushPromises()

    expect(wrapper.find('header').exists()).toBe(false)
    expect(wrapper.find('[data-test="route-view"]').exists()).toBe(true)
  })
})
