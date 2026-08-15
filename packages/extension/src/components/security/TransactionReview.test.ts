import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { TransactionReview as TransactionReviewModel } from '@otsu/types'
import TransactionReview from './TransactionReview.vue'

const review: TransactionReviewModel = {
  reviewId: 'review-1',
  chainType: 'xrpl',
  account: 'rAccount',
  network: 'testnet',
  expiresAt: Date.now() + 60_000,
  transactionType: 'OfferCreate',
  amount: '9.95',
  asset: 'USD',
  networkFee: '0.000012',
  title: 'Review swap',
  description: 'The order executes immediately.',
  details: [
    { label: 'You pay', value: '10 XRP' },
    { label: 'Minimum received', value: '9.95 USD' },
  ],
  simulation: {
    success: true,
    engineResult: 'tesSUCCESS',
    engineResultMessage: 'The simulated transaction would have been applied.',
    balanceChanges: [],
    objectsCreated: 0,
    objectsDeleted: 0,
  },
}

describe('TransactionReview', () => {
  it('renders generic operation details and the ledger simulation result', () => {
    const wrapper = mount(TransactionReview, { props: { review } })

    expect(wrapper.get('[data-testid="transaction-review"]').text()).toContain('Review swap')
    expect(wrapper.text()).toContain('10 XRP')
    expect(wrapper.text()).toContain('9.95 USD')
    expect(wrapper.text()).toContain('0.000012 XRP')
    expect(wrapper.text()).toContain('rAccount')
    expect(wrapper.text()).toContain('testnet')
    expect(wrapper.text()).toContain('Simulated successfully')
  })

  it('surfaces a failed simulation instead of presenting it as safe', () => {
    const wrapper = mount(TransactionReview, {
      props: {
        review: {
          ...review,
          simulation: { success: false, error: 'tecUNFUNDED_OFFER' },
        },
      },
    })

    expect(wrapper.text()).toContain('tecUNFUNDED_OFFER')
  })
})
