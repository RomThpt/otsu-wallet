import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Erc20Token, TokenBalance, TokenMetadata } from '@otsu/types'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  fetchBalance: vi.fn(),
  fetchXrpPrice: vi.fn(),
  fetchTokens: vi.fn(),
  fetchEvmBalance: vi.fn(),
  fetchEvmTokens: vi.fn(),
  fetchTransactionHistory: vi.fn(),
  requestFaucet: vi.fn(),
  fetchNFTs: vi.fn(),
  wallet: {
    isEvmNetwork: false,
    balance: { total: '125000000', available: '115000000', reserved: '10000000' },
    evmBalance: null as { balance: string; formatted: string } | null,
    xrpPrice: '0.5',
    network: 'mainnet',
    predefinedNetworks: { mainnet: { id: 'mainnet', name: 'Mainnet' } },
    customNetworks: [],
    tokens: [] as TokenBalance[],
    evmTokens: [] as Erc20Token[],
    tokenMetadata: {} as Record<string, TokenMetadata>,
    transactions: [],
    loading: false,
  },
  nft: {
    nfts: [],
    loading: false,
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({
    ...mocks.wallet,
    fetchBalance: mocks.fetchBalance,
    fetchXrpPrice: mocks.fetchXrpPrice,
    fetchTokens: mocks.fetchTokens,
    fetchEvmBalance: mocks.fetchEvmBalance,
    fetchEvmTokens: mocks.fetchEvmTokens,
    fetchTransactionHistory: mocks.fetchTransactionHistory,
    requestFaucet: mocks.requestFaucet,
  }),
}))

vi.mock('../../stores/nft', () => ({
  useNftStore: () => ({
    ...mocks.nft,
    fetchNFTs: mocks.fetchNFTs,
  }),
}))

import Dashboard from './Dashboard.vue'

function mountDashboard() {
  return mount(Dashboard, {
    global: {
      stubs: {
        TransactionItem: { template: '<button>Transaction row</button>' },
        NFTCard: { template: '<button>NFT card</button>' },
        Skeleton: { template: '<div />' },
        Button: { template: '<button><slot /></button>' },
      },
    },
  })
}

