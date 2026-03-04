import { describe, it, expect } from 'vitest'
import { parseXrplUri } from './uri-parser'

describe('parseXrplUri', () => {
  const validAddress = 'rN7n3473SaZBCG4dFL83w7p1W9cgkR6pHi'

  it('parses basic address', () => {
    const result = parseXrplUri(`xrpl:${validAddress}`)
    expect(result).toEqual({ address: validAddress })
  })

  it('parses address with web+ prefix', () => {
    const result = parseXrplUri(`web+xrpl:${validAddress}`)
    expect(result).toEqual({ address: validAddress })
  })

  it('parses case-insensitive scheme', () => {
    const result = parseXrplUri(`XRPL:${validAddress}`)
    expect(result).toEqual({ address: validAddress })
  })

  it('parses amount in drops and converts to XRP', () => {
    const result = parseXrplUri(`xrpl:${validAddress}?amount=1000000`)
    expect(result).toEqual({
      address: validAddress,
      amount: '1.000000',
    })
  })

  it('parses destination tag', () => {
    const result = parseXrplUri(`xrpl:${validAddress}?dt=12345`)
    expect(result).toEqual({
      address: validAddress,
      destinationTag: 12345,
    })
  })

  it('parses all params together', () => {
    const issuerAddress = 'rhub8VRN55s94qWKDv6jmDy1pUykJzF3wq'
    const result = parseXrplUri(
      `xrpl:${validAddress}?amount=1000000&dt=12345&currency=USD&issuer=${issuerAddress}`,
    )
    expect(result).toEqual({
      address: validAddress,
      amount: '1.000000',
      destinationTag: 12345,
      currency: 'USD',
      issuer: issuerAddress,
    })
  })

  it('returns null for invalid address', () => {
    expect(parseXrplUri('xrpl:notanaddress')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseXrplUri('')).toBeNull()
  })

  it('returns null when no address is provided', () => {
    expect(parseXrplUri('xrpl:')).toBeNull()
  })

  it('ignores invalid amount', () => {
    const result = parseXrplUri(`xrpl:${validAddress}?amount=abc`)
    expect(result).toEqual({ address: validAddress })
  })

  it('ignores negative amount', () => {
    const result = parseXrplUri(`xrpl:${validAddress}?amount=-100`)
    expect(result).toEqual({ address: validAddress })
  })

  it('ignores invalid destination tag', () => {
    const result = parseXrplUri(`xrpl:${validAddress}?dt=abc`)
    expect(result).toEqual({ address: validAddress })
  })

  it('parses destination tag of zero', () => {
    const result = parseXrplUri(`xrpl:${validAddress}?dt=0`)
    expect(result).toEqual({
      address: validAddress,
      destinationTag: 0,
    })
  })

  it('handles fractional drop amounts', () => {
    const result = parseXrplUri(`xrpl:${validAddress}?amount=500`)
    expect(result).toEqual({
      address: validAddress,
      amount: '0.000500',
    })
  })
})
