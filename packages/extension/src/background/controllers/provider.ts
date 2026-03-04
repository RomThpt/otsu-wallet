import type {
  OtsuProviderRequest,
  OtsuProviderResponse,
  SigningRequest,
  DAppPermission,
  WalletSettings,
  SimulationResult,
  RiskWarning,
} from '@otsu/types'
import {
  SIGNING_TIMEOUT_MS,
  NOTIFICATION_WINDOW_WIDTH,
  NOTIFICATION_WINDOW_HEIGHT,
  ErrorCodes,
  OtsuError,
} from '@otsu/constants'
import { TransactionSimulator } from '../services/simulator'
import { RiskScanner } from '../services/risk-scanner'
import type { WalletController } from './wallet'

const PERMISSIONS_STORAGE_KEY = 'otsu-permissions'
const SIGNING_REQUEST_PREFIX = 'otsu-signing:'

interface PendingRequest {
  request: SigningRequest
  resolve: (value: OtsuProviderResponse) => void
  reject: (reason: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

export class ProviderController {
  private pendingRequests = new Map<string, PendingRequest>()
  private permissions = new Map<string, DAppPermission>()
  private simulator = new TransactionSimulator()
  private riskScanner = new RiskScanner()
  private initialized = false

  constructor(private wallet: WalletController) {}

  async initialize(): Promise<void> {
    if (this.initialized) return
    await this.loadPermissions()
    await this.riskScanner.initialize()
    this.initialized = true
  }

  async handleRequest(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    await this.initialize()

    switch (request.method) {
      case 'connect':
        return this.handleConnect(request)
      case 'disconnect':
        return this.handleDisconnect(request)
      case 'getAddress':
        return this.handleGetAddress(request)
      case 'getNetwork':
        return this.handleGetNetwork(request)
      case 'getBalance':
        return this.handleGetBalance(request)
      case 'signTransaction':
        return this.handleSignTransaction(request)
      case 'signAndSubmit':
        return this.handleSignAndSubmit(request)
      case 'signMessage':
        return this.handleSignMessage(request)
      case 'switchNetwork':
        return this.handleSwitchNetwork(request)
      default:
        return { id: request.id, error: `Unknown method: ${request.method}` }
    }
  }

  async handleSigningApproved(requestId: string): Promise<void> {
    const pending = this.pendingRequests.get(requestId)
    if (!pending) return

    clearTimeout(pending.timeoutId)

    try {
      const { request } = pending
      const tx = request.params as Record<string, unknown>
      const sender = this.wallet.getState().activeAccount
      if (!sender) throw new OtsuError(ErrorCodes.SIGNING_ERROR, 'No active account')

      const keyring = this.wallet.getKeyring()
      const client = this.wallet.getClient()

      tx.Account = sender
      const prepared = await client.prepareTransaction(tx)
      const signed = keyring.sign(sender, prepared as never)

      if (request.method === 'signAndSubmit') {
        const result = await client.submitTransaction(signed.tx_blob)
        pending.resolve({
          id: request.id,
          result: {
            tx_blob: signed.tx_blob,
            hash: (result.result.tx_json?.hash as string) ?? signed.hash,
          },
        })
      } else {
        pending.resolve({
          id: request.id,
          result: { tx_blob: signed.tx_blob, hash: signed.hash },
        })
      }
    } catch (error) {
      pending.resolve({
        id: pending.request.id,
        error: (error as Error).message,
      })
    } finally {
      this.pendingRequests.delete(requestId)
      await this.clearSigningRequest(requestId)
    }
  }

  async handleSigningRejected(requestId: string, reason?: string): Promise<void> {
    const pending = this.pendingRequests.get(requestId)
    if (!pending) return

    clearTimeout(pending.timeoutId)
    pending.resolve({
      id: pending.request.id,
      error: reason ?? ErrorCodes.SIGNING_REJECTED,
    })
    this.pendingRequests.delete(requestId)
    await this.clearSigningRequest(requestId)
  }

  async getSigningRequest(requestId: string): Promise<{
    request: SigningRequest
    simulation?: SimulationResult
    warnings?: RiskWarning[]
    settings?: WalletSettings
  } | null> {
    try {
      const result = await chrome.storage.local.get(`${SIGNING_REQUEST_PREFIX}${requestId}`)
      return result[`${SIGNING_REQUEST_PREFIX}${requestId}`] ?? null
    } catch {
      return null
    }
  }

  async getPermissions(): Promise<DAppPermission[]> {
    return [...this.permissions.values()]
  }

  async revokePermission(origin: string): Promise<void> {
    this.permissions.delete(origin)
    await this.persistPermissions()
  }

  async notifyAccountChanged(address: string): Promise<void> {
    await this.broadcastEvent({ type: 'accountChanged', data: address })
  }

  async notifyNetworkChanged(network: string): Promise<void> {
    await this.broadcastEvent({ type: 'networkChanged', data: network })
  }

  // --- Private handlers ---

  private async handleConnect(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const origin = request.origin
    if (!origin) return { id: request.id, error: ErrorCodes.INVALID_PROVIDER_REQUEST }

    // Check if already connected
    const existing = this.permissions.get(origin)
    if (existing) {
      return { id: request.id, result: { address: existing.address } }
    }

    // Open connection approval window
    const signingRequest: SigningRequest = {
      id: request.id,
      origin,
      favicon: request.favicon,
      title: request.title,
      method: 'connect',
      createdAt: Date.now(),
    }

    return this.openSigningWindow(signingRequest, async () => {
      const state = this.wallet.getState()
      const address = state.activeAccount
      if (!address) throw new OtsuError(ErrorCodes.SIGNING_ERROR, 'No active account')

      const permission: DAppPermission = {
        origin,
        favicon: request.favicon,
        title: request.title,
        connectedAt: Date.now(),
        address,
      }
      this.permissions.set(origin, permission)
      await this.persistPermissions()

      return { id: request.id, result: { address } }
    })
  }

  private async handleDisconnect(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const origin = request.origin
    if (origin) {
      this.permissions.delete(origin)
      await this.persistPermissions()
    }
    return { id: request.id, result: true }
  }

  private handleGetAddress(request: OtsuProviderRequest): OtsuProviderResponse {
    const permission = this.requirePermission(request)
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return { id: request.id, result: { address: permission.address } }
  }

  private handleGetNetwork(request: OtsuProviderRequest): OtsuProviderResponse {
    const permission = this.requirePermission(request)
    if (!('address' in permission)) return permission as OtsuProviderResponse
    const state = this.wallet.getState()
    return { id: request.id, result: { network: state.network } }
  }

  private async handleGetBalance(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request)
    if (!('address' in permission)) return permission as OtsuProviderResponse

    try {
      const balance = await this.wallet.getBalance(permission.address)
      return { id: request.id, result: balance }
    } catch (error) {
      return { id: request.id, error: (error as Error).message }
    }
  }

  private async handleSignTransaction(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request)
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return this.initiateSigningFlow(request)
  }

