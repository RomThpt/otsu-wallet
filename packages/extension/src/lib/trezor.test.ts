import { describe, expect, it } from 'vitest'

import { signTrezorXrplPayment } from './trezor'

const preparedPayment = {
  TransactionType: 'Payment',
  Account: 'rSender',
  Destination: 'rDestination',
  Amount: '1000000',
  Fee: '12',
  Sequence: 1,
  LastLedgerSequence: 100,
}

describe('Trezor XRP payment constraints', () => {
  it('rejects memos before requesting a device signature', async () => {
    await expect(
      signTrezorXrplPayment("m/44'/144'/0'/0/0", {
        ...preparedPayment,
        Memos: [{ Memo: { MemoData: '68656C6C6F' } }],
      }),
    ).rejects.toThrow('with memos are not supported')
  })

  it('rejects source tags before requesting a device signature', async () => {
    await expect(
      signTrezorXrplPayment("m/44'/144'/0'/0/0", {
        ...preparedPayment,
        SourceTag: 123,
      }),
    ).rejects.toThrow('with a source tag are not supported')
  })
})
