import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OwnedXrplAsset, SwapQuote, TransactionReview } from '@otsu/types'

const assets: OwnedXrplAsset[] = [
  {
    key: 'native:XRP',
    asset: { type: 'native', currency: 'XRP' },
    symbol: 'XRP',
    name: 'XRP',
    balance: '10',
    transactionBalance: '10000000',
    authorized: true,
    tradeable: true,
  },
  {
    key: 'issued:USD:rIssuer',
    asset: { type: 'issued', currency: 'USD', issuer: 'rIssuer' },
    symbol: 'USD',
    name: 'US Dollar',
    balance: '5',
    transactionBalance: '5',
    authorized: true,
    tradeable: true,
  },
]

const quote: SwapQuote = {
  quoteId: 'quote-1',
  account: 'rAccount',
  network: 'testnet',
  from: assets[0].asset,
  to: assets[1].asset,
  inputAmount: '1',
  expectedOutput: '2',
  minimumOutput: '1.99',
  priceImpactBps: 0,
  slippageBps: 50,
  expiresAt: Date.now() + 30_000,
  takerGets: '1000000',
  takerPays: { currency: 'USD', issuer: 'rIssuer', value: '1.99' },
  flags: 0x000c0000,
}

const review: TransactionReview = {
  reviewId: 'review-1',
  chainType: 'xrpl',
  account: 'rAccount',
  network: 'testnet',
  expiresAt: Date.now() + 60_000,
  transactionType: 'OfferCreate',
  networkFee: '0.000012',
  title: 'Review swap',
  details: [
    { label: 'You pay', value: '1 XRP' },
    { label: 'Minimum received', value: '1.99 USD' },
  ],
  simulation: { success: true, engineResult: 'tesSUCCESS' },
}

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  fetchOwnedAssets: vi.fn(),
  fetchSwapQuote: vi.fn(),
  prepareTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  fetchBalance: vi.fn(),
  confirmOnHardware: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../stores/dex', () => ({
  useDexStore: () => ({
    ownedAssets: assets,
    swapQuote: null,
    error: '',
    loading: false,
    fetchOwnedAssets: mocks.fetchOwnedAssets,
    fetchSwapQuote: mocks.fetchSwapQuote,
  }),
}))
vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({
    prepareTransaction: mocks.prepareTransaction,
    confirmTransaction: mocks.confirmTransaction,
    fetchBalance: mocks.fetchBalance,
  }),
}))
vi.mock('../../lib/hardware-review', () => ({ confirmOnHardware: mocks.confirmOnHardware }))

import DEXTrade from './DEXTrade.vue'

describe('DEXTrade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchOwnedAssets.mockResolvedValue(undefined)
    mocks.fetchSwapQuote.mockResolvedValue(quote)
    mocks.prepareTransaction.mockResolvedValue(review)
    mocks.confirmTransaction.mockResolvedValue('TX_HASH')
    mocks.fetchBalance.mockResolvedValue(undefined)
    mocks.confirmOnHardware.mockResolvedValue({})
  })

  it('quotes owned assets and opens the generic simulated review', async () => {
    const wrapper = mount(DEXTrade)
    await flushPromises()
    await wrapper.get('#swap-from-amount').setValue('1')
    const reviewButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Review swap')!
    await reviewButton.trigger('click')
    await flushPromises()

    expect(mocks.fetchSwapQuote).toHaveBeenCalledWith({
      from: assets[0].asset,
      to: assets[1].asset,
      amount: '1',
      slippageBps: 50,
    })
    expect(mocks.prepareTransaction).toHaveBeenCalledWith({
      chainType: 'xrpl',
      kind: 'swap',
      quoteId: 'quote-1',
    })
    expect(wrapper.get('[data-testid="transaction-review"]').text()).toContain('1.99 USD')
  })

  it('shows success only after the reviewed transaction is confirmed', async () => {
    const wrapper = mount(DEXTrade)
    await flushPromises()
    await wrapper.get('#swap-from-amount').setValue('1')
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Review swap')!
      .trigger('click')
    await flushPromises()
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Swap')!
      .trigger('click')
    await flushPromises()

    expect(mocks.confirmTransaction).toHaveBeenCalledWith('review-1', undefined, undefined)
    expect(wrapper.text()).toContain('Swap submitted')
    expect(wrapper.find('[data-testid="success-animation"]').exists()).toBe(true)
  })
})
