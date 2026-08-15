import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  discoverLedgerEvmAccount: vi.fn(),
  discoverLedgerXrplAccount: vi.fn(),
  discoverTrezorAccounts: vi.fn(),
}))

vi.mock('../../lib/messaging', () => ({ sendMessage: mocks.sendMessage }))
vi.mock('@ledger', () => ({
  discoverLedgerEvmAccount: mocks.discoverLedgerEvmAccount,
  discoverLedgerXrplAccount: mocks.discoverLedgerXrplAccount,
}))
vi.mock('../../lib/trezor', () => ({
  discoverTrezorAccounts: mocks.discoverTrezorAccounts,
}))

import HardwareWallet from './HardwareWallet.vue'

const trezorAccounts = [
  {
    provider: 'trezor' as const,
    address: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    derivationPath: "m/44'/144'/0'/0/0",
    chainType: 'xrpl' as const,
    index: 0,
    deviceId: 'trezor-device',
    label: 'Trezor XRP 1',
  },
  {
    provider: 'trezor' as const,
    address: '0x1111111111111111111111111111111111111111',
    derivationPath: "m/44'/60'/0'/0/0",
    chainType: 'evm' as const,
    index: 0,
    deviceId: 'trezor-device',
    label: 'Trezor EVM 1',
  },
]

describe('HardwareWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.discoverTrezorAccounts.mockResolvedValue(trezorAccounts)
    mocks.sendMessage.mockImplementation(async (message: { type: string }) => {
      if (message.type === 'GET_STATE') return { success: true, data: { locked: false } }
      if (message.type === 'ADD_HARDWARE_ACCOUNTS') return { success: true }
      return { success: false, error: 'Unexpected message' }
    })
  })

  it('verifies, selects, and atomically adds the Trezor account pair', async () => {
    const wrapper = mount(HardwareWallet)
    await flushPromises()

    const trezorButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Trezor'))
    await trezorButton?.trigger('click')
    await flushPromises()

    expect(mocks.discoverTrezorAccounts).toHaveBeenCalledWith(0)
    expect(wrapper.text()).toContain('Trezor XRP 1')
    expect(wrapper.text()).toContain('Trezor EVM 1')

    const addButton = wrapper
      .findAll('button')
      .find((button) => button.text().trim() === 'Add 2 accounts')
    await addButton?.trigger('click')
    await flushPromises()

    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: 'ADD_HARDWARE_ACCOUNTS',
      payload: { accounts: trezorAccounts },
    })
    expect(wrapper.text()).toContain('Hardware wallet added')
    expect(wrapper.find('[data-testid="success-animation"]').exists()).toBe(true)
  })

  it('shows branded provider choices and explicit Ledger app options', async () => {
    const wrapper = mount(HardwareWallet)
    await flushPromises()

    expect(wrapper.get('[data-testid="connect-ledger"]').text()).toContain('Ledger')
    expect(wrapper.find('[data-testid="ledger-logo"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="connect-trezor"]').text()).toContain('Trezor')
    expect(wrapper.find('[data-testid="trezor-logo"]').exists()).toBe(true)

    await wrapper.get('[data-testid="connect-ledger"]').trigger('click')
    const options = wrapper.get('[data-testid="ledger-chain-options"]')
    expect(options.text()).toContain('XRP account')
    expect(options.text()).toContain('Open the XRP app')
    expect(options.text()).toContain('EVM account')
    expect(options.text()).toContain('Open the Ethereum app')
  })

  it('does not expose connection controls while the encrypted vault is locked', async () => {
    mocks.sendMessage.mockResolvedValueOnce({ success: true, data: { locked: true } })
    const wrapper = mount(HardwareWallet)
    await flushPromises()

    expect(wrapper.text()).toContain('Unlock Otsu first')
    expect(wrapper.text()).not.toContain('Connect a device')
  })
})
