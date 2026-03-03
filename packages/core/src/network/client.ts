import { Client } from 'xrpl'
import type { SubmitResponse } from 'xrpl'
import { NETWORKS, RESERVES, OtsuError, ErrorCodes } from '@otsu/constants'
import type { AccountInfo, BalanceInfo, NetworkConfig } from '@otsu/types'
import { RateLimiter } from './rate-limiter'

const MAX_RECONNECT_ATTEMPTS = 5
const BASE_RECONNECT_DELAY_MS = 1000

export class XrplClient {
  private client: Client | null = null
  private networkConfig: NetworkConfig
  private reconnectAttempts = 0
  private rateLimiter = new RateLimiter({ maxTokens: 10, refillRate: 5 })

  constructor(networkId: string = 'testnet') {
    this.networkConfig = NETWORKS[networkId] ?? NETWORKS.testnet
  }

  get isConnected(): boolean {
    return this.client?.isConnected() ?? false
  }

  get network(): NetworkConfig {
    return this.networkConfig
  }

  async connect(): Promise<void> {
    if (this.client?.isConnected()) return

    this.client = new Client(this.networkConfig.url)

    this.client.on('disconnected', () => {
      this.handleDisconnect()
    })

    await this.client.connect()
    this.reconnectAttempts = 0
  }

  async disconnect(): Promise<void> {
    if (this.client?.isConnected()) {
      await this.client.disconnect()
    }
    this.client = null
  }

  async switchNetwork(networkId: string): Promise<void> {
    await this.disconnect()
    this.networkConfig = NETWORKS[networkId] ?? NETWORKS.testnet
    this.reconnectAttempts = 0
  }

  async switchToConfig(config: NetworkConfig): Promise<void> {
    await this.disconnect()
    this.networkConfig = config
    this.reconnectAttempts = 0
  }

  async getAccountInfo(address: string): Promise<AccountInfo> {
    await this.ensureConnected()
    await this.rateLimiter.consume()

    try {
      const response = await this.client!.request({
        command: 'account_info',
        account: address,
        ledger_index: 'validated',
      })

      const accountData = response.result.account_data

      return {
        address,
        balance: accountData.Balance as string,
        sequence: accountData.Sequence as number,
        ownerCount: accountData.OwnerCount as number,
        isActivated: true,
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('actNotFound')) {
        return {
          address,
          balance: '0',
          sequence: 0,
          ownerCount: 0,
          isActivated: false,
        }
      }
      throw new OtsuError(ErrorCodes.NETWORK_ERROR, (error as Error).message)
    }
  }

  async getBalance(address: string): Promise<BalanceInfo> {
    const info = await this.getAccountInfo(address)
    const totalDrops = BigInt(info.balance)
    const baseReserve = BigInt(RESERVES.BASE_RESERVE)
    const ownerReserve = BigInt(RESERVES.OWNER_RESERVE) * BigInt(info.ownerCount)
    const reserved = info.isActivated ? baseReserve + ownerReserve : BigInt(0)
    const available = totalDrops > reserved ? totalDrops - reserved : BigInt(0)

    return {
      total: info.balance,
      available: available.toString(),
      reserved: reserved.toString(),
      baseReserve: RESERVES.BASE_RESERVE.toString(),
      ownerReserve: (BigInt(RESERVES.OWNER_RESERVE) * BigInt(info.ownerCount)).toString(),
      ownerCount: info.ownerCount,
    }
  }

  async submitTransaction(txBlob: string): Promise<SubmitResponse> {
    await this.ensureConnected()
    await this.rateLimiter.consume()

    const response = await this.client!.request({
      command: 'submit',
      tx_blob: txBlob,
    })

    return response as SubmitResponse
  }

  async prepareTransaction(transaction: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.ensureConnected()
    await this.rateLimiter.consume()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.client!.autofill(transaction as any)
  }

