import type { NftMetadata } from '@otsu/types'
import type { WalletCache } from '../storage/cache'

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/'
const FETCH_TIMEOUT_MS = 10000

function resolveIpfsUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return IPFS_GATEWAY + uri.slice(7)
  }
  return uri
}

const IMAGE_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

export class NftMetadataClient {
  constructor(private cache?: WalletCache) {}

  async fetchMetadata(nftId: string, uri: string): Promise<NftMetadata> {
    if (this.cache) {
      const cached = await this.cache.getCachedNFTMetadata(nftId)
      if (cached) return cached
    }

    try {
      const resolvedUrl = resolveIpfsUri(uri)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

      const response = await fetch(resolvedUrl, { signal: controller.signal })
      clearTimeout(timeoutId)

      const contentType = response.headers.get('content-type') ?? ''

      if (IMAGE_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
        const metadata: NftMetadata = { nftId, image: resolvedUrl }
        await this.cacheMetadata(nftId, metadata)
        return metadata
      }

      const json = (await response.json()) as Record<string, unknown>
      const metadata: NftMetadata = { nftId }

      if (typeof json.name === 'string') metadata.name = json.name
      if (typeof json.description === 'string') metadata.description = json.description
      if (typeof json.image === 'string') metadata.image = resolveIpfsUri(json.image)
      if (typeof json.animation_url === 'string') metadata.animationUrl = json.animation_url
      if (typeof json.background_color === 'string')
        metadata.backgroundColor = json.background_color
      if (typeof json.external_url === 'string') metadata.externalUrl = json.external_url
      if (Array.isArray(json.attributes)) {
        metadata.attributes = json.attributes as Record<string, string>[]
      }

      await this.cacheMetadata(nftId, metadata)
      return metadata
    } catch {
      return { nftId }
    }
  }

  private async cacheMetadata(nftId: string, metadata: NftMetadata): Promise<void> {
    if (this.cache) {
      try {
        await this.cache.setCachedNFTMetadata(nftId, metadata)
      } catch {
        // Cache write failure is non-critical
      }
    }
  }
}
