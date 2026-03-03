import { XRPL_META_BASE_URL } from '@otsu/constants'
import type { TokenMetadata } from '@otsu/types'
import type { WalletCache } from '../storage/cache'

export class TokenMetadataClient {
  constructor(private cache?: WalletCache) {}

  async getTokenMetadata(currency: string, issuer: string): Promise<TokenMetadata> {
    const cacheKey = `${currency}:${issuer}`

    if (this.cache) {
      const cached = await this.cache.getCachedTokenMetadata(cacheKey)
      if (cached) return cached
    }

    try {
      const url = `${XRPL_META_BASE_URL}/token/${currency}:${issuer}`
      const response = await fetch(url)

      if (!response.ok) {
        return this.fallbackMetadata(currency, issuer)
      }

      const data = (await response.json()) as Record<string, unknown>
      const metadata: TokenMetadata = {
        currency,
        issuer,
        name: (data.name as string) || undefined,
        symbol: (data.currency_code as string) || currency,
        icon: (data.icon as string) || undefined,
        domain: (data.domain as string) || undefined,
        verified: (data.verified as boolean) ?? false,
      }

      if (this.cache) {
        await this.cache.setCachedTokenMetadata(cacheKey, metadata)
      }

      return metadata
    } catch {
      return this.fallbackMetadata(currency, issuer)
    }
  }

  async getTokenMetadataBatch(
    tokens: Array<{ currency: string; issuer: string }>,
  ): Promise<TokenMetadata[]> {
    return Promise.all(tokens.map((t) => this.getTokenMetadata(t.currency, t.issuer)))
  }

  private fallbackMetadata(currency: string, issuer: string): TokenMetadata {
    return {
      currency,
      issuer,
      symbol: currency,
      verified: false,
    }
  }
}
