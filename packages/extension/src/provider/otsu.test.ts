// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { OtsuProvider } from './otsu'

let uuidCounter = 0

vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
})

function simulateResponse(id: string, result?: unknown, error?: string) {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: window,
      data: {
        type: 'OTSU_PROVIDER_RESPONSE',
        id,
        result,
        error,
      },
    }),
  )
}

function simulateEvent(type: string, data?: unknown) {
  window.dispatchEvent(
    new MessageEvent('message', {
      source: window,
      data: {
        type: 'OTSU_PROVIDER_EVENT',
        event: { type, data },
      },
    }),
  )
}

describe('OtsuProvider', () => {
  let provider: OtsuProvider

  beforeEach(() => {
    uuidCounter = 0
    provider = new OtsuProvider()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('has isOtsu flag set to true', () => {
    expect(provider.isOtsu).toBe(true)
  })

  it('is not connected initially', () => {
    expect(provider.isConnected()).toBe(false)
  })

  describe('connect()', () => {
    it('sends connect request via postMessage and resolves with address', async () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')

      const connectPromise = provider.connect()

      simulateResponse('test-uuid-1', { address: 'rTestAddress123' })

      const result = await connectPromise
      expect(result).toEqual({ address: 'rTestAddress123' })
      expect(provider.isConnected()).toBe(true)
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'OTSU_PROVIDER_REQUEST',
          request: { id: 'test-uuid-1', method: 'connect', params: undefined },
        },
        '*',
      )
    })
  })

  describe('disconnect()', () => {
    it('sends disconnect request and sets connected to false', async () => {
      // First connect
      const connectPromise = provider.connect()
      simulateResponse('test-uuid-1', { address: 'rAddr' })
      await connectPromise
      expect(provider.isConnected()).toBe(true)

      // Then disconnect
      const disconnectPromise = provider.disconnect()
      simulateResponse('test-uuid-2', undefined)
      await disconnectPromise

      expect(provider.isConnected()).toBe(false)
    })
  })

  describe('getAddress()', () => {
    it('sends getAddress request and resolves with address', async () => {
      const promise = provider.getAddress()
      simulateResponse('test-uuid-1', { address: 'rSomeAddress' })

      const result = await promise
      expect(result).toEqual({ address: 'rSomeAddress' })
    })
  })

  describe('getNetwork()', () => {
    it('sends getNetwork request and resolves with network', async () => {
      const promise = provider.getNetwork()
      simulateResponse('test-uuid-1', { network: 'mainnet' })

      const result = await promise
      expect(result).toEqual({ network: 'mainnet' })
    })
  })

  describe('getBalance()', () => {
    it('sends getBalance request and resolves with balance', async () => {
      const promise = provider.getBalance()
      simulateResponse('test-uuid-1', {
        available: '95.5',
        total: '105.5',
        reserved: '10',
      })

      const result = await promise
      expect(result).toEqual({
        available: '95.5',
        total: '105.5',
        reserved: '10',
      })
    })
  })

  describe('signTransaction()', () => {
    it('sends signTransaction request with tx payload', async () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')
      const tx = {
        TransactionType: 'Payment',
        Destination: 'rDestination',
        Amount: '1000000',
      }

      const promise = provider.signTransaction(tx)
      simulateResponse('test-uuid-1', {
        tx_blob: 'ABCDEF',
        hash: 'HASH123',
      })

      const result = await promise
      expect(result).toEqual({ tx_blob: 'ABCDEF', hash: 'HASH123' })
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'OTSU_PROVIDER_REQUEST',
          request: { id: 'test-uuid-1', method: 'signTransaction', params: tx },
        },
        '*',
      )
    })
  })

  describe('signAndSubmit()', () => {
    it('sends signAndSubmit request with tx payload', async () => {
      const tx = { TransactionType: 'Payment', Destination: 'rDest', Amount: '500000' }

      const promise = provider.signAndSubmit(tx)
      simulateResponse('test-uuid-1', { tx_blob: 'BLOB', hash: 'TXHASH' })

      const result = await promise
      expect(result).toEqual({ tx_blob: 'BLOB', hash: 'TXHASH' })
    })
  })

  describe('signMessage()', () => {
    it('sends signMessage request with message param', async () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')

      const promise = provider.signMessage('Hello XRPL')
      simulateResponse('test-uuid-1', { signature: 'SIG123' })

      const result = await promise
      expect(result).toEqual({ signature: 'SIG123' })
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'OTSU_PROVIDER_REQUEST',
          request: {
            id: 'test-uuid-1',
            method: 'signMessage',
            params: { message: 'Hello XRPL' },
          },
        },
        '*',
      )
    })
  })

  describe('switchNetwork()', () => {
    it('sends switchNetwork request with networkId param', async () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')

      const promise = provider.switchNetwork('testnet')
      simulateResponse('test-uuid-1', { network: 'testnet' })

      const result = await promise
      expect(result).toEqual({ network: 'testnet' })
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'OTSU_PROVIDER_REQUEST',
          request: {
            id: 'test-uuid-1',
            method: 'switchNetwork',
            params: { networkId: 'testnet' },
          },
        },
        '*',
      )
    })
  })

  it('sends getNFTs request and resolves with array', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage')
    const nfts = [{ nftId: 'NFT001' }]
    const promise = provider.getNFTs()
    simulateResponse('test-uuid-1', nfts)

    const result = await promise
    expect(result).toEqual(nfts)
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: 'OTSU_PROVIDER_REQUEST',
        request: { id: 'test-uuid-1', method: 'getNFTs', params: undefined },
      },
      '*',
    )
  })

  it('sends getAccountOffers request and resolves with array', async () => {
    const offers = [{ offerId: 'OFFER1' }]
    const promise = provider.getAccountOffers()
    simulateResponse('test-uuid-1', offers)

    const result = await promise
    expect(result).toEqual(offers)
  })

  it('sends getTransactionStatus request and resolves with status', async () => {
    const postMessageSpy = vi.spyOn(window, 'postMessage')
    const status = { hash: 'ABC123', validated: true, result: 'tesSUCCESS', ledgerIndex: 100 }
    const promise = provider.getTransactionStatus('ABC123')
    simulateResponse('test-uuid-1', status)

    const result = await promise
    expect(result).toEqual(status)
    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: 'OTSU_PROVIDER_REQUEST',
        request: { id: 'test-uuid-1', method: 'getTransactionStatus', params: { hash: 'ABC123' } },
      },
      '*',
    )
  })

  describe('error handling', () => {
    it('rejects when error response is received', async () => {
      const promise = provider.connect()
      simulateResponse('test-uuid-1', undefined, 'User rejected the request')

      await expect(promise).rejects.toThrow('User rejected the request')
      expect(provider.isConnected()).toBe(false)
    })

    it('ignores responses for unknown request ids', () => {
      // Should not throw
      simulateResponse('unknown-id', { address: 'rAddr' })
    })
  })

  describe('event listeners', () => {
    it('calls registered listeners when event is emitted', () => {
      const callback = vi.fn()
      provider.on('accountChanged', callback)

      simulateEvent('accountChanged', { address: 'rNewAddress' })

      expect(callback).toHaveBeenCalledOnce()
      expect(callback).toHaveBeenCalledWith({ address: 'rNewAddress' })
    })

    it('supports multiple listeners for the same event', () => {
      const cb1 = vi.fn()
      const cb2 = vi.fn()
      provider.on('networkChanged', cb1)
      provider.on('networkChanged', cb2)

      simulateEvent('networkChanged', { network: 'testnet' })

      expect(cb1).toHaveBeenCalledOnce()
      expect(cb2).toHaveBeenCalledOnce()
    })

    it('removes listener with off()', () => {
      const callback = vi.fn()
      provider.on('accountChanged', callback)
      provider.off('accountChanged', callback)

      simulateEvent('accountChanged', { address: 'rAddr' })

      expect(callback).not.toHaveBeenCalled()
    })

    it('off() does not throw for unregistered event', () => {
      const callback = vi.fn()
      // Should not throw
      provider.off('nonexistent', callback)
    })

    it('sets connected to true on "connected" event', () => {
      expect(provider.isConnected()).toBe(false)

      simulateEvent('connected', undefined)

      expect(provider.isConnected()).toBe(true)
    })

    it('sets connected to false on "disconnected" event', async () => {
      // First connect
      const connectPromise = provider.connect()
      simulateResponse('test-uuid-1', { address: 'rAddr' })
      await connectPromise
      expect(provider.isConnected()).toBe(true)

      // Receive disconnected event
      simulateEvent('disconnected', undefined)

      expect(provider.isConnected()).toBe(false)
    })

    it('does not propagate errors from listener callbacks', () => {
      const badCallback = vi.fn(() => {
        throw new Error('listener error')
      })
      const goodCallback = vi.fn()

      provider.on('test', badCallback)
      provider.on('test', goodCallback)

      // Should not throw, and goodCallback should still be called
      simulateEvent('test', 'data')

      expect(badCallback).toHaveBeenCalledOnce()
      expect(goodCallback).toHaveBeenCalledOnce()
    })
  })

  describe('message filtering', () => {
    it('ignores messages from other sources', () => {
      const callback = vi.fn()
      provider.on('test', callback)

      // Dispatch event without source: window (source defaults to null)
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'OTSU_PROVIDER_EVENT',
            event: { type: 'test', data: 'value' },
          },
        }),
      )

      expect(callback).not.toHaveBeenCalled()
    })

    it('ignores messages with unrelated type', () => {
      const postMessageSpy = vi.spyOn(window, 'postMessage')
      const promise = provider.connect()

      // Dispatch unrelated message
      window.dispatchEvent(
        new MessageEvent('message', {
          source: window,
          data: { type: 'SOME_OTHER_TYPE', id: 'test-uuid-1', result: {} },
        }),
      )

      // Request should still be pending (not resolved)
      // Resolve it properly so the test doesn't hang
      simulateResponse('test-uuid-1', { address: 'rAddr' })

      return promise.then((result) => {
        expect(result).toEqual({ address: 'rAddr' })
        expect(postMessageSpy).toHaveBeenCalledTimes(1)
      })
    })
  })
})
