import { describe, expect, it, vi } from 'vitest'
import type { DAppPermission, OtsuProviderRequest, OtsuProviderResponse } from '@otsu/types'
import { ProviderController } from './provider'
import type { WalletController } from './wallet'

Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: {
      local: {
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
    },
    runtime: { getURL: vi.fn((path: string) => `chrome-extension://otsu/${path}`) },
    windows: { create: vi.fn().mockResolvedValue({ id: 1 }) },
  },
  configurable: true,
})

describe('ProviderController signing context', () => {
  it('rejects a pending request after the active account changes', async () => {
    const signMessage = vi.fn()
    const wallet = {
      getState: vi.fn().mockReturnValue({
        activeAccount: 'rDifferentAccount',
        network: 'testnet',
        locked: false,
      }),
      getKeyring: vi.fn().mockReturnValue({ signMessage }),
    } as unknown as WalletController
    const controller = new ProviderController(wallet)
    const resolve = vi.fn<(value: OtsuProviderResponse) => void>()
    const timeoutId = setTimeout(() => undefined, 60_000)
    const internals = controller as unknown as {
      pendingRequests: Map<string, Record<string, unknown>>
    }
    internals.pendingRequests.set('request-1', {
      request: {
        id: 'request-1',
        origin: 'https://example.test',
        method: 'signMessage',
        params: { message: 'hello' },
        createdAt: Date.now(),
      },
      resolve,
      reject: vi.fn(),
      timeoutId,
      expectedAccount: 'rPermissionBoundAccount',
      expectedNetwork: 'testnet',
    })

    await expect(controller.handleSigningApproved('request-1')).resolves.toBe(true)
    expect(resolve).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('Account or network changed') }),
    )
    expect(signMessage).not.toHaveBeenCalled()
  })

  it('builds, simulates, and submits provider contract calls through the approval flow', async () => {
    const preparedTransaction = {
      TransactionType: 'ContractCall',
      Account: 'rPermissionBoundAccount',
      Destination: 'rContractAddress',
      ContractFunction: 'transfer',
      Fee: '12',
      Sequence: 1,
    }
    const prepareExternalXrplTransaction = vi.fn().mockResolvedValue({
      transaction: preparedTransaction,
      simulation: { success: true, balanceChanges: [], fee: '0.000012' },
    })
    const signExternalXrplTransaction = vi.fn().mockResolvedValue({
      txBlob: 'SIGNED_CONTRACT_CALL',
      hash: 'CONTRACT_CALL_HASH',
    })
    const wallet = {
      getState: vi.fn().mockReturnValue({
        activeAccount: 'rPermissionBoundAccount',
        network: 'testnet',
        locked: false,
        accounts: [{ address: 'rPermissionBoundAccount', type: 'imported', chainType: 'xrpl' }],
      }),
      getSigningContextVersion: vi.fn().mockReturnValue(0),
      getKeyring: vi.fn().mockReturnValue({}),
      prepareExternalXrplTransaction,
      signExternalXrplTransaction,
      getSettings: vi.fn().mockResolvedValue({}),
    } as unknown as WalletController
    const controller = new ProviderController(wallet)
    const permission: DAppPermission = {
      origin: 'https://example.test',
      connectedAt: Date.now(),
      address: 'rPermissionBoundAccount',
      scopes: ['contractCall'],
    }
    const internals = controller as unknown as {
      permissions: Map<string, DAppPermission>
      initiateSigningFlow: (request: OtsuProviderRequest) => Promise<OtsuProviderResponse>
    }
    internals.permissions.set(permission.origin, permission)
    const request: OtsuProviderRequest = {
      id: 'contract-call-1',
      origin: permission.origin,
      method: 'contractCall',
      params: {
        contractAddress: 'rContractAddress',
        functionName: 'transfer',
      },
    }

    const response = internals.initiateSigningFlow(request)
    await vi.waitFor(() => expect(prepareExternalXrplTransaction).toHaveBeenCalledOnce())
    await controller.handleSigningApproved(request.id)

    await expect(response).resolves.toEqual({
      id: request.id,
      result: { tx_blob: 'SIGNED_CONTRACT_CALL', hash: 'CONTRACT_CALL_HASH' },
    })
    expect(prepareExternalXrplTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        TransactionType: 'ContractCall',
        Account: permission.address,
        Destination: 'rContractAddress',
        ContractFunction: 'transfer',
      }),
      permission.address,
    )
    expect(signExternalXrplTransaction).toHaveBeenCalledWith(preparedTransaction, true)
  })

  it('rejects hardware dApp signing before opening an approval window', async () => {
    const wallet = {
      getState: vi.fn().mockReturnValue({
        activeAccount: 'rHardwareAccount',
        network: 'testnet',
        locked: false,
        accounts: [{ address: 'rHardwareAccount', type: 'hardware', chainType: 'xrpl' }],
      }),
    } as unknown as WalletController
    const controller = new ProviderController(wallet)
    const permission: DAppPermission = {
      origin: 'https://hardware.example',
      connectedAt: Date.now(),
      address: 'rHardwareAccount',
      scopes: ['sign'],
    }
    const internals = controller as unknown as {
      permissions: Map<string, DAppPermission>
      initiateSigningFlow: (request: OtsuProviderRequest) => Promise<OtsuProviderResponse>
    }
    internals.permissions.set(permission.origin, permission)

    await expect(
      internals.initiateSigningFlow({
        id: 'hardware-sign-1',
        origin: permission.origin,
        method: 'signTransaction',
        params: { TransactionType: 'Payment' },
      }),
    ).resolves.toEqual({
      id: 'hardware-sign-1',
      error:
        'Hardware wallet signing is not available for dApp requests yet. Use the Otsu transaction screen.',
    })
    expect(chrome.windows.create).not.toHaveBeenCalled()
  })
})
