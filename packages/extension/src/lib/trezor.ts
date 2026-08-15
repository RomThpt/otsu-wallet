import type { HardwareAccountCandidate } from '@otsu/types'
import { EvmTransaction } from '@otsu/core'

const TREZOR_MANIFEST = {
  appName: 'Otsu Wallet',
  appUrl: 'https://otsu.dev',
  email: 'support@otsu.dev',
}

type TrezorConnectModule = typeof import('@trezor/connect-webextension')

let connectPromise: Promise<TrezorConnectModule['default']> | null = null

function responseError(payload: unknown): string {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    return String((payload as { error: unknown }).error)
  }
  return 'Trezor did not complete the request'
}

async function getTrezorConnect(): Promise<TrezorConnectModule['default']> {
  if (!connectPromise) {
    connectPromise = import('@trezor/connect-webextension').then(async (module) => {
      await module.default.init({
        manifest: TREZOR_MANIFEST,
        coreMode: 'popup',
        lazyLoad: true,
        _extendWebextensionLifetime: true,
      })
      return module.default
    })
  }
  return connectPromise
}

export async function discoverTrezorAccounts(
  accountIndex = 0,
): Promise<HardwareAccountCandidate[]> {
  if (!Number.isInteger(accountIndex) || accountIndex < 0 || accountIndex > 99) {
    throw new Error('Trezor account index must be between 0 and 99')
  }
  const connect = await getTrezorConnect()
  const features = await connect.getFeatures({})
  if (!features.success) throw new Error(responseError(features.payload))

  const xrplPath = `m/44'/144'/${accountIndex}'/0/0`
  const evmPath = `m/44'/60'/${accountIndex}'/0/0`
  const xrpl = await connect.rippleGetAddress({ path: xrplPath, showOnTrezor: true })
  if (!xrpl.success) throw new Error(responseError(xrpl.payload))
  const evm = await connect.ethereumGetAddress({ path: evmPath, showOnTrezor: true })
  if (!evm.success) throw new Error(responseError(evm.payload))
  const evmPublicKey = await connect.ethereumGetPublicKey({ path: evmPath, showOnTrezor: false })

  const deviceId = features.payload.device_id ?? undefined
  const model = features.payload.model || undefined
  return [
    {
      provider: 'trezor',
      address: xrpl.payload.address,
      derivationPath: xrpl.payload.serializedPath,
      chainType: 'xrpl',
      index: accountIndex,
      deviceId,
      model,
      label: `Trezor XRP ${accountIndex + 1}`,
    },
    {
      provider: 'trezor',
      address: evm.payload.address,
      publicKey: evmPublicKey.success ? evmPublicKey.payload.publicKey : undefined,
      derivationPath: evm.payload.serializedPath,
      chainType: 'evm',
      index: accountIndex,
      deviceId,
      model,
      label: `Trezor EVM ${accountIndex + 1}`,
    },
  ]
}

export async function signTrezorXrplPayment(
  derivationPath: string,
  transaction: Record<string, unknown>,
): Promise<string> {
  if (transaction.TransactionType !== 'Payment' || typeof transaction.Amount !== 'string') {
    throw new Error('Trezor currently supports native XRP Payment transactions only')
  }
  if (Array.isArray(transaction.Memos) && transaction.Memos.length > 0) {
    throw new Error('Trezor XRP payments with memos are not supported yet')
  }
  if (transaction.SourceTag !== undefined) {
    throw new Error('Trezor XRP payments with a source tag are not supported yet')
  }
  if (
    typeof transaction.Destination !== 'string' ||
    typeof transaction.Fee !== 'string' ||
    typeof transaction.Sequence !== 'number'
  ) {
    throw new Error('The prepared XRP payment is missing required ledger fields')
  }

  const connect = await getTrezorConnect()
  const result = await connect.rippleSignTransaction({
    path: derivationPath,
    transaction: {
      fee: transaction.Fee,
      flags: typeof transaction.Flags === 'number' ? transaction.Flags : undefined,
      sequence: transaction.Sequence,
      maxLedgerVersion:
        typeof transaction.LastLedgerSequence === 'number'
          ? transaction.LastLedgerSequence
          : undefined,
      payment: {
        amount: transaction.Amount,
        destination: transaction.Destination,
        destinationTag:
          typeof transaction.DestinationTag === 'number' ? transaction.DestinationTag : undefined,
      },
    },
  })
  if (!result.success) throw new Error(responseError(result.payload))
  return result.payload.serializedTx
}

export async function signTrezorEvmTransaction(
  derivationPath: string,
  unsignedSerialized: string,
): Promise<{ r: string; s: string; v: string }> {
  const transaction = EvmTransaction.from(unsignedSerialized)
  if (transaction.gasLimit <= 0n || transaction.chainId <= 0n) {
    throw new Error('The prepared EVM transaction is missing nonce, gas limit, or chain ID')
  }
  if (transaction.maxFeePerGas === null && transaction.gasPrice === null) {
    throw new Error('The prepared EVM transaction is missing fee data')
  }
  const connect = await getTrezorConnect()
  const common = {
    to: transaction.to ?? null,
    value: `0x${(transaction.value ?? 0n).toString(16)}`,
    data: transaction.data ?? '0x',
    gasLimit: `0x${transaction.gasLimit.toString(16)}`,
    nonce: `0x${transaction.nonce.toString(16)}`,
    chainId: Number(transaction.chainId),
  }
  const trezorTransaction =
    transaction.maxFeePerGas !== null
      ? {
          ...common,
          maxFeePerGas: `0x${transaction.maxFeePerGas.toString(16)}`,
          maxPriorityFeePerGas: `0x${(transaction.maxPriorityFeePerGas ?? 0n).toString(16)}`,
        }
      : {
          ...common,
          gasPrice: `0x${transaction.gasPrice!.toString(16)}`,
        }
  const result = await connect.ethereumSignTransaction({
    path: derivationPath,
    transaction: trezorTransaction,
  })
  if (!result.success) throw new Error(responseError(result.payload))
  return {
    r: result.payload.r,
    s: result.payload.s,
    v: result.payload.v,
  }
}
