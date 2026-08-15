import { describe, expect, it } from 'vitest'
import type { Account, VaultAccount } from '@otsu/types'
import { deriveEvmAccount, EvmKeyring, EvmTransaction, Keyring } from '@otsu/core'
import { AccountTransactionSigner, type PreparedEvmTransaction } from './account-signer'

const MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('AccountTransactionSigner', () => {
  const transaction: PreparedEvmTransaction = {
    type: 2,
    to: '0x1111111111111111111111111111111111111111',
    value: 1n,
    data: '0x',
    gasLimit: 21_000n,
    maxFeePerGas: 2_000_000_000n,
    maxPriorityFeePerGas: 1_000_000_000n,
    nonce: 0,
    chainId: 1n,
  }

  async function fixture() {
    const derived = deriveEvmAccount(MNEMONIC, 0)
    const softwareKeyring = new EvmKeyring()
    softwareKeyring.load([
      {
        address: derived.address,
        privateKey: derived.privateKey,
        publicKey: derived.publicKey,
        derivationPath: derived.derivationPath,
        type: 'hd',
        index: 0,
        chainType: 'evm',
      } satisfies VaultAccount,
    ])
    const signed = EvmTransaction.from(
      await softwareKeyring.signTransaction(derived.address, transaction),
    )
    const signature = signed.signature!
    const account: Account = {
      address: derived.address,
      label: 'Hardware account',
      type: 'hardware',
      derivationPath: derived.derivationPath,
      publicKey: derived.publicKey,
      index: 0,
      chainType: 'evm',
      hardware: { provider: 'ledger', verifiedAt: Date.now() },
    }
    return {
      account,
      signature: { r: signature.r, s: signature.s, v: signature.v },
    }
  }

  it('serializes a Ledger signature only when it recovers the selected account', async () => {
    const { account, signature } = await fixture()
    const signer = new AccountTransactionSigner(new Keyring(), new EvmKeyring())

    const serialized = await signer.signEvm(account, transaction, signature)

    expect(EvmTransaction.from(serialized).from).toBe(account.address)
  })

  it('rejects a signature produced by a different hardware account', async () => {
    const { account, signature } = await fixture()
    const signer = new AccountTransactionSigner(new Keyring(), new EvmKeyring())

    await expect(
      signer.signEvm(
        { ...account, address: '0x2222222222222222222222222222222222222222' },
        transaction,
        signature,
      ),
    ).rejects.toThrow('unexpected account')
  })

  it('validates an externally produced Trezor EVM signature', async () => {
    const { account, signature } = await fixture()
    const signer = new AccountTransactionSigner(new Keyring(), new EvmKeyring())
    account.hardware = { provider: 'trezor', verifiedAt: Date.now() }

    const serialized = await signer.signEvm(account, transaction, signature)

    expect(EvmTransaction.from(serialized).from).toBe(account.address)
  })

  it('requires XRPL hardware interaction outside the background signer', async () => {
    const { account } = await fixture()
    const signer = new AccountTransactionSigner(new Keyring(), new EvmKeyring())
    account.chainType = 'xrpl'

    await expect(signer.signXrpl(account, { TransactionType: 'Payment' })).rejects.toThrow(
      'Confirm',
    )
  })
})