  async getAccountLines(address: string): Promise<Record<string, unknown>[]> {
    await this.ensureConnected()
    await this.rateLimiter.consume()

    try {
      const response = await this.client!.request({
        command: 'account_lines',
        account: address,
        ledger_index: 'validated',
      })
      return (response.result as Record<string, unknown>).lines as Record<string, unknown>[]
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('actNotFound')) {
        return []
      }
      throw new OtsuError(ErrorCodes.NETWORK_ERROR, (error as Error).message)
    }
  }

  async getAccountTransactions(
    address: string,
    marker?: unknown,
    limit = 20,
  ): Promise<{ transactions: Record<string, unknown>[]; marker?: unknown }> {
    await this.ensureConnected()

    try {
      await this.rateLimiter.consume()

      const request: Record<string, unknown> = {
        command: 'account_tx',
        account: address,
        ledger_index_min: -1,
        ledger_index_max: -1,
        limit,
      }

      if (marker) {
        request.marker = marker
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await this.client!.request(request as any)
      const result = response.result as Record<string, unknown>

      return {
        transactions: (result.transactions ?? []) as Record<string, unknown>[],
        marker: result.marker,
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('actNotFound')) {
        return { transactions: [] }
      }
      throw new OtsuError(ErrorCodes.NETWORK_ERROR, (error as Error).message)
    }
  }

  async getBookOffers(
    takerGets: unknown,
    takerPays: unknown,
    limit = 10,
  ): Promise<Record<string, unknown>[]> {
    await this.ensureConnected()
    await this.rateLimiter.consume()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.client!.request({
      command: 'book_offers',
      taker_gets: takerGets,
      taker_pays: takerPays,
      limit,
    } as any)

    return ((response.result as Record<string, unknown>).offers ?? []) as Record<string, unknown>[]
  }

  async getAccountObjects(
    address: string,
    type?: string,
    marker?: unknown,
    limit = 200,
  ): Promise<{ objects: Record<string, unknown>[]; marker?: unknown }> {
    await this.ensureConnected()
    await this.rateLimiter.consume()

    try {
      const request: Record<string, unknown> = {
        command: 'account_objects',
        account: address,
        ledger_index: 'validated',
        limit,
      }

      if (type) request.type = type
      if (marker) request.marker = marker

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await this.client!.request(request as any)
      const result = response.result as Record<string, unknown>

      return {
        objects: (result.account_objects ?? []) as Record<string, unknown>[],
        marker: result.marker,
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('actNotFound')) {
        return { objects: [] }
      }
      throw new OtsuError(ErrorCodes.NETWORK_ERROR, (error as Error).message)
    }
  }

  async getTransaction(hash: string): Promise<{
    hash: string
    validated: boolean
    result: string
    ledgerIndex: number
  }> {
    await this.ensureConnected()
    await this.rateLimiter.consume()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.client!.request({
      command: 'tx',
      transaction: hash,
    } as any)

    const result = response.result as Record<string, unknown>
    const meta = result.meta as Record<string, unknown> | undefined

    return {
      hash: result.hash as string,
      validated: result.validated as boolean,
      result: (meta?.TransactionResult as string) ?? 'unknown',
      ledgerIndex: (result.ledger_index as number) ?? 0,
    }
  }

  async request(command: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.ensureConnected()
    await this.rateLimiter.consume()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await this.client!.request(command as any)
    return response.result as Record<string, unknown>
  }

  async fundWallet(address: string): Promise<{ balance: number }> {
    if (!this.networkConfig.faucet) {
      throw new OtsuError(ErrorCodes.NETWORK_ERROR, 'Faucet not available on this network')
    }

    await this.ensureConnected()

    const response = await fetch(this.networkConfig.faucet, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: address }),
    })

    if (!response.ok) {
      throw new OtsuError(ErrorCodes.NETWORK_ERROR, 'Faucet request failed')
    }

    const data = (await response.json()) as { balance: number }
    return { balance: data.balance ?? 0 }
  }

  private async ensureConnected(): Promise<void> {
    if (!this.client?.isConnected()) {
      await this.connect()
    }
  }

  private async handleDisconnect(): Promise<void> {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return

    this.reconnectAttempts++
    const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts - 1)

    await new Promise((resolve) => setTimeout(resolve, delay))

    try {
      await this.connect()
    } catch {
      // Reconnection failed, will retry on next operation
    }
  }
}
