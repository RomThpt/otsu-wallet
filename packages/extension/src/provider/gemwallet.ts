import type { OtsuProvider } from './otsu'

export function createGemWalletShim(provider: OtsuProvider) {
  return {
    isInstalled: async () => ({ result: { isInstalled: true } }),

    getAddress: async () => {
      const { address } = await provider.getAddress()
      return { result: { address } }
    },

    getPublicKey: async () => {
      // Not directly supported, return address as fallback
      const { address } = await provider.getAddress()
      return { result: { publicKey: address } }
    },

    getNetwork: async () => {
      const { network } = await provider.getNetwork()
      return { result: { network } }
    },

    sendPayment: async (payment: {
      amount: string
      destination: string
      destinationTag?: number
    }) => {
      const tx: Record<string, unknown> = {
        TransactionType: 'Payment',
        Destination: payment.destination,
        Amount: payment.amount,
      }
      if (payment.destinationTag !== undefined) {
        tx.DestinationTag = payment.destinationTag
      }
      const result = await provider.signAndSubmit(tx)
      return { result: { hash: result.hash } }
    },

    signMessage: async (message: string) => {
      const result = await provider.signMessage(message)
      return { result: { signedMessage: result.signature } }
    },

    signTransaction: async (transaction: {
      transaction: Record<string, unknown>
    }) => {
      const result = await provider.signTransaction(transaction.transaction)
      return { result: { signature: result.tx_blob } }
    },

    submitTransaction: async (transaction: {
      transaction: Record<string, unknown>
    }) => {
      const result = await provider.signAndSubmit(transaction.transaction)
      return { result: { hash: result.hash } }
    },

    setTrustline: async (trustline: {
      currency: string
      issuer: string
      value: string
    }) => {
      const tx: Record<string, unknown> = {
        TransactionType: 'TrustSet',
        LimitAmount: {
          currency: trustline.currency,
          issuer: trustline.issuer,
          value: trustline.value,
        },
      }
      const result = await provider.signAndSubmit(tx)
      return { result: { hash: result.hash } }
    },

    getNFTs: async () => {
      // Not supported
      return { result: { nfts: [] } }
    },
  }
}
