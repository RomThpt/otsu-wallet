import type { Account } from '@otsu/types'
import { EvmKeyring, EvmSignature, EvmTransaction, Keyring } from '@otsu/core'

export interface PreparedEvmTransaction {
  type?: number
  to: string | null
  value: bigint
  data: string
  gasLimit: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce: number
  chainId: bigint
}

export interface HardwareEvmSignature {
  r: string
  s: string
  v: number | string
}

export interface TransactionSigner {
  signXrpl(account: Account, transaction: Record<string, unknown>): Promise<string>
  signEvm(
    account: Account,
    transaction: PreparedEvmTransaction,
    externalSignature?: HardwareEvmSignature,
  ): Promise<string>
}

function serializeEvmSignature(
  transaction: PreparedEvmTransaction,
  signature: HardwareEvmSignature,
  expectedAddress: string,
): string {
  const signed = EvmTransaction.from(transaction)
  signed.signature = EvmSignature.from({
    r: signature.r,
    s: signature.s,
    v: Number(signature.v),
  })
  if (signed.from?.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error('Hardware wallet signed with an unexpected account')
  }
  return signed.serialized
}

export class AccountTransactionSigner implements TransactionSigner {
  constructor(
    private readonly xrplKeyring: Keyring,
    private readonly evmKeyring: EvmKeyring,
  ) {}

  async signXrpl(account: Account, transaction: Record<string, unknown>): Promise<string> {
    if (account.type !== 'hardware') {
      return this.xrplKeyring.sign(account.address, transaction as never).tx_blob
    }
    throw new Error('Confirm this transaction on the connected hardware wallet')
  }

  async signEvm(
    account: Account,
    transaction: PreparedEvmTransaction,
    externalSignature?: HardwareEvmSignature,
  ): Promise<string> {
    if (account.type !== 'hardware') {
      return this.evmKeyring.signTransaction(account.address, transaction)
    }
    if (!account.derivationPath || !account.hardware) {
      throw new Error('Hardware account metadata is incomplete')
    }
    if (!externalSignature) {
      throw new Error(`Confirm this transaction on your ${account.hardware.provider} device`)
    }
    return serializeEvmSignature(transaction, externalSignature, account.address)
  }
}
