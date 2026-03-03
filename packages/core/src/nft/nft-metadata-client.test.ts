import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NftMetadataClient } from './nft-metadata-client'

describe('NftMetadataClient', () => {
  let client: NftMetadataClient

  beforeEach(() => {
    client = new NftMetadataClient()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should resolve ipfs:// URIs to gateway URLs', async () => {
    const mockJson = { name: 'Test NFT', description: 'A test', image: 'ipfs://QmImage123' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockJson), {
        headers: { 'content-type': 'application/json' },
      }),
    )

    const metadata = await client.fetchMetadata('nft1', 'ipfs://QmTest123')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://ipfs.io/ipfs/QmTest123',
      expect.any(Object),
    )
    expect(metadata.name).toBe('Test NFT')
    expect(metadata.image).toBe('https://ipfs.io/ipfs/QmImage123')
  })

  it('should parse JSON metadata fields', async () => {
    const mockJson = {
      name: 'Cool NFT',
      description: 'Very cool',
      image: 'https://example.com/img.png',
      attributes: [{ trait_type: 'Color', value: 'Red' }],
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockJson), {
        headers: { 'content-type': 'application/json' },
      }),
    )

    const metadata = await client.fetchMetadata('nft2', 'https://example.com/meta.json')
    expect(metadata.name).toBe('Cool NFT')
    expect(metadata.description).toBe('Very cool')
    expect(metadata.image).toBe('https://example.com/img.png')
    expect(metadata.attributes).toHaveLength(1)
  })

  it('should treat image content-type response as direct image URI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('binary-image-data', {
        headers: { 'content-type': 'image/png' },
      }),
    )

    const metadata = await client.fetchMetadata('nft3', 'https://example.com/img.png')
    expect(metadata.image).toBe('https://example.com/img.png')
    expect(metadata.name).toBeUndefined()
  })

  it('should return fallback on fetch error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

    const metadata = await client.fetchMetadata('nft4', 'https://fail.example.com')
    expect(metadata.nftId).toBe('nft4')
    expect(metadata.name).toBeUndefined()
    expect(metadata.image).toBeUndefined()
  })

  it('should use cache when available', async () => {
    const mockCache = {
      getCachedNFTMetadata: vi.fn().mockResolvedValue({ nftId: 'nft5', name: 'Cached' }),
      setCachedNFTMetadata: vi.fn(),
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedClient = new NftMetadataClient(mockCache as any)
    const metadata = await cachedClient.fetchMetadata('nft5', 'https://example.com')

    expect(metadata.name).toBe('Cached')
    expect(mockCache.getCachedNFTMetadata).toHaveBeenCalledWith('nft5')
  })

  it('should cache metadata after fetch', async () => {
    const mockCache = {
      getCachedNFTMetadata: vi.fn().mockResolvedValue(null),
      setCachedNFTMetadata: vi.fn(),
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ name: 'Fresh NFT' }), {
        headers: { 'content-type': 'application/json' },
      }),
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cachedClient = new NftMetadataClient(mockCache as any)
    await cachedClient.fetchMetadata('nft6', 'https://example.com/meta.json')

    expect(mockCache.setCachedNFTMetadata).toHaveBeenCalledWith(
      'nft6',
      expect.objectContaining({ name: 'Fresh NFT' }),
    )
  })
})