function buttonWithText(wrapper: ReturnType<typeof mountDashboard>, text: string) {
  return wrapper.findAll('button').find((button) => button.text() === text)
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.wallet.isEvmNetwork = false
    mocks.wallet.balance = { total: '125000000', available: '115000000', reserved: '10000000' }
    mocks.wallet.evmBalance = null
    mocks.wallet.xrpPrice = '0.5'
    mocks.wallet.network = 'mainnet'
    mocks.wallet.tokens = []
    mocks.wallet.evmTokens = []
    mocks.wallet.tokenMetadata = {}
    mocks.wallet.transactions = []
    mocks.nft.nfts = []
    mocks.fetchBalance.mockResolvedValue(undefined)
    mocks.fetchXrpPrice.mockResolvedValue(undefined)
    mocks.fetchTokens.mockResolvedValue(undefined)
    mocks.fetchEvmBalance.mockResolvedValue(undefined)
    mocks.fetchEvmTokens.mockResolvedValue(undefined)
    mocks.fetchTransactionHistory.mockResolvedValue(undefined)
    mocks.fetchNFTs.mockResolvedValue(undefined)
  })

  it('loads an XRPL portfolio and presents the wallet hierarchy', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    expect(mocks.fetchBalance).toHaveBeenCalledOnce()
    expect(mocks.fetchXrpPrice).toHaveBeenCalledOnce()
    expect(mocks.fetchTokens).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Portfolio balance')
    expect(wrapper.text()).toContain('$57.50')
    expect(wrapper.text()).toContain('10 XRP reserved')
    expect(wrapper.text()).not.toContain('available')
    expect(wrapper.text()).toContain('Send')
    expect(wrapper.text()).toContain('Receive')
    expect(wrapper.text()).toContain('Trade')
    expect(wrapper.text()).toContain('Explore')
    expect(wrapper.text()).toContain('Assets')
    expect(wrapper.text()).toContain('NFTs')
    expect(wrapper.text()).toContain('Activity')
    expect(wrapper.text()).toContain('Otsu is non-custodial. You own your keys.')

    const nativeAsset = wrapper.get('[data-testid="portfolio-asset-row"]')
    expect(nativeAsset.get('[data-field="asset-name"]').text()).toBe('XRP')
    expect(nativeAsset.get('[data-field="asset-amount"]').text()).toBe('115')
    expect(nativeAsset.get('[data-field="asset-usd-value"]').text()).toBe('$57.50')
    expect(nativeAsset.get('[data-field="asset-unit-price"]').text()).toBe('$0.50')
  })

  it('keeps the cached USD balance visible while the live refresh is pending', async () => {
    mocks.fetchBalance.mockReturnValue(new Promise(() => {}))
    const wrapper = mountDashboard()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('$57.50')
    expect(wrapper.get('[data-field="asset-amount"]').text()).toBe('115')
    expect(wrapper.text()).not.toContain('$0.00')
  })

  it('uses the same hierarchy for trustline assets without inventing market data', async () => {
    mocks.wallet.tokens = [
      {
        currency: 'USD',
        issuer: 'rIssuer',
        value: '25.125',
        limit: '1000',
        noRipple: false,
      },
    ]
    mocks.wallet.tokenMetadata = {
      'USD:rIssuer': { currency: 'USD', issuer: 'rIssuer', symbol: 'USDX', verified: true },
    }

    const wrapper = mountDashboard()
    await flushPromises()

    const rows = wrapper.findAll('[data-testid="portfolio-asset-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[1].get('[data-field="asset-name"]').text()).toBe('USDX')
    expect(rows[1].get('[data-field="asset-amount"]').text()).toBe('25.125')
    expect(rows[1].get('[data-field="asset-usd-value"]').text()).toBe('$—')
    expect(rows[1].get('[data-field="asset-unit-price"]').text()).toBe('Price unavailable')
    expect(wrapper.text()).not.toContain('0.00%')
  })

  it('hides both the hero and every asset valuation together', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    await wrapper.get('button[aria-label="Hide balances"]').trigger('click')

    expect(wrapper.text()).not.toContain('$57.50')
    expect(wrapper.get('[data-field="asset-amount"]').text()).toBe('••••')
    expect(wrapper.get('[data-field="asset-unit-price"]').text()).toBe('Hidden')
    expect(wrapper.get('button[aria-label="Show balances"]')).toBeTruthy()
  })

  it('loads portfolio categories on demand', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    await buttonWithText(wrapper, 'NFTs')?.trigger('click')
    await flushPromises()
    expect(mocks.fetchNFTs).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('No NFTs yet')

    await buttonWithText(wrapper, 'Activity')?.trigger('click')
    await flushPromises()
    expect(mocks.fetchTransactionHistory).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('No activity yet')
  })

  it('supports keyboard navigation between portfolio tabs', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    const assetsTab = wrapper.get('#portfolio-tab-assets')
    expect(assetsTab.attributes('aria-selected')).toBe('true')
    await assetsTab.trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()

    expect(wrapper.get('#portfolio-tab-nfts').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('#portfolio-panel-nfts').attributes('role')).toBe('tabpanel')
    expect(mocks.fetchNFTs).toHaveBeenCalledOnce()
  })

  it('routes the primary actions', async () => {
    const wrapper = mountDashboard()
    await flushPromises()

    await buttonWithText(wrapper, 'Send')?.trigger('click')
    await buttonWithText(wrapper, 'Receive')?.trigger('click')
    await buttonWithText(wrapper, 'Trade')?.trigger('click')
    await buttonWithText(wrapper, 'Explore')?.trigger('click')

    expect(mocks.push).toHaveBeenNthCalledWith(1, '/send')
    expect(mocks.push).toHaveBeenNthCalledWith(2, '/receive')
    expect(mocks.push).toHaveBeenNthCalledWith(3, '/explore/dex')
    expect(mocks.push).toHaveBeenNthCalledWith(4, '/explore')
  })

  it('uses EVM data without implying unsupported NFT or activity coverage', async () => {
    mocks.wallet.isEvmNetwork = true
    mocks.wallet.evmBalance = { balance: '1000000000000000000', formatted: '1' }

    const wrapper = mountDashboard()
    await flushPromises()

    expect(mocks.fetchEvmBalance).toHaveBeenCalledOnce()
    expect(mocks.fetchEvmTokens).toHaveBeenCalledOnce()
    expect(mocks.fetchBalance).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('reserved')

    await buttonWithText(wrapper, 'NFTs')?.trigger('click')
    expect(wrapper.text()).toContain('NFTs are not available on this network')
    expect(mocks.fetchNFTs).not.toHaveBeenCalled()

    await buttonWithText(wrapper, 'Activity')?.trigger('click')
    expect(wrapper.text()).toContain('Activity is not available on this network')
    expect(mocks.fetchTransactionHistory).not.toHaveBeenCalled()
  })
})
