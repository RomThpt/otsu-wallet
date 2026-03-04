type EventCallback = (data: unknown) => void

export class OtsuProvider {
  readonly isOtsu = true
  private _connected = false
  private _listeners = new Map<string, Set<EventCallback>>()
  private _pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >()

  constructor() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return

      if (event.data?.type === 'OTSU_PROVIDER_RESPONSE') {
        const { id, result, error } = event.data
        const pending = this._pendingRequests.get(id)
        if (pending) {
          this._pendingRequests.delete(id)
          if (error) {
            pending.reject(new Error(error))
          } else {
            pending.resolve(result)
          }
        }
      }

      if (event.data?.type === 'OTSU_PROVIDER_EVENT') {
        const providerEvent = event.data.event
        if (providerEvent?.type) {
          this._emit(providerEvent.type, providerEvent.data)

          if (providerEvent.type === 'connected') this._connected = true
          if (providerEvent.type === 'disconnected') this._connected = false
        }
      }
    })
  }

  isConnected(): boolean {
    return this._connected
  }

  async connect(params?: { scopes?: string[] }): Promise<{ address: string }> {
    const result = (await this._sendRequest('connect', params)) as { address: string }
    this._connected = true
    return result
  }

  async disconnect(): Promise<void> {
    await this._sendRequest('disconnect')
    this._connected = false
  }

  async getAddress(): Promise<{ address: string }> {
    return this._sendRequest('getAddress') as Promise<{ address: string }>
  }

  async getNetwork(): Promise<{ network: string }> {
    return this._sendRequest('getNetwork') as Promise<{ network: string }>
  }

  async getBalance(): Promise<{
    available: string
    total: string
    reserved: string
  }> {
    return this._sendRequest('getBalance') as Promise<{
      available: string
      total: string
      reserved: string
    }>
  }

  async signTransaction(tx: Record<string, unknown>): Promise<{ tx_blob: string; hash: string }> {
    return this._sendRequest('signTransaction', tx) as Promise<{
      tx_blob: string
      hash: string
    }>
  }

  async signAndSubmit(tx: Record<string, unknown>): Promise<{ tx_blob: string; hash: string }> {
    return this._sendRequest('signAndSubmit', tx) as Promise<{
      tx_blob: string
      hash: string
    }>
  }

  async signMessage(message: string): Promise<{ signature: string }> {
    return this._sendRequest('signMessage', { message }) as Promise<{
      signature: string
    }>
  }

  async switchNetwork(networkId: string): Promise<{ network: string }> {
    return this._sendRequest('switchNetwork', { networkId }) as Promise<{
      network: string
    }>
  }

  async getNFTs(): Promise<unknown[]> {
    return this._sendRequest('getNFTs') as Promise<unknown[]>
  }

  async getAccountOffers(): Promise<unknown[]> {
    return this._sendRequest('getAccountOffers') as Promise<unknown[]>
  }

  async getTransactionStatus(hash: string): Promise<{
    hash: string
    validated: boolean
    result: string
    ledgerIndex: number
  }> {
    return this._sendRequest('getTransactionStatus', { hash }) as Promise<{
      hash: string
      validated: boolean
      result: string
      ledgerIndex: number
    }>
  }

  async getContractInfo(contractAddress: string): Promise<unknown> {
    return this._sendRequest('getContractInfo', { contractAddress })
  }

  async contractCall(params: {
    contractAddress: string
    functionName: string
    parameters?: Array<{ sType: string; value: string; flags: number }>
    fee?: string
  }): Promise<{ tx_blob: string; hash: string }> {
    return this._sendRequest('contractCall', params) as Promise<{
      tx_blob: string
      hash: string
    }>
  }

  on(event: string, callback: EventCallback): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback): void {
    this._listeners.get(event)?.delete(callback)
  }

  private _emit(event: string, data: unknown): void {
    const callbacks = this._listeners.get(event)
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(data)
        } catch {
          /* ignore listener errors */
        }
      }
    }
  }

  private _sendRequest(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID()
      this._pendingRequests.set(id, { resolve, reject })

      window.postMessage(
        {
          type: 'OTSU_PROVIDER_REQUEST',
          request: { id, method, params },
        },
        '*',
      )
    })
  }
}
