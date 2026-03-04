// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCrossmarkShim } from './crossmark'
import type { OtsuProvider } from './otsu'

function createMockProvider(): OtsuProvider {
  return {
    isOtsu: true,
    isConnected: vi.fn(() => true),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getAddress: vi.fn(),
    getNetwork: vi.fn(),
    getBalance: vi.fn(),
    signTransaction: vi.fn(),
    signAndSubmit: vi.fn(),
    signMessage: vi.fn(),
    switchNetwork: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  } as unknown as OtsuProvider
}

describe('createCrossmarkShim', () => {
  let provider: ReturnType<typeof createMockProvider>
  let shim: ReturnType<typeof createCrossmarkShim>

  beforeEach(() => {
    provider = createMockProvider()
    shim = createCrossmarkShim(provider)
  })

  describe('signInAndWait()', () => {
    it('calls connect and wraps result in Crossmark response shape', async () => {
      vi.mocked(provider.connect).mockResolvedValue({
        address: 'rConnectedAddr',
      })

      const result = await shim.signInAndWait()
      expect(result).toEqual({
        response: { data: { address: 'rConnectedAddr' } },
      })
      expect(provider.connect).toHaveBeenCalledOnce()
    })
  })

  describe('signAndWait()', () => {
    it('delegates to provider.signTransaction and wraps result', async () => {
      vi.mocked(provider.signTransaction).mockResolvedValue({
        tx_blob: 'SIGNED_BLOB',
        hash: 'SIGNED_HASH',
      })

      const tx = { TransactionType: 'Payment', Destination: 'rDest', Amount: '100' }
      const result = await shim.signAndWait(tx)

      expect(result).toEqual({
        response: { data: { tx_blob: 'SIGNED_BLOB', hash: 'SIGNED_HASH' } },
      })
      expect(provider.signTransaction).toHaveBeenCalledWith(tx)
    })
  })

  describe('signAndSubmitAndWait()', () => {
    it('delegates to provider.signAndSubmit and wraps result', async () => {
      vi.mocked(provider.signAndSubmit).mockResolvedValue({
        tx_blob: 'SUBMIT_BLOB',
        hash: 'SUBMIT_HASH',
      })

      const tx = { TransactionType: 'Payment', Destination: 'rDest', Amount: '500' }
      const result = await shim.signAndSubmitAndWait(tx)

      expect(result).toEqual({
        response: { data: { tx_blob: 'SUBMIT_BLOB', hash: 'SUBMIT_HASH' } },
      })
      expect(provider.signAndSubmit).toHaveBeenCalledWith(tx)
    })
  })

  describe('methods', () => {
    it('has signInAndWait that delegates to the top-level method', async () => {
      vi.mocked(provider.connect).mockResolvedValue({
        address: 'rMethodAddr',
      })

      const result = await shim.methods.signInAndWait()
      expect(result).toEqual({
        response: { data: { address: 'rMethodAddr' } },
      })
      expect(provider.connect).toHaveBeenCalledOnce()
    })

    it('has signAndWait that delegates to the top-level method', async () => {
      vi.mocked(provider.signTransaction).mockResolvedValue({
        tx_blob: 'M_BLOB',
        hash: 'M_HASH',
      })

      const tx = { TransactionType: 'OfferCreate', TakerPays: '1000' }
      const result = await shim.methods.signAndWait(tx)

      expect(result).toEqual({
        response: { data: { tx_blob: 'M_BLOB', hash: 'M_HASH' } },
      })
      expect(provider.signTransaction).toHaveBeenCalledWith(tx)
    })

    it('has signAndSubmitAndWait that delegates to the top-level method', async () => {
      vi.mocked(provider.signAndSubmit).mockResolvedValue({
        tx_blob: 'MS_BLOB',
        hash: 'MS_HASH',
      })

      const tx = { TransactionType: 'TrustSet' }
      const result = await shim.methods.signAndSubmitAndWait(tx)

      expect(result).toEqual({
        response: { data: { tx_blob: 'MS_BLOB', hash: 'MS_HASH' } },
      })
      expect(provider.signAndSubmit).toHaveBeenCalledWith(tx)
    })
  })
})
