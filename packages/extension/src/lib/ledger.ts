import {
  DeviceActionStatus,
  DeviceManagementKitBuilder,
  type DeviceActionState,
  type DeviceManagementKit,
  type DeviceSessionId,
  type DiscoveredDevice,
} from '@ledgerhq/device-management-kit'
import { webHidIdentifier, webHidTransportFactory } from '@ledgerhq/device-transport-kit-web-hid'
import { SignerEthBuilder } from '@ledgerhq/device-signer-kit-ethereum'
import Xrp from '@ledgerhq/hw-app-xrp'
import TransportWebHID from '@ledgerhq/hw-transport-webhid'
import type { HardwareAccountCandidate, HardwareEvmSignature } from '@otsu/types'
import { encodeXrplTransaction, evmGetBytes } from '@otsu/core'

type LedgerEvmAddress = {
  address: `0x${string}`
  publicKey: string
  chainCode?: string
}

let dmk: DeviceManagementKit | null = null
let sessionId: DeviceSessionId | null = null

function assertAccountIndex(accountIndex: number): void {
  if (!Number.isInteger(accountIndex) || accountIndex < 0 || accountIndex > 99) {
    throw new Error('Ledger account index must be between 0 and 99')
  }
}

function ledgerXrpError(cause: unknown): Error {
  const statusCode =
    cause && typeof cause === 'object' && 'statusCode' in cause
      ? Number((cause as { statusCode: unknown }).statusCode)
      : undefined
  if ([0x6e00, 0x6511, 0x650f].includes(statusCode ?? -1)) {
    return new Error('Open the XRP app on your Ledger and try again')
  }
  if (statusCode === 0x6804) return new Error('Unlock your Ledger and try again')
  if (statusCode === 0x6985) return new Error('The request was rejected on your Ledger')
  if (cause instanceof DOMException && cause.name === 'NotFoundError') {
    return new Error('No Ledger device was selected')
  }
  return cause instanceof Error ? cause : new Error(String(cause))
}

async function withLedgerXrpApp<T>(operation: (app: Xrp) => Promise<T>): Promise<T> {
  if (!('hid' in navigator)) {
    throw new Error('Ledger requires WebHID in a Chromium-based browser')
  }
  let transport: Awaited<ReturnType<typeof TransportWebHID.create>> | null = null
  try {
    const connected = await TransportWebHID.create()
    transport = connected
    return await operation(new Xrp(connected))
  } catch (cause) {
    throw ledgerXrpError(cause)
  } finally {
    await transport?.close().catch(() => undefined)
  }
}

function getDmk(): DeviceManagementKit {
  if (!dmk) {
    dmk = new DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build()
  }
  return dmk
}

function firstDiscoveredDevice(sdk: DeviceManagementKit): Promise<DiscoveredDevice> {
  return new Promise((resolve, reject) => {
    let settled = false
    const timeout = window.setTimeout(() => {
      if (!settled) {
        settled = true
        subscription.unsubscribe()
        reject(new Error('No Ledger device was selected'))
      }
    }, 60_000)
    const subscription = sdk.startDiscovering({ transport: webHidIdentifier }).subscribe({
      next: (device) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        subscription.unsubscribe()
        void sdk.stopDiscovering()
        resolve(device)
      },
      error: (error) => {
        if (settled) return
        settled = true
        window.clearTimeout(timeout)
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    })
  })
}

function completedDeviceAction<Output, Error, Intermediate>(action: {
  observable: {
    subscribe(observer: {
      next(state: DeviceActionState<Output, Error, Intermediate>): void
      error(error: unknown): void
    }): { unsubscribe(): void }
  }
  cancel(): void
}): Promise<Output> {
  return new Promise((resolve, reject) => {
    const subscription = action.observable.subscribe({
      next: (state) => {
        if (state.status === DeviceActionStatus.Completed) {
          subscription.unsubscribe()
          resolve(state.output)
        } else if (state.status === DeviceActionStatus.Error) {
          subscription.unsubscribe()
          reject(new Error('Ledger device action failed', { cause: state.error }))
        } else if (state.status === DeviceActionStatus.Stopped) {
          subscription.unsubscribe()
          reject(new Error('Ledger device action was cancelled'))
        }
      },
      error: (error) => {
        subscription.unsubscribe()
        reject(error instanceof Error ? error : new Error(String(error)))
      },
    })
  })
}

