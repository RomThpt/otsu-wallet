import { Contract, JsonRpcProvider, formatUnits, parseUnits, type InterfaceAbi } from 'ethers'
import type { Erc20Token } from '@otsu/types'
import { BLOCKSCOUT_API, EVM_CHAIN_IDS } from '@otsu/constants'

const ERC20_ABI: InterfaceAbi = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
]

export class Erc20Client {
  constructor(
    private provider: JsonRpcProvider,
    private chainId?: number,
  ) {}

  static create(rpcUrl: string, chainId?: number): Erc20Client {
    const provider = new JsonRpcProvider(rpcUrl, chainId)
    return new Erc20Client(provider, chainId)
  }

  async getTokenInfo(
    contractAddress: string,
  ): Promise<Omit<Erc20Token, 'balance' | 'formattedBalance'>> {
    const contract = new Contract(contractAddress, ERC20_ABI, this.provider)
    const [name, symbol, decimals] = await Promise.all([
      contract.name() as Promise<string>,
      contract.symbol() as Promise<string>,
      contract.decimals() as Promise<bigint>,
    ])

    return {
      contractAddress,
      name,
      symbol,
      decimals: Number(decimals),
    }
  }

  async getBalance(contractAddress: string, owner: string): Promise<Erc20Token> {
    const contract = new Contract(contractAddress, ERC20_ABI, this.provider)
    const [name, symbol, decimals, balance] = await Promise.all([
      contract.name() as Promise<string>,
      contract.symbol() as Promise<string>,
      contract.decimals() as Promise<bigint>,
      contract.balanceOf(owner) as Promise<bigint>,
    ])

    const dec = Number(decimals)
    return {
      contractAddress,
      name,
      symbol,
      decimals: dec,
      balance: balance.toString(),
      formattedBalance: formatUnits(balance, dec),
    }
  }

  async getTokenList(owner: string): Promise<Erc20Token[]> {
    const baseUrl = this.getBlockscoutUrl()
    if (!baseUrl) return []

    const url = `${baseUrl}?module=account&action=tokenlist&address=${owner}`
    const response = await fetch(url)
    const data = (await response.json()) as {
      result: Array<{
        contractAddress: string
        name: string
        symbol: string
        decimals: string
        balance: string
      }>
    }

    if (!Array.isArray(data.result)) return []

    return data.result.map((t) => {
      const decimals = parseInt(t.decimals, 10)
      return {
        contractAddress: t.contractAddress,
        name: t.name,
        symbol: t.symbol,
        decimals,
        balance: t.balance,
        formattedBalance: formatUnits(BigInt(t.balance), decimals),
      }
    })
  }

  buildTransfer(
    contractAddress: string,
    to: string,
    amount: string,
    decimals: number,
  ): { to: string; data: string } {
    const contract = new Contract(contractAddress, ERC20_ABI)
    const parsedAmount = parseUnits(amount, decimals)
    const data = contract.interface.encodeFunctionData('transfer', [to, parsedAmount])
    return { to: contractAddress, data }
  }

  buildApprove(
    contractAddress: string,
    spender: string,
    amount: string,
    decimals: number,
  ): { to: string; data: string } {
    const contract = new Contract(contractAddress, ERC20_ABI)
    const parsedAmount = parseUnits(amount, decimals)
    const data = contract.interface.encodeFunctionData('approve', [spender, parsedAmount])
    return { to: contractAddress, data }
  }

  private getBlockscoutUrl(): string | null {
    if (this.chainId === EVM_CHAIN_IDS.MAINNET) return BLOCKSCOUT_API.mainnet
    if (this.chainId === EVM_CHAIN_IDS.TESTNET) return BLOCKSCOUT_API.testnet
    return null
  }
}
