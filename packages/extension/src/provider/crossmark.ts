import type { OtsuProvider } from './otsu'

export function createCrossmarkShim(provider: OtsuProvider) {
  const sdk = {
    async signInAndWait() {
      const result = await provider.connect()
      return { response: { data: { address: result.address } } }
    },

    async signAndWait(tx: Record<string, unknown>) {
      const result = await provider.signTransaction(tx)
      return { response: { data: { tx_blob: result.tx_blob, hash: result.hash } } }
    },

    async signAndSubmitAndWait(tx: Record<string, unknown>) {
      const result = await provider.signAndSubmit(tx)
      return { response: { data: { tx_blob: result.tx_blob, hash: result.hash } } }
    },

    methods: {
      signInAndWait: (..._args: unknown[]) => sdk.signInAndWait(),
      signAndWait: (tx: Record<string, unknown>) => sdk.signAndWait(tx),
      signAndSubmitAndWait: (tx: Record<string, unknown>) =>
        sdk.signAndSubmitAndWait(tx),
    },
  }

  return sdk
}
