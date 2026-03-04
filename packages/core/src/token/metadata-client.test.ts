import { describe, it, expect, vi, afterEach } from 'vitest'
import { TokenMetadataClient } from './metadata-client'

describe('TokenMetadataClient', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('returns metadata from API', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          name: 'US Dollar',
          currency_code: 'USD',
          icon: 'https://example.com/usd.png',
          domain: 'bitstamp.net',
          verified: true,
        }),
    })

    const client = new TokenMetadataClient()
    const metadata = await client.getTokenMetadata('USD', 'rIssuer')

    expect(metadata.name).toBe('US Dollar')
    expect(metadata.symbol).toBe('USD')
    expect(metadata.verified).toBe(true)
  })

  it('returns fallback on fetch error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const client = new TokenMetadataClient()
    const metadata = await client.getTokenMetadata('USD', 'rIssuer')

    expect(metadata.currency).toBe('USD')
    expect(metadata.issuer).toBe('rIssuer')
    expect(metadata.verified).toBe(false)
  })

  it('returns fallback on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })

    const client = new TokenMetadataClient()
    const metadata = await client.getTokenMetadata('XYZ', 'rIssuer')

    expect(metadata.verified).toBe(false)
    expect(metadata.symbol).toBe('XYZ')
  })

  it('fetches batch metadata', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          name: 'Token',
          currency_code: 'TOK',
          verified: false,
        }),
    })

    const client = new TokenMetadataClient()
    const results = await client.getTokenMetadataBatch([
      { currency: 'USD', issuer: 'r1' },
      { currency: 'EUR', issuer: 'r2' },
    ])

    expect(results).toHaveLength(2)
  })
})
