// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createGemWalletShim } from './gemwallet'
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

describe('createGemWalletShim', () => {
  let provider: ReturnType<typeof createMockProvider>
  let shim: ReturnType<typeof createGemWalletShim>

  beforeEach(() => {
    provider = createMockProvider()
    shim = createGemWalletShim(provider)
  })

  describe('isInstalled()', () => {
    it('returns { result: { isInstalled: true } }', async () => {
      const result = await shim.isInstalled()
      expect(result).toEqual({ result: { isInstalled: true } })
    })
  })

  describe('getAddress()', () => {
    it('wraps provider address in GemWallet response shape', async () => {
      vi.mocked(provider.getAddress).mockResolvedValue({
        address: 'rTestAddress',
      })

      const result = await shim.getAddress()
      expect(result).toEqual({ result: { address: 'rTestAddress' } })
      expect(provider.getAddress).toHaveBeenCalledOnce()
    })
  })

  describe('getPublicKey()', () => {
    it('returns address as publicKey fallback', async () => {
      vi.mocked(provider.getAddress).mockResolvedValue({
        address: 'rFallbackKey',
      })

      const result = await shim.getPublicKey()
      expect(result).toEqual({ result: { publicKey: 'rFallbackKey' } })
    })
  })

  describe('getNetwork()', () => {
    it('wraps provider network in GemWallet response shape', async () => {
      vi.mocked(provider.getNetwork).mockResolvedValue({ network: 'mainnet' })

      const result = await shim.getNetwork()
      expect(result).toEqual({ result: { network: 'mainnet' } })
      expect(provider.getNetwork).toHaveBeenCalledOnce()
    })
  })

  describe('sendPayment()', () => {
    it('creates Payment tx and calls signAndSubmit', async () => {
      vi.mocked(provider.signAndSubmit).mockResolvedValue({
        tx_blob: 'BLOB',
        hash: 'HASH123',
      })

      const result = await shim.sendPayment({
        amount: '1000000',
        destination: 'rDestination',
      })

      expect(result).toEqual({ result: { hash: 'HASH123' } })
      expect(provider.signAndSubmit).toHaveBeenCalledWith({
        TransactionType: 'Payment',
        Destination: 'rDestination',
        Amount: '1000000',
      })
    })

    it('includes destinationTag when provided', async () => {
      vi.mocked(provider.signAndSubmit).mockResolvedValue({
        tx_blob: 'BLOB',
        hash: 'HASH456',
      })

      await shim.sendPayment({
        amount: '500000',
        destination: 'rDest',
        destinationTag: 42,
      })

      expect(provider.signAndSubmit).toHaveBeenCalledWith({
        TransactionType: 'Payment',
        Destination: 'rDest',
        Amount: '500000',
        DestinationTag: 42,
      })
    })
  })

  describe('signMessage()', () => {
    it('wraps provider signMessage result', async () => {
      vi.mocked(provider.signMessage).mockResolvedValue({
        signature: 'SIG_ABC',
      })

      const result = await shim.signMessage('Hello')
      expect(result).toEqual({ result: { signedMessage: 'SIG_ABC' } })
      expect(provider.signMessage).toHaveBeenCalledWith('Hello')
    })
  })

  describe('signTransaction()', () => {
    it('delegates to provider.signTransaction and wraps result', async () => {
      vi.mocked(provider.signTransaction).mockResolvedValue({
        tx_blob: 'TX_BLOB',
        hash: 'TX_HASH',
      })

      const tx = { TransactionType: 'Payment', Destination: 'rDest', Amount: '100' }
      const result = await shim.signTransaction({ transaction: tx })

      expect(result).toEqual({ result: { signature: 'TX_BLOB' } })
      expect(provider.signTransaction).toHaveBeenCalledWith(tx)
    })
  })

  describe('submitTransaction()', () => {
    it('delegates to provider.signAndSubmit and wraps result', async () => {
      vi.mocked(provider.signAndSubmit).mockResolvedValue({
        tx_blob: 'BLOB',
        hash: 'SUBMIT_HASH',
      })

      const tx = { TransactionType: 'Payment', Destination: 'rDest', Amount: '200' }
      const result = await shim.submitTransaction({ transaction: tx })

      expect(result).toEqual({ result: { hash: 'SUBMIT_HASH' } })
      expect(provider.signAndSubmit).toHaveBeenCalledWith(tx)
    })
  })

  describe('setTrustline()', () => {
    it('creates TrustSet tx and calls signAndSubmit', async () => {
      vi.mocked(provider.signAndSubmit).mockResolvedValue({
        tx_blob: 'TRUST_BLOB',
        hash: 'TRUST_HASH',
      })

      const result = await shim.setTrustline({
        currency: 'USD',
        issuer: 'rIssuer',
        value: '1000',
      })

      expect(result).toEqual({ result: { hash: 'TRUST_HASH' } })
      expect(provider.signAndSubmit).toHaveBeenCalledWith({
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: 'USD',
          issuer: 'rIssuer',
          value: '1000',
        },
      })
    })
  })

  describe('getNFTs()', () => {
    it('returns empty nfts array', async () => {
      const result = await shim.getNFTs()
      expect(result).toEqual({ result: { nfts: [] } })
    })
  })
})
