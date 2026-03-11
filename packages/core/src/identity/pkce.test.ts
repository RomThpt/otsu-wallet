import { describe, it, expect } from 'vitest'
import { generateCodeVerifier, deriveCodeChallenge } from './pkce'

describe('PKCE utilities', () => {
  describe('generateCodeVerifier', () => {
    it('generates a base64url string', () => {
      const verifier = generateCodeVerifier()
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('generates unique values', () => {
      const a = generateCodeVerifier()
      const b = generateCodeVerifier()
      expect(a).not.toBe(b)
    })

    it('respects custom length', () => {
      const short = generateCodeVerifier(16)
      const long = generateCodeVerifier(96)
      // base64url encoding increases length by ~4/3, so short < long
      expect(short.length).toBeLessThan(long.length)
    })
  })

  describe('deriveCodeChallenge', () => {
    it('returns a base64url string', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await deriveCodeChallenge(verifier)
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('produces consistent output for same input', async () => {
      const verifier = 'test-verifier-12345'
      const a = await deriveCodeChallenge(verifier)
      const b = await deriveCodeChallenge(verifier)
      expect(a).toBe(b)
    })

    it('produces different output for different input', async () => {
      const a = await deriveCodeChallenge('verifier-one')
      const b = await deriveCodeChallenge('verifier-two')
      expect(a).not.toBe(b)
    })

    it('has expected SHA-256 output length (43 chars base64url)', async () => {
      const challenge = await deriveCodeChallenge('any-verifier')
      // SHA-256 = 32 bytes = 43 base64url chars (no padding)
      expect(challenge.length).toBe(43)
    })
  })
})
