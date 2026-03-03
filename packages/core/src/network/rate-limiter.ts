export interface RateLimiterOptions {
  maxTokens: number
  refillRate: number // tokens per second
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  maxTokens: 10,
  refillRate: 5,
}

export class RateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number
  private lastRefill: number

  constructor(options: Partial<RateLimiterOptions> = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    this.maxTokens = opts.maxTokens
    this.refillRate = opts.refillRate
    this.tokens = opts.maxTokens
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }

  canConsume(): boolean {
    this.refill()
    return this.tokens >= 1
  }

  async consume(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }

    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000
    await new Promise((resolve) => setTimeout(resolve, Math.ceil(waitTime)))
    this.refill()
    this.tokens -= 1
  }

  get availableTokens(): number {
    this.refill()
    return this.tokens
  }
}
