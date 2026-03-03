import type {
  ContractInfo,
  ContractFunction,
  ContractParameterDef,
  ContractSType,
} from '@otsu/types'
import { ErrorCodes, OtsuError, CONTRACT_INFO_CACHE_TTL_MS } from '@otsu/constants'
import type { XrplClient } from '../network/client'
import type { WalletCache } from '../storage/cache'

interface CacheEntry {
  info: ContractInfo
  expiresAt: number
}

export class ContractClient {
  private memoryCache = new Map<string, CacheEntry>()

  constructor(
    private client: XrplClient,
    private cache?: WalletCache,
  ) {}

  async getContractInfo(address: string): Promise<ContractInfo> {
    const cached = this.memoryCache.get(address)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.info
    }

    if (this.cache) {
      const persistent = await this.cache.getCachedContractInfo(address)
      if (persistent) {
        this.memoryCache.set(address, {
          info: persistent,
          expiresAt: Date.now() + CONTRACT_INFO_CACHE_TTL_MS,
        })
        return persistent
      }
    }

    try {
      const result = await this.client.request({
        command: 'contract_info',
        contract_id: address,
      })

      const info = this.parseContractInfo(address, result)

      this.memoryCache.set(address, {
        info,
        expiresAt: Date.now() + CONTRACT_INFO_CACHE_TTL_MS,
      })

      if (this.cache) {
        await this.cache.setCachedContractInfo(address, info)
      }

      return info
    } catch (error: unknown) {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('unknowncmd') || msg.includes('amendmentblocked')) {
          throw new OtsuError(
            ErrorCodes.CONTRACT_NOT_SUPPORTED,
            'Smart contracts are not enabled on this network',
          )
        }
        if (msg.includes('entrynotfound') || msg.includes('actnotfound')) {
          throw new OtsuError(ErrorCodes.CONTRACT_NOT_FOUND, `Contract not found: ${address}`)
        }
      }
      throw error
    }
  }

  async isContractSupported(): Promise<boolean> {
    try {
      await this.client.request({
        command: 'contract_info',
        contract_id: 'rNotAValidContractAddress1',
      })
      return true
    } catch (error: unknown) {
      if (error instanceof Error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('unknowncmd') || msg.includes('amendmentblocked')) {
          return false
        }
        // Other errors (like entryNotFound) mean the command IS supported
        return true
      }
      return false
    }
  }

  clearCache(): void {
    this.memoryCache.clear()
  }

  private parseContractInfo(address: string, result: Record<string, unknown>): ContractInfo {
    const abi = (result.abi ?? result.contract_abi ?? []) as Record<string, unknown>[]
    const functions: ContractFunction[] = abi.map((fn) => ({
      name: (fn.name ?? fn.Name ?? '') as string,
      parameters: this.parseParameters(
        (fn.parameters ?? fn.Parameters ?? []) as Record<string, unknown>[],
      ),
    }))

    return {
      address,
      functions,
      owner: result.owner as string | undefined,
      sourceUri: result.source_uri as string | undefined,
    }
  }

  private parseParameters(params: Record<string, unknown>[]): ContractParameterDef[] {
    return params.map((p) => ({
      flags: (p.flags ?? p.Flags ?? 0) as number,
      sType: (p.stype ?? p.SType ?? p.s_type ?? 'Blob') as ContractSType,
      label: (p.label ?? p.Label) as string | undefined,
    }))
  }
}
