type EventCallback = (...args: unknown[]) => void

interface JsonRpcRequest {
  method: string
  params?: unknown[]
}

class OtsuEvmProvider {
  readonly isOtsu = true
  readonly isMetaMask = false
  private _chainId: string | null = null
  private _accounts: string[] = []
  private _listeners = new Map<string, Set<EventCallback>>()
  private _pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >()

  constructor() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return

      if (event.data?.type === 'OTSU_EVM_PROVIDER_RESPONSE') {
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

      if (event.data?.type === 'OTSU_EVM_PROVIDER_EVENT') {
        const { event: eventName, data } = event.data
        this._emit(eventName, data)

        if (eventName === 'chainChanged') {
          this._chainId = data as string
        }
        if (eventName === 'accountsChanged') {
          this._accounts = data as string[]
        }
      }
    })
  }

  async request(req: JsonRpcRequest): Promise<unknown> {
    switch (req.method) {
      case 'eth_chainId':
        return this._chainId
      case 'eth_accounts':
        return this._accounts
      case 'eth_requestAccounts': {
        const accounts = (await this._sendToBackground(
          'eth_requestAccounts',
          req.params,
        )) as string[]
        this._accounts = accounts
        return accounts
      }
      case 'eth_sendTransaction':
      case 'personal_sign':
      case 'eth_signTypedData_v4':
      case 'eth_getBalance':
      case 'eth_blockNumber':
      case 'eth_getTransactionReceipt':
      case 'eth_estimateGas':
      case 'eth_call':
      case 'eth_gasPrice':
      case 'net_version':
        return this._sendToBackground(req.method, req.params)
      default:
        return this._sendToBackground(req.method, req.params)
    }
  }

  on(event: string, callback: EventCallback): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(callback)
    return this
  }

  removeListener(event: string, callback: EventCallback): this {
    this._listeners.get(event)?.delete(callback)
    return this
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this._listeners.delete(event)
    } else {
      this._listeners.clear()
    }
    return this
  }

  private _emit(event: string, data: unknown): void {
    const listeners = this._listeners.get(event)
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data)
        } catch {
          // listener error
        }
      }
    }
  }

  private _sendToBackground(method: string, params?: unknown[]): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = `evm-${Date.now()}-${Math.random().toString(36).slice(2)}`
      this._pendingRequests.set(id, { resolve, reject })

      window.postMessage(
        {
          type: 'OTSU_EVM_PROVIDER_REQUEST',
          id,
          method,
          params,
        },
        '*',
      )

      setTimeout(() => {
        if (this._pendingRequests.has(id)) {
          this._pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 30000)
    })
  }
}

// Only inject when on an EVM network
// The content script will set this flag
if ((window as unknown as Record<string, unknown>).__OTSU_EVM_ENABLED__) {
  const provider = new OtsuEvmProvider()

  Object.defineProperty(window, 'ethereum', {
    value: provider,
    writable: false,
    configurable: true,
  })
}
