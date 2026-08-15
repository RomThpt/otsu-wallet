import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransactionReview } from '@otsu/types'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  prepareTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  fetchTokens: vi.fn(),
  confirmOnHardware: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({
    prepareTransaction: mocks.prepareTransaction,
    confirmTransaction: mocks.confirmTransaction,
    fetchTokens: mocks.fetchTokens,
  }),
}))
vi.mock('../../lib/hardware-review', () => ({ confirmOnHardware: mocks.confirmOnHardware }))

import AddTrustline from './AddTrustline.vue'

function createReview(transactionType: string): TransactionReview {
  return {
    reviewId: 'review-1',
    chainType: 'xrpl',
    account: 'rAccount',
    network: 'testnet',
    expiresAt: Date.now() + 60_000,
    transactionType,
    networkFee: '0.000012',
    title: transactionType === 'TrustSet' ? 'Add trustline' : 'Add MPT',
    details: [{ label: 'Asset', value: 'USD' }],
    simulation: { success: true, engineResult: 'tesSUCCESS' },
  }
}

describe('AddTrustline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prepareTransaction.mockResolvedValue(createReview('TrustSet'))
    mocks.confirmTransaction.mockResolvedValue('TX_HASH')
    mocks.fetchTokens.mockResolvedValue(undefined)
    mocks.confirmOnHardware.mockResolvedValue({})
  })

  it('prepares a simulated TrustSet review instead of submitting from the form', async () => {
    const wrapper = mount(AddTrustline)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('USD')
    await inputs[1].setValue('rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe')
    await inputs[2].setValue('1000')
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Review')!
      .trigger('click')
    await flushPromises()

    expect(mocks.prepareTransaction).toHaveBeenCalledWith({
      chainType: 'xrpl',
      kind: 'trustline',
      action: 'add',
      currency: 'USD',
      issuer: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
      limit: '1000',
    })
    expect(wrapper.find('[data-testid="transaction-review"]').exists()).toBe(true)
    expect(mocks.confirmTransaction).not.toHaveBeenCalled()
  })

  it('supports MPT authorization through the same review flow', async () => {
    mocks.prepareTransaction.mockResolvedValueOnce(createReview('MPTokenAuthorize'))
    const wrapper = mount(AddTrustline)
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'MPT')!
      .trigger('click')
    await wrapper.get('input').setValue('A'.repeat(48))
    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Review')!
      .trigger('click')
    await flushPromises()

    expect(mocks.prepareTransaction).toHaveBeenCalledWith({
      chainType: 'xrpl',
      kind: 'mpt-authorization',
      action: 'authorize',
      issuanceId: 'A'.repeat(48),
    })
    expect(wrapper.text()).toContain('Add MPT')
  })
})