  private async handleSignAndSubmit(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request)
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return this.initiateSigningFlow(request)
  }

  private async handleSignMessage(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request)
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return this.initiateSigningFlow(request)
  }

  private async handleSwitchNetwork(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request)
    if (!('address' in permission)) return permission as OtsuProviderResponse

    const networkId = (request.params as { networkId: string })?.networkId
    if (!networkId) return { id: request.id, error: 'Missing networkId' }

    try {
      await this.wallet.switchNetwork(networkId)
      await this.notifyNetworkChanged(networkId)
      return { id: request.id, result: { network: networkId } }
    } catch (error) {
      return { id: request.id, error: (error as Error).message }
    }
  }

  // --- Signing flow ---

  private async initiateSigningFlow(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const signingRequest: SigningRequest = {
      id: request.id,
      origin: request.origin!,
      favicon: request.favicon,
      title: request.title,
      method: request.method as 'signTransaction' | 'signAndSubmit',
      params: request.params,
      createdAt: Date.now(),
    }

    return this.openSigningWindow(signingRequest)
  }

  private openSigningWindow(
    signingRequest: SigningRequest,
    onApprove?: () => Promise<OtsuProviderResponse>,
  ): Promise<OtsuProviderResponse> {
    return new Promise<OtsuProviderResponse>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(signingRequest.id)
        this.clearSigningRequest(signingRequest.id)
        resolve({
          id: signingRequest.id,
          error: ErrorCodes.SIGNING_TIMEOUT,
        })
      }, SIGNING_TIMEOUT_MS)

      // Store the pending request with custom onApprove if provided
      const pending: PendingRequest = {
        request: signingRequest,
        resolve: onApprove
          ? async (response) => {
              if (!response.error) {
                try {
                  const result = await onApprove()
                  resolve(result)
                } catch (error) {
                  resolve({ id: signingRequest.id, error: (error as Error).message })
                }
              } else {
                resolve(response)
              }
            }
          : resolve,
        reject,
        timeoutId,
      }

      this.pendingRequests.set(signingRequest.id, pending)

      // Run simulation and risk scan for signing requests
      let simulation: SimulationResult | undefined
      let warnings: RiskWarning[] | undefined

      if (signingRequest.method !== 'connect' && signingRequest.params) {
        const tx = signingRequest.params as Record<string, unknown>
        try {
          const balance = await this.wallet.getBalance()
          simulation = this.simulator.simulate(tx, balance.total)
        } catch {
          simulation = {
            success: false,
            balanceChanges: [],
            fee: '0',
            objectsCreated: 0,
            objectsDeleted: 0,
            error: 'Failed to simulate transaction',
          }
        }

        warnings = this.riskScanner.scan({
          tx,
          origin: signingRequest.origin,
        })
      }

      const settings = await this.wallet.getSettings()

      // Persist signing request data to chrome.storage.local for the notification window
      try {
        await chrome.storage.local.set({
          [`${SIGNING_REQUEST_PREFIX}${signingRequest.id}`]: {
            request: signingRequest,
            simulation,
            warnings,
            settings,
          },
        })
      } catch {
        // Storage write failed
      }

      // Open notification window
      try {
        await chrome.windows.create({
          url: chrome.runtime.getURL(
            `notification.html?requestId=${signingRequest.id}`,
          ),
          type: 'popup',
          width: NOTIFICATION_WINDOW_WIDTH,
          height: NOTIFICATION_WINDOW_HEIGHT,
          focused: true,
        })
      } catch (error) {
        clearTimeout(timeoutId)
        this.pendingRequests.delete(signingRequest.id)
        await this.clearSigningRequest(signingRequest.id)
        resolve({
          id: signingRequest.id,
          error: (error as Error).message,
        })
      }
    })
  }

  // --- Permissions ---

  private requirePermission(request: OtsuProviderRequest): DAppPermission | OtsuProviderResponse {
    const origin = request.origin
    if (!origin) return { id: request.id, error: ErrorCodes.INVALID_PROVIDER_REQUEST }

    const permission = this.permissions.get(origin)
    if (!permission) return { id: request.id, error: ErrorCodes.DAPP_NOT_CONNECTED }

    return permission
  }

  private async loadPermissions(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(PERMISSIONS_STORAGE_KEY)
      const stored = result[PERMISSIONS_STORAGE_KEY] as DAppPermission[] | undefined
      if (stored) {
        for (const perm of stored) {
          this.permissions.set(perm.origin, perm)
        }
      }
    } catch {
      // Use empty permissions
    }
  }

  private async persistPermissions(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [PERMISSIONS_STORAGE_KEY]: [...this.permissions.values()],
      })
    } catch {
      // Storage may not be available
    }
  }

  private async clearSigningRequest(requestId: string): Promise<void> {
    try {
      await chrome.storage.local.remove(`${SIGNING_REQUEST_PREFIX}${requestId}`)
    } catch {
      // Ignore
    }
  }

  // --- Broadcasting ---

  private async broadcastEvent(event: { type: string; data?: unknown }): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({})
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'PROVIDER_EVENT',
              payload: { event },
            })
          } catch {
            // Tab may not have content script
          }
        }
      }
    } catch {
      // Tabs API may not be available
    }
  }
}
