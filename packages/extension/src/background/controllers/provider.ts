import type {
  OtsuProviderRequest,
  OtsuProviderResponse,
  SigningRequest,
  DAppPermission,
  PermissionScope,
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
  private signingKey: CryptoKey | null = null

  constructor(private wallet: WalletController) {}

  private async getSigningKey(): Promise<CryptoKey> {
    if (!this.signingKey) {
      this.signingKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt',
      ])
    }
    return this.signingKey
  }

  private async encryptSigningData(data: unknown): Promise<string> {
    const key = await this.getSigningKey()
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(ciphertext), iv.length)
    return btoa(String.fromCharCode(...combined))
  }

  private async decryptSigningData<T>(encrypted: string): Promise<T> {
    const key = await this.getSigningKey()
    const combined = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0))
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
    return JSON.parse(new TextDecoder().decode(decrypted)) as T
  }

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
      case 'getNFTs':
        return this.handleGetNFTs(request)
      case 'getAccountOffers':
        return this.handleGetAccountOffers(request)
      case 'getTransactionStatus':
        return this.handleGetTransactionStatus(request)
      case 'getContractInfo':
        return this.handleGetContractInfo(request)
      case 'contractCall':
        return this.handleContractCall(request)
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

      if (request.method === 'connect') {
        pending.resolve({ id: request.id })
        this.pendingRequests.delete(requestId)
        await this.clearSigningRequest(requestId)
        return
      }

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
      const encrypted = result[`${SIGNING_REQUEST_PREFIX}${requestId}`] as string | undefined
      if (!encrypted) return null
      return await this.decryptSigningData(encrypted)
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

      const requestedScopes = (request.params as { scopes?: PermissionScope[] })?.scopes
      const scopes: PermissionScope[] = requestedScopes ?? [
        'read',
        'sign',
        'submit',
        'switchNetwork',
      ]

      const permission: DAppPermission = {
        origin,
        favicon: request.favicon,
        title: request.title,
        connectedAt: Date.now(),
        address,
        scopes,
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
    const permission = this.requirePermission(request, 'read')
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return { id: request.id, result: { address: permission.address } }
  }

  private handleGetNetwork(request: OtsuProviderRequest): OtsuProviderResponse {
    const permission = this.requirePermission(request, 'read')
    if (!('address' in permission)) return permission as OtsuProviderResponse
    const state = this.wallet.getState()
    return { id: request.id, result: { network: state.network } }
  }

  private async handleGetBalance(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'read')
    if (!('address' in permission)) return permission as OtsuProviderResponse

    try {
      const balance = await this.wallet.getBalance(permission.address)
      return { id: request.id, result: balance }
    } catch (error) {
      return { id: request.id, error: (error as Error).message }
    }
  }

  private async handleSignTransaction(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'sign')
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return this.initiateSigningFlow(request)
  }

  private async handleSignAndSubmit(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'submit')
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return this.initiateSigningFlow(request)
  }

  private async handleSignMessage(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'sign')
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return this.initiateSigningFlow(request)
  }

  private async handleSwitchNetwork(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'switchNetwork')
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

  private async handleGetNFTs(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'read')
    if (!('address' in permission)) return permission as OtsuProviderResponse

    try {
      const nfts = await this.wallet.getNFTs()
      return { id: request.id, result: nfts }
    } catch (error) {
      return { id: request.id, error: (error as Error).message }
    }
  }

  private async handleGetAccountOffers(
    request: OtsuProviderRequest,
  ): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'read')
    if (!('address' in permission)) return permission as OtsuProviderResponse

    try {
      const offers = await this.wallet.getAccountOffers()
      return { id: request.id, result: offers }
    } catch (error) {
      return { id: request.id, error: (error as Error).message }
    }
  }

  private async handleGetTransactionStatus(
    request: OtsuProviderRequest,
  ): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'read')
    if (!('address' in permission)) return permission as OtsuProviderResponse

    try {
      const hash = (request.params as { hash: string })?.hash
      if (!hash) return { id: request.id, error: 'Missing transaction hash' }
      const status = await this.wallet.getTransactionStatus(hash)
      return { id: request.id, result: status }
    } catch (error) {
      return { id: request.id, error: (error as Error).message }
    }
  }

  private async handleGetContractInfo(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'read')
    if (!('address' in permission)) return permission as OtsuProviderResponse

    try {
      const address = (request.params as { contractAddress: string })?.contractAddress
      if (!address) return { id: request.id, error: 'Missing contractAddress' }
      const info = await this.wallet.getContractInfo(address)
      return { id: request.id, result: info }
    } catch (error) {
      return { id: request.id, error: (error as Error).message }
    }
  }

  private async handleContractCall(request: OtsuProviderRequest): Promise<OtsuProviderResponse> {
    const permission = this.requirePermission(request, 'sign')
    if (!('address' in permission)) return permission as OtsuProviderResponse
    return this.initiateSigningFlow(request)
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

      // Persist encrypted signing request data for the notification window
      try {
        const encrypted = await this.encryptSigningData({
          request: signingRequest,
          simulation,
          warnings,
          settings,
        })
        await chrome.storage.local.set({
          [`${SIGNING_REQUEST_PREFIX}${signingRequest.id}`]: encrypted,
        })
      } catch {
        // Storage write failed
      }

      // Open notification window
      try {
        await chrome.windows.create({
          url: chrome.runtime.getURL(`notification.html?requestId=${signingRequest.id}`),
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

  private requirePermission(
    request: OtsuProviderRequest,
    scope?: PermissionScope,
  ): DAppPermission | OtsuProviderResponse {
    const origin = request.origin
    if (!origin) return { id: request.id, error: ErrorCodes.INVALID_PROVIDER_REQUEST }

    const permission = this.permissions.get(origin)
    if (!permission) return { id: request.id, error: ErrorCodes.DAPP_NOT_CONNECTED }

    if (scope) {
      const grantedScopes = permission.scopes ?? ['read', 'sign', 'submit', 'switchNetwork']
      if (!grantedScopes.includes(scope)) {
        return { id: request.id, error: `Permission scope '${scope}' not granted` }
      }
    }

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
