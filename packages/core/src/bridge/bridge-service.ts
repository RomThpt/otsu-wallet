import type { BridgeDirection, BridgeEstimate, BridgeStatus, BridgeTransaction } from '@otsu/types'
import { AXELAR_GATEWAY, BRIDGE_POLL_INTERVAL_MS, BRIDGE_TIMEOUT_MS } from '@otsu/constants'
import { xrplDropsToEvmWei, evmWeiToXrplDrops } from '../utils/decimals'

type AxelarEnvironment = 'mainnet' | 'testnet'

const AXELARSCAN_API = {
  mainnet: 'https://api.axelarscan.io',
  testnet: 'https://testnet.api.axelarscan.io',
} as const

const DEFAULT_GAS_LIMIT = '250000'
const AXELAR_GMP_API = {
  mainnet: 'https://api.gmp.axelarscan.io',
  testnet: 'https://testnet.api.gmp.axelarscan.io',
} as const

interface AxelarFeeToken {
  decimals: number
  gas_price: string | number
}

interface AxelarFeeResult {
  source_base_fee_string: string
  source_token: AxelarFeeToken
  execute_gas_multiplier: number
}

function decimalToAtomic(value: string | number, decimals: number): bigint {
  const normalized = String(value).trim()
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/)
  if (!match || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error('Axelar returned invalid fee data')
  }
  const fraction = match[2] ?? ''
  const numerator = BigInt(`${match[1]}${fraction}`)
  return (numerator * 10n ** BigInt(decimals)) / 10n ** BigInt(fraction.length)
}

export class BridgeService {
  private env: AxelarEnvironment
  private transactions = new Map<string, BridgeTransaction>()

  constructor(env: AxelarEnvironment = 'testnet') {
    this.env = env
  }

  get gatewayAddresses() {
    return AXELAR_GATEWAY[this.env]
  }

  async estimateBridgeFee(direction: BridgeDirection, amount: string): Promise<BridgeEstimate> {
    const sourceChain = direction === 'xrpl-to-evm' ? 'xrpl' : 'xrpl-evm'
    const destChain = direction === 'xrpl-to-evm' ? 'xrpl-evm' : 'xrpl'

    const response = await fetch(AXELAR_GMP_API[this.env], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'getFees', sourceChain, destinationChain: destChain }),
    })
    if (!response.ok) throw new Error(`Axelar fee request failed (${response.status})`)
    const payload = (await response.json()) as { result?: Partial<AxelarFeeResult> }
    const result = payload.result
    if (
      !result?.source_base_fee_string ||
      !result.source_token ||
      typeof result.execute_gas_multiplier !== 'number'
    ) {
      throw new Error('Axelar returned incomplete fee data')
    }
    const baseFee = decimalToAtomic(result.source_base_fee_string, result.source_token.decimals)
    const executionFee =
      BigInt(DEFAULT_GAS_LIMIT) *
      decimalToAtomic(result.source_token.gas_price, result.source_token.decimals)
    const multiplier =
      result.execute_gas_multiplier > 1
        ? BigInt(Math.round(result.execute_gas_multiplier * 10_000))
        : 10_000n
    const feeStr = (baseFee + (executionFee * multiplier) / 10_000n).toString()

    let destinationAmount: string
    if (direction === 'xrpl-to-evm') {
      const amountWei = xrplDropsToEvmWei(amount)
      const feeInWei = xrplDropsToEvmWei(feeStr)
      const net = BigInt(amountWei) - BigInt(feeInWei)
      destinationAmount = net > 0n ? net.toString() : '0'
    } else {
      const amountDrops = evmWeiToXrplDrops(amount)
      const net = BigInt(amountDrops) - BigInt(feeStr)
      destinationAmount = net > 0n ? net.toString() : '0'
    }

    return {
      fee: feeStr,
      estimatedTime: 180,
      sourceAmount: amount,
      destinationAmount,
    }
  }

  createBridgeTransaction(params: {
    direction: BridgeDirection
    sourceAddress: string
    destinationAddress: string
    sourceAmount: string
    destinationAmount: string
    sourceTxHash?: string
  }): BridgeTransaction {
    const tx: BridgeTransaction = {
      id: `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      direction: params.direction,
      sourceAddress: params.sourceAddress,
      destinationAddress: params.destinationAddress,
      sourceAmount: params.sourceAmount,
      destinationAmount: params.destinationAmount,
      sourceTxHash: params.sourceTxHash,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.transactions.set(tx.id, tx)
    return tx
  }

  async pollBridgeStatus(sourceTxHash: string): Promise<BridgeStatus> {
    try {
      const baseUrl = AXELARSCAN_API[this.env]
      const url = `${baseUrl}/gmp/${sourceTxHash}`
      const response = await fetch(url)

      if (!response.ok) return 'pending'

      const data = (await response.json()) as { status?: string }
      const status = data.status

      switch (status) {
        case 'source_gateway_called':
        case 'confirmed':
          return 'source_confirmed'
        case 'approved':
        case 'executing':
          return 'bridging'
        case 'executed':
          return 'completed'
        case 'error':
        case 'insufficient_fee':
          return 'failed'
        default:
          return 'pending'
      }
    } catch {
      return 'pending'
    }
  }

  updateTransaction(id: string, updates: Partial<BridgeTransaction>): BridgeTransaction | null {
    const tx = this.transactions.get(id)
    if (!tx) return null

    Object.assign(tx, updates, { updatedAt: Date.now() })
    if (updates.status === 'completed' || updates.status === 'failed') {
      tx.completedAt = Date.now()
    }

    return tx
  }

  getTransaction(id: string): BridgeTransaction | null {
    return this.transactions.get(id) ?? null
  }

  getPendingTransactions(): BridgeTransaction[] {
    return Array.from(this.transactions.values()).filter(
      (tx) => tx.status !== 'completed' && tx.status !== 'failed',
    )
  }

  getAllTransactions(): BridgeTransaction[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  loadTransactions(transactions: BridgeTransaction[]): void {
    this.transactions.clear()
    for (const tx of transactions) {
      this.transactions.set(tx.id, tx)
    }
  }

  buildXrplBridgeMemo(evmDestination: string): Array<{ type: string; data: string }> {
    return [
      {
        type: 'destination_address',
        data: evmDestination,
      },
      {
        type: 'destination_chain',
        data: 'xrpl-evm',
      },
    ]
  }

  get pollIntervalMs(): number {
    return BRIDGE_POLL_INTERVAL_MS
  }

  get timeoutMs(): number {
    return BRIDGE_TIMEOUT_MS
  }
}
