import type {
  AddressInfo,
  BalanceInfo,
  NetworkInfo,
  SignedTransaction,
  SignedMessage,
  NFTRecord,
  DexOffer,
  TransactionStatus,
  ContractInfo,
  ContractCallParams,
  OtsuEventType,
  OtsuEventCallback,
} from './types'

interface WindowXrpl {
  isOtsu: boolean
  isConnected(): boolean
  connect(params?: { scopes?: string[] }): Promise<AddressInfo>
  disconnect(): Promise<void>
  getAddress(): Promise<AddressInfo>
  getNetwork(): Promise<NetworkInfo>
  getBalance(): Promise<BalanceInfo>
  signTransaction(tx: Record<string, unknown>): Promise<SignedTransaction>
  signAndSubmit(tx: Record<string, unknown>): Promise<SignedTransaction>
  signMessage(message: string): Promise<SignedMessage>
  switchNetwork(networkId: string): Promise<NetworkInfo>
  getNFTs(): Promise<NFTRecord[]>
  getAccountOffers(): Promise<DexOffer[]>
  getTransactionStatus(hash: string): Promise<TransactionStatus>
  getContractInfo(contractAddress: string): Promise<ContractInfo>
  contractCall(params: ContractCallParams): Promise<SignedTransaction>
  on(event: string, callback: (data: unknown) => void): void
  off(event: string, callback: (data: unknown) => void): void
}

declare global {
  interface Window {
    xrpl?: WindowXrpl
  }
}

function getProvider(): WindowXrpl {
  if (!window.xrpl) {
    throw new Error('Otsu Wallet extension is not installed')
  }
  return window.xrpl
}

export class OtsuWallet {
  static isInstalled(): boolean {
    return typeof window !== 'undefined' && !!window.xrpl?.isOtsu
  }

  isConnected(): boolean {
    return getProvider().isConnected()
  }

  async connect(params?: { scopes?: string[] }): Promise<AddressInfo> {
    return getProvider().connect(params)
  }

  async disconnect(): Promise<void> {
    return getProvider().disconnect()
  }

  async getAddress(): Promise<AddressInfo> {
    return getProvider().getAddress()
  }

  async getNetwork(): Promise<NetworkInfo> {
    return getProvider().getNetwork()
  }

  async getBalance(): Promise<BalanceInfo> {
    return getProvider().getBalance()
  }

  async signTransaction(tx: Record<string, unknown>): Promise<SignedTransaction> {
    return getProvider().signTransaction(tx)
  }

  async signAndSubmit(tx: Record<string, unknown>): Promise<SignedTransaction> {
    return getProvider().signAndSubmit(tx)
  }

  async signMessage(message: string): Promise<SignedMessage> {
    return getProvider().signMessage(message)
  }

  async switchNetwork(networkId: string): Promise<NetworkInfo> {
    return getProvider().switchNetwork(networkId)
  }

  async getNFTs(): Promise<NFTRecord[]> {
    return getProvider().getNFTs() as Promise<NFTRecord[]>
  }

  async getAccountOffers(): Promise<DexOffer[]> {
    return getProvider().getAccountOffers() as Promise<DexOffer[]>
  }

  async getTransactionStatus(hash: string): Promise<TransactionStatus> {
    return getProvider().getTransactionStatus(hash) as Promise<TransactionStatus>
  }

  async getContractInfo(contractAddress: string): Promise<ContractInfo> {
    return getProvider().getContractInfo(contractAddress) as Promise<ContractInfo>
  }

  async contractCall(params: ContractCallParams): Promise<SignedTransaction> {
    return getProvider().contractCall(params) as Promise<SignedTransaction>
  }

  on(event: OtsuEventType, callback: OtsuEventCallback): void {
    getProvider().on(event, callback)
  }

  off(event: OtsuEventType, callback: OtsuEventCallback): void {
    getProvider().off(event, callback)
  }
}
