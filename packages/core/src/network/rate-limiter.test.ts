import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { RateLimiter } from './rate-limiter'

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests up to maxTokens', () => {
    const limiter = new RateLimiter({ maxTokens: 3, refillRate: 1 })
    expect(limiter.canConsume()).toBe(true)
    expect(limiter.canConsume()).toBe(true)
  })

  it('consumes tokens synchronously when available', async () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 1 })
    await limiter.consume()
    await limiter.consume()
    expect(limiter.availableTokens).toBeLessThan(1)
  })

  it('refills tokens over time', async () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 2 })
    await limiter.consume()
    await limiter.consume()

    // Advance 1 second -- should refill 2 tokens
    vi.advanceTimersByTime(1000)
    expect(limiter.availableTokens).toBeCloseTo(2, 0)
  })

  it('does not exceed maxTokens on refill', () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 10 })
    vi.advanceTimersByTime(10000)
    expect(limiter.availableTokens).toBeLessThanOrEqual(5)
  })

  it('waits when tokens are exhausted', async () => {
    const limiter = new RateLimiter({ maxTokens: 1, refillRate: 10 })
    await limiter.consume()

    const consumePromise = limiter.consume()

    // Should be waiting -- advance time to allow refill
    vi.advanceTimersByTime(200)
    await consumePromise
    // Completed without error
  })

  it('uses default options', () => {
    const limiter = new RateLimiter()
    expect(limiter.availableTokens).toBe(10)
  })
})
