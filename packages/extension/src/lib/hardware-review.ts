import type { HardwareEvmSignature, TransactionReview } from '@otsu/types'

export interface HardwareReviewConfirmation {
  externalSignature?: HardwareEvmSignature
  externalSignedTransaction?: string
}

export async function confirmOnHardware(
  review: TransactionReview,
): Promise<HardwareReviewConfirmation> {
  if (!review.hardwareProvider) return {}
  if (!review.derivationPath) throw new Error('Hardware wallet derivation path is missing')

  if (review.hardwareProvider === 'ledger') {
    if (!__LEDGER_SUPPORTED__) {
      throw new Error('Ledger WebHID is available in the Chromium extension')
    }
    const { signLedgerEvmTransaction, signLedgerXrplTransaction } = await import('@ledger')
    if (review.chainType === 'xrpl') {
      if (!review.deviceTransaction) throw new Error('Ledger transaction data is missing')
      return {
        externalSignedTransaction: await signLedgerXrplTransaction({
          derivationPath: review.derivationPath,
          expectedAddress: review.account,
          transaction: review.deviceTransaction,
        }),
      }
    }
    if (!review.unsignedSerialized) throw new Error('Ledger transaction data is missing')
    return {
      externalSignature: await signLedgerEvmTransaction({
        derivationPath: review.derivationPath,
        expectedAddress: review.account,
        unsignedSerialized: review.unsignedSerialized,
      }),
    }
  }

  const { signTrezorEvmTransaction, signTrezorXrplPayment } = await import('./trezor')
  if (review.chainType === 'xrpl') {
    if (!review.deviceTransaction) throw new Error('Trezor transaction data is missing')
    return {
      externalSignedTransaction: await signTrezorXrplPayment(
        review.derivationPath,
        review.deviceTransaction,
      ),
    }
  }
  if (!review.unsignedSerialized) throw new Error('Trezor transaction data is missing')
  return {
    externalSignature: await signTrezorEvmTransaction(
      review.derivationPath,
      review.unsignedSerialized,
    ),
  }
}
