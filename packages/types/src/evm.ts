export interface EvmTransactionRequest {
  to: string
  value?: string
  data?: string
  gasLimit?: string
  gasPrice?: string
  maxFeePerGas?: string
  maxPriorityFeePerGas?: string
  nonce?: number
  chainId?: number
}

export interface EvmTransactionReceipt {
  hash: string
  blockNumber: number
  from: string
  to: string
  value: string
  gasUsed: string
  status: number
  timestamp?: number
}

export interface Erc20Token {
  contractAddress: string
  name: string
  symbol: string
  decimals: number
  balance: string
  formattedBalance: string
}

export interface EvmContractCallParams {
  contractAddress: string
  abi: string
  functionName: string
  args?: unknown[]
  value?: string
}
