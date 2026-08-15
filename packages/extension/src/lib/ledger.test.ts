import { beforeEach, describe, expect, it, vi } from 'vitest'
import { decodeXrplTransaction, deriveAccount } from '@otsu/core'

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  closeTransport: vi.fn(),
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
}))

vi.mock('@ledgerhq/hw-transport-webhid', () => ({
  default: class MockTransportWebHID {
    static create = mocks.createTransport
  },
}))

vi.mock('@ledgerhq/hw-app-xrp', () => ({
  default: class MockXrp {
    getAddress = mocks.getAddress
    signTransaction = mocks.signTransaction
  },
}))

vi.mock('@ledgerhq/device-management-kit', () => ({
  DeviceActionStatus: { Completed: 'completed', Error: 'error', Stopped: 'stopped' },
  DeviceManagementKitBuilder: class {
    addTransport() {
      return this
    }
    build() {
      return {}
    }
  },
}))
vi.mock('@ledgerhq/device-transport-kit-web-hid', () => ({
  webHidIdentifier: 'webhid',
  webHidTransportFactory: {},
}))
vi.mock('@ledgerhq/device-signer-kit-ethereum', () => ({
  SignerEthBuilder: class {},
}))

import { discoverLedgerXrplAccount, signLedgerXrplTransaction } from './ledger'

const derived = deriveAccount(
  'legal winner thank year wave sausage worth useful legal winner thank yellow',
  0,
)
const transaction = {
  TransactionType: 'Payment',
  Account: derived.address,
  Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
  Amount: '12000000',
  Fee: '12',
  Sequence: 1,
  LastLedgerSequence: 1000,
}

describe('Ledger XRPL WebHID', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'hid', { value: {}, configurable: true })
    mocks.createTransport.mockResolvedValue({ close: mocks.closeTransport })
    mocks.closeTransport.mockResolvedValue(undefined)
    mocks.getAddress.mockResolvedValue({
      address: derived.address,
      publicKey: derived.publicKey,
    })
    mocks.signTransaction.mockResolvedValue(`30440220${'00'.repeat(32)}0220${'01'.repeat(32)}`)
  })

  it('verifies and returns the selected XRP account', async () => {
    await expect(discoverLedgerXrplAccount(0)).resolves.toMatchObject({
      provider: 'ledger',
      address: derived.address,
      publicKey: derived.publicKey,
      derivationPath: "m/44'/144'/0'/0/0",
      chainType: 'xrpl',
    })
    expect(mocks.getAddress).toHaveBeenCalledWith("44'/144'/0'/0/0", true, false)
    expect(mocks.closeTransport).toHaveBeenCalledOnce()
  })

  it('signs the exact prepared payload and returns a signed XRPL blob', async () => {
    const blob = await signLedgerXrplTransaction({
      derivationPath: "m/44'/144'/0'/0/0",
      expectedAddress: derived.address,
      transaction,
    })
    const decoded = decodeXrplTransaction(blob)

    expect(mocks.signTransaction).toHaveBeenCalledWith("44'/144'/0'/0/0", expect.any(String))
    expect(decoded).toMatchObject({
      ...transaction,
      SigningPubKey: derived.publicKey.toUpperCase(),
      TxnSignature: expect.any(String),
    })
    expect(mocks.closeTransport).toHaveBeenCalledOnce()
  })

  it('rejects a different connected account before asking for a signature', async () => {
    mocks.getAddress.mockResolvedValueOnce({
      address: 'rHJTqWTmDwUj3xpScH8J3YseG3kAHbYpgB',
      publicKey: derived.publicKey,
    })

    await expect(
      signLedgerXrplTransaction({
        derivationPath: "m/44'/144'/0'/0/0",
        expectedAddress: derived.address,
        transaction,
      }),
    ).rejects.toThrow('does not match the selected account')
    expect(mocks.signTransaction).not.toHaveBeenCalled()
    expect(mocks.closeTransport).toHaveBeenCalledOnce()
  })

  it('rejects a transaction for another account before opening the device', async () => {
    await expect(
      signLedgerXrplTransaction({
        derivationPath: "m/44'/144'/0'/0/0",
        expectedAddress: derived.address,
        transaction: {
          ...transaction,
          Account: 'rHJTqWTmDwUj3xpScH8J3YseG3kAHbYpgB',
        },
      }),
    ).rejects.toThrow('does not match the selected Ledger account')
    expect(mocks.createTransport).not.toHaveBeenCalled()
    expect(mocks.signTransaction).not.toHaveBeenCalled()
  })
})
