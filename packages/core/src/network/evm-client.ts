import {
  JsonRpcProvider,
  formatEther,
  parseEther,
  type TransactionRequest,
  type TransactionResponse,
  type TransactionReceipt,
  type FeeData,
} from 'ethers'
import type { NetworkConfig, EvmBalanceInfo, EvmTransactionReceipt } from '@otsu/types'
import { BLOCKSCOUT_API, EVM_CHAIN_IDS } from '@otsu/constants'

export class EvmClient {
  private provider: JsonRpcProvider | null = null
  private config: NetworkConfig | null = null

  connect(config: NetworkConfig): void {
    this.config = config
    this.provider = new JsonRpcProvider(config.url, config.chainId)
  }

  disconnect(): void {
    if (this.provider) {
      this.provider.destroy()
      this.provider = null
    }
    this.config = null
  }

  switchNetwork(config: NetworkConfig): void {
    this.disconnect()
    this.connect(config)
  }

  get isConnected(): boolean {
    return this.provider !== null
  }

  private requireProvider(): JsonRpcProvider {
    if (!this.provider) {
      throw new Error('EVM client not connected')
    }
    return this.provider
  }

  async getBalance(address: string): Promise<EvmBalanceInfo> {
    const provider = this.requireProvider()
    const balance = await provider.getBalance(address)
    return {
      balance: balance.toString(),
      formatted: formatEther(balance),
    }
  }

  async estimateGas(tx: TransactionRequest): Promise<string> {
    const provider = this.requireProvider()
    const gas = await provider.estimateGas(tx)
    return gas.toString()
  }

  async sendRawTransaction(signedTx: string): Promise<TransactionResponse> {
    const provider = this.requireProvider()
    return provider.broadcastTransaction(signedTx)
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
    const provider = this.requireProvider()
    return provider.getTransactionReceipt(hash)
  }

  async getBlockNumber(): Promise<number> {
    const provider = this.requireProvider()
    return provider.getBlockNumber()
  }

  async getGasPrice(): Promise<string> {
    const provider = this.requireProvider()
    const feeData = await provider.getFeeData()
    return (feeData.gasPrice ?? 0n).toString()
  }

  async getFeeData(): Promise<FeeData> {
    const provider = this.requireProvider()
    return provider.getFeeData()
  }

  async getNonce(address: string): Promise<number> {
    const provider = this.requireProvider()
    return provider.getTransactionCount(address)
  }

  async getTransactionHistory(
    address: string,
    page = 1,
    offset = 20,
  ): Promise<EvmTransactionReceipt[]> {
    const baseUrl = this.getBlockscoutUrl()
    if (!baseUrl) return []

    const url = `${baseUrl}?module=account&action=txlist&address=${address}&page=${page}&offset=${offset}&sort=desc`
    const response = await fetch(url)
    const data = (await response.json()) as {
      result: Array<{
        hash: string
        blockNumber: string
        from: string
        to: string
        value: string
        gasUsed: string
        txreceipt_status: string
        timeStamp: string
      }>
    }

    if (!Array.isArray(data.result)) return []

    return data.result.map((tx) => ({
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber, 10),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      gasUsed: tx.gasUsed,
      status: parseInt(tx.txreceipt_status, 10),
      timestamp: parseInt(tx.timeStamp, 10),
    }))
  }

  buildTransaction(params: {
    to: string
    value?: string
    data?: string
    gasLimit?: string
    nonce?: number
  }): TransactionRequest {
    return {
      to: params.to,
      value: params.value ? parseEther(params.value) : undefined,
      data: params.data,
      gasLimit: params.gasLimit ? BigInt(params.gasLimit) : undefined,
      nonce: params.nonce,
      chainId: this.config?.chainId,
    }
  }

  private getBlockscoutUrl(): string | null {
    if (!this.config) return null
    if (this.config.chainId === EVM_CHAIN_IDS.MAINNET) return BLOCKSCOUT_API.mainnet
    if (this.config.chainId === EVM_CHAIN_IDS.TESTNET) return BLOCKSCOUT_API.testnet
    return null
  }
}
