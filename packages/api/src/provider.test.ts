/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// In Node/vitest, `window` does not exist. The provider code references
// `window` at call time (not at import time), so we can set it up once
// before importing. Point `window` at `globalThis` so that
// `window.xrpl` writes go to `globalThis.xrpl` which the module reads.
const hadWindow = typeof globalThis.window !== 'undefined'
if (!hadWindow) {
  ;(globalThis as any).window = globalThis
}

import { OtsuWallet } from './provider'

function createMockProvider() {
  return {
    isOtsu: true as const,
    isConnected: vi.fn(() => true),
    connect: vi.fn(() => Promise.resolve({ address: 'rTestAddress123' })),
    disconnect: vi.fn(() => Promise.resolve()),
    getAddress: vi.fn(() => Promise.resolve({ address: 'rTestAddress123' })),
    getNetwork: vi.fn(() => Promise.resolve({ network: 'mainnet' })),
    getBalance: vi.fn(() => Promise.resolve({ available: '100', total: '110', reserved: '10' })),
    signTransaction: vi.fn(() => Promise.resolve({ tx_blob: 'blob123', hash: 'hash456' })),
    signAndSubmit: vi.fn(() => Promise.resolve({ tx_blob: 'blob789', hash: 'hashABC' })),
    signMessage: vi.fn(() => Promise.resolve({ signature: 'sig123' })),
    switchNetwork: vi.fn(() => Promise.resolve({ network: 'testnet' })),
    on: vi.fn(),
    off: vi.fn(),
  }
}

function setProvider(mock: ReturnType<typeof createMockProvider> | undefined) {
  ;(globalThis as any).xrpl = mock
  // Also set on window in case window !== globalThis
  if (typeof window !== 'undefined' && window !== globalThis) {
    ;(window as any).xrpl = mock
  }
}

describe('OtsuWallet', () => {
  beforeEach(() => {
    setProvider(undefined)
  })

  afterEach(() => {
    setProvider(undefined)
  })

  describe('isInstalled', () => {
    it('returns false when window.xrpl is undefined', () => {
      expect(OtsuWallet.isInstalled()).toBe(false)
    })

    it('returns true when window.xrpl.isOtsu exists', () => {
      setProvider(createMockProvider())
      expect(OtsuWallet.isInstalled()).toBe(true)
    })

    it('returns false when isOtsu is falsy', () => {
      setProvider({ ...createMockProvider(), isOtsu: false } as any)
      expect(OtsuWallet.isInstalled()).toBe(false)
    })
  })

  describe('connect', () => {
    it('delegates to window.xrpl.connect()', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      const result = await wallet.connect()

      expect(mock.connect).toHaveBeenCalledOnce()
      expect(result).toEqual({ address: 'rTestAddress123' })
    })

    it('throws when extension is not installed', async () => {
      const wallet = new OtsuWallet()

      await expect(wallet.connect()).rejects.toThrow('Otsu Wallet extension is not installed')
    })
  })

  describe('disconnect', () => {
    it('delegates to window.xrpl.disconnect()', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      await wallet.disconnect()

      expect(mock.disconnect).toHaveBeenCalledOnce()
    })
  })

  describe('getAddress', () => {
    it('delegates to window.xrpl.getAddress()', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      const result = await wallet.getAddress()

      expect(mock.getAddress).toHaveBeenCalledOnce()
      expect(result).toEqual({ address: 'rTestAddress123' })
    })
  })

  describe('getNetwork', () => {
    it('delegates to window.xrpl.getNetwork()', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      const result = await wallet.getNetwork()

      expect(mock.getNetwork).toHaveBeenCalledOnce()
      expect(result).toEqual({ network: 'mainnet' })
    })
  })

  describe('getBalance', () => {
    it('delegates to window.xrpl.getBalance()', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      const result = await wallet.getBalance()

      expect(mock.getBalance).toHaveBeenCalledOnce()
      expect(result).toEqual({ available: '100', total: '110', reserved: '10' })
    })
  })

  describe('signTransaction', () => {
    it('delegates to window.xrpl.signTransaction() with the tx payload', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()
      const tx = { TransactionType: 'Payment', Amount: '1000000' }

      const result = await wallet.signTransaction(tx)

      expect(mock.signTransaction).toHaveBeenCalledWith(tx)
      expect(result).toEqual({ tx_blob: 'blob123', hash: 'hash456' })
    })
  })

  describe('signAndSubmit', () => {
    it('delegates to window.xrpl.signAndSubmit() with the tx payload', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()
      const tx = { TransactionType: 'Payment', Amount: '500000' }

      const result = await wallet.signAndSubmit(tx)

      expect(mock.signAndSubmit).toHaveBeenCalledWith(tx)
      expect(result).toEqual({ tx_blob: 'blob789', hash: 'hashABC' })
    })
  })

  describe('signMessage', () => {
    it('delegates to window.xrpl.signMessage() with the message', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      const result = await wallet.signMessage('hello world')

      expect(mock.signMessage).toHaveBeenCalledWith('hello world')
      expect(result).toEqual({ signature: 'sig123' })
    })
  })

  describe('switchNetwork', () => {
    it('delegates to window.xrpl.switchNetwork() with network id', async () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      const result = await wallet.switchNetwork('testnet')

      expect(mock.switchNetwork).toHaveBeenCalledWith('testnet')
      expect(result).toEqual({ network: 'testnet' })
    })
  })

  describe('isConnected', () => {
    it('delegates to window.xrpl.isConnected()', () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()

      const result = wallet.isConnected()

      expect(mock.isConnected).toHaveBeenCalledOnce()
      expect(result).toBe(true)
    })

    it('throws when extension is not installed', () => {
      const wallet = new OtsuWallet()

      expect(() => wallet.isConnected()).toThrow('Otsu Wallet extension is not installed')
    })
  })

  describe('event listeners', () => {
    it('on() delegates to window.xrpl.on()', () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()
      const callback = vi.fn()

      wallet.on('accountChanged', callback)

      expect(mock.on).toHaveBeenCalledWith('accountChanged', callback)
    })

    it('off() delegates to window.xrpl.off()', () => {
      const mock = createMockProvider()
      setProvider(mock)
      const wallet = new OtsuWallet()
      const callback = vi.fn()

      wallet.off('networkChanged', callback)

      expect(mock.off).toHaveBeenCalledWith('networkChanged', callback)
    })
  })
})
