import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prepareTransaction: vi.fn(),
  confirmTransaction: vi.fn(),
  fetchTokens: vi.fn(),
  fetchBalance: vi.fn(),
  signLedgerEvmTransaction: vi.fn(),
  signLedgerXrplTransaction: vi.fn(),
  push: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
  useRoute: () => ({ query: {} }),
}))

vi.mock('../../stores/wallet', () => ({
  useWalletStore: () => ({
    isEvmNetwork: false,
    tokens: [],
    evmTokens: [],
    balance: { total: '187999988', available: '177999988', reserved: '10000000' },
    prepareTransaction: mocks.prepareTransaction,
    confirmTransaction: mocks.confirmTransaction,
    fetchTokens: mocks.fetchTokens,
    fetchBalance: mocks.fetchBalance,
    sendTokenPayment: vi.fn(),
  }),
}))

vi.mock('@ledger', () => ({
  signLedgerEvmTransaction: mocks.signLedgerEvmTransaction,
  signLedgerXrplTransaction: mocks.signLedgerXrplTransaction,
}))

import Send from './Send.vue'

describe('Send transaction review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchTokens.mockResolvedValue(undefined)
    mocks.fetchBalance.mockResolvedValue(undefined)
    mocks.signLedgerXrplTransaction.mockResolvedValue('SIGNED_XRPL_BLOB')
    mocks.prepareTransaction.mockResolvedValue({
      reviewId: 'review-1',
      chainType: 'xrpl',
      account: 'rSender',
      network: 'testnet',
      expiresAt: Date.now() + 60_000,
      transactionType: 'Payment',
      destination: 'rHJTqWTmDwUj3xpScH8J3YseG3kAHbYpgB',
      amount: '12',
      asset: 'XRP',
      networkFee: '0.000010',
      simulation: {
        success: true,
        engineResult: 'tesSUCCESS',
        engineResultMessage: 'The simulated transaction would have been applied.',
        balanceChanges: [
          {
            currency: 'XRP',
            before: '187.999988',
            after: '175.999978',
            delta: '-12.000000',
          },
        ],
        objectsCreated: 0,
        objectsDeleted: 0,
      },
    })
  })

  async function reviewXrpPayment() {
    const wrapper = mount(Send)
    await flushPromises()

    await wrapper.find('input[type="text"]').setValue('rHJTqWTmDwUj3xpScH8J3YseG3kAHbYpgB')
    await wrapper.find('input[type="number"]').setValue('12')
    const reviewButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Review')
    await reviewButton?.trigger('click')
    await flushPromises()

    return wrapper
  }

  it('uses the ledger simulation before showing an XRP confirmation', async () => {
    const wrapper = await reviewXrpPayment()

    expect(mocks.prepareTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        chainType: 'xrpl',
        kind: 'payment',
        destination: 'rHJTqWTmDwUj3xpScH8J3YseG3kAHbYpgB',
        amount: '12000000',
      }),
    )
    expect(wrapper.text()).toContain('What will happen')
    expect(wrapper.text()).toContain('Simulated successfully on the current ledger')
    expect(wrapper.text()).toContain('0.000010 XRP')
  })

  it('celebrates only after the payment submission succeeds', async () => {
    mocks.confirmTransaction.mockResolvedValue('ABC123')
    const wrapper = await reviewXrpPayment()
    const sendButton = wrapper.findAll('button').find((button) => button.text().trim() === 'Send')

    await sendButton?.trigger('click')
    await flushPromises()

    expect(mocks.confirmTransaction).toHaveBeenCalledWith('review-1', undefined, undefined)
    expect(wrapper.find('[data-testid="success-animation"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Transaction Sent')
    expect(wrapper.text()).toContain('ABC123')
    expect(mocks.fetchBalance).toHaveBeenCalledOnce()
  })

  it('signs the exact reviewed XRP payload on Ledger before confirmation', async () => {
    const deviceTransaction = {
      TransactionType: 'Payment',
      Account: 'rSender',
      Destination: 'rHJTqWTmDwUj3xpScH8J3YseG3kAHbYpgB',
      Amount: '12000000',
      Fee: '10',
      Sequence: 1,
    }
    mocks.prepareTransaction.mockResolvedValueOnce({
      reviewId: 'ledger-review',
      chainType: 'xrpl',
      account: 'rSender',
      network: 'testnet',
      expiresAt: Date.now() + 60_000,
      transactionType: 'Payment',
      destination: deviceTransaction.Destination,
      amount: '12',
      asset: 'XRP',
      networkFee: '0.000010',
      simulation: { success: true, engineResult: 'tesSUCCESS', balanceChanges: [] },
      hardwareProvider: 'ledger',
      derivationPath: "m/44'/144'/0'/0/0",
      deviceTransaction,
    })
    mocks.confirmTransaction.mockResolvedValue('LEDGER_HASH')
    const wrapper = await reviewXrpPayment()

    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Send')
      ?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Transaction Sent')
    expect(mocks.signLedgerXrplTransaction).toHaveBeenCalledWith({
      derivationPath: "m/44'/144'/0'/0/0",
      expectedAddress: 'rSender',
      transaction: deviceTransaction,
    })
    expect(mocks.confirmTransaction).toHaveBeenCalledWith(
      'ledger-review',
      undefined,
      'SIGNED_XRPL_BLOB',
    )
  })

  it('keeps the form visible and does not celebrate when submission fails', async () => {
    mocks.confirmTransaction.mockRejectedValue(new Error('tecPATH_DRY'))
    const wrapper = await reviewXrpPayment()
    const sendButton = wrapper.findAll('button').find((button) => button.text().trim() === 'Send')

    await sendButton?.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="success-animation"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('tecPATH_DRY')
    expect(wrapper.text()).toContain('Review')
    expect(mocks.fetchBalance).not.toHaveBeenCalled()
  })
})