async function connectLedger(): Promise<{
  sdk: DeviceManagementKit
  sessionId: DeviceSessionId
  device: DiscoveredDevice
}> {
  if (!('hid' in navigator)) {
    throw new Error('Ledger requires WebHID in a Chromium-based browser')
  }
  const sdk = getDmk()
  const device = await firstDiscoveredDevice(sdk)
  if (sessionId) await sdk.disconnect({ sessionId }).catch(() => undefined)
  sessionId = await sdk.connect({
    device,
    sessionRefresherOptions: { isRefresherDisabled: false },
  })
  return { sdk, sessionId, device }
}

async function disconnectLedger(connection: {
  sdk: DeviceManagementKit
  sessionId: DeviceSessionId
}): Promise<void> {
  await connection.sdk.disconnect({ sessionId: connection.sessionId }).catch(() => undefined)
  if (sessionId === connection.sessionId) sessionId = null
}

export async function discoverLedgerEvmAccount(
  accountIndex = 0,
): Promise<HardwareAccountCandidate> {
  assertAccountIndex(accountIndex)
  const connection = await connectLedger()
  try {
    const signer = new SignerEthBuilder({
      dmk: connection.sdk,
      sessionId: connection.sessionId,
    }).build()
    const path = `44'/60'/${accountIndex}'/0/0`
    const output = await completedDeviceAction<LedgerEvmAddress, unknown, unknown>(
      signer.getAddress(path, { checkOnDevice: true, returnChainCode: false }),
    )
    return {
      provider: 'ledger',
      address: output.address,
      publicKey: output.publicKey,
      derivationPath: `m/${path}`,
      chainType: 'evm',
      index: accountIndex,
      model: connection.device.deviceModel.name,
      label: `Ledger EVM ${accountIndex + 1}`,
    }
  } finally {
    await disconnectLedger(connection)
  }
}

export async function discoverLedgerXrplAccount(
  accountIndex = 0,
): Promise<HardwareAccountCandidate> {
  assertAccountIndex(accountIndex)
  const path = `44'/144'/${accountIndex}'/0/0`
  const account = await withLedgerXrpApp((app) => app.getAddress(path, true, false))
  if (!account.address || !account.publicKey) {
    throw new Error('Ledger did not return an XRP account')
  }
  return {
    provider: 'ledger',
    address: account.address,
    publicKey: account.publicKey,
    derivationPath: `m/${path}`,
    chainType: 'xrpl',
    index: accountIndex,
    label: `Ledger XRP ${accountIndex + 1}`,
  }
}

export async function signLedgerXrplTransaction(params: {
  derivationPath: string
  expectedAddress: string
  transaction: Record<string, unknown>
}): Promise<string> {
  if (params.transaction.Account !== params.expectedAddress) {
    throw new Error('Reviewed XRP transaction does not match the selected Ledger account')
  }
  const path = params.derivationPath.replace(/^m\//, '')
  return withLedgerXrpApp(async (app) => {
    const account = await app.getAddress(path, false, false)
    if (account.address !== params.expectedAddress) {
      throw new Error('Connected Ledger does not match the selected account')
    }
    const unsigned = { ...params.transaction }
    delete unsigned.TxnSignature
    delete unsigned.Signers
    unsigned.SigningPubKey = account.publicKey.toUpperCase()
    const signature = await app.signTransaction(
      path,
      encodeXrplTransaction(unsigned as never).toUpperCase(),
    )
    if (!signature) throw new Error('Ledger did not return an XRP signature')
    return encodeXrplTransaction({
      ...unsigned,
      TxnSignature: signature.toUpperCase(),
    } as never)
  })
}

export async function signLedgerEvmTransaction(params: {
  derivationPath: string
  expectedAddress: string
  unsignedSerialized: string
}): Promise<HardwareEvmSignature> {
  const connection = await connectLedger()
  try {
    const signer = new SignerEthBuilder({
      dmk: connection.sdk,
      sessionId: connection.sessionId,
    }).build()
    const path = params.derivationPath.replace(/^m\//, '')
    const account = await completedDeviceAction<LedgerEvmAddress, unknown, unknown>(
      signer.getAddress(path, { checkOnDevice: false, returnChainCode: false }),
    )
    if (account.address.toLowerCase() !== params.expectedAddress.toLowerCase()) {
      throw new Error('Connected Ledger does not match the selected account')
    }
    return await completedDeviceAction<HardwareEvmSignature, unknown, unknown>(
      signer.signTransaction(path, evmGetBytes(params.unsignedSerialized)),
    )
  } finally {
    await disconnectLedger(connection)
  }
}
