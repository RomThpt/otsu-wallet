import type { RiskWarning, RiskLevel } from '@otsu/types'
import { KNOWN_EXCHANGE_ADDRESSES, DEFAULT_DOMAIN_BLOCKLIST } from '@otsu/constants'

const BLOCKLIST_STORAGE_KEY = 'otsu-blocklists'

interface Blocklists {
  addresses: string[]
  domains: string[]
}

export class RiskScanner {
  private addressBlocklist: Set<string> = new Set()
  private domainBlocklist: Set<string> = new Set(DEFAULT_DOMAIN_BLOCKLIST)

  async initialize(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(BLOCKLIST_STORAGE_KEY)
      const stored = result[BLOCKLIST_STORAGE_KEY] as Blocklists | undefined
      if (stored) {
        this.addressBlocklist = new Set(stored.addresses)
        this.domainBlocklist = new Set([...DEFAULT_DOMAIN_BLOCKLIST, ...stored.domains])
      }
    } catch {
      // Use defaults
    }
  }

  async updateBlocklists(blocklists: Partial<Blocklists>): Promise<void> {
    if (blocklists.addresses) {
      this.addressBlocklist = new Set(blocklists.addresses)
    }
    if (blocklists.domains) {
      this.domainBlocklist = new Set([...DEFAULT_DOMAIN_BLOCKLIST, ...blocklists.domains])
    }
    await chrome.storage.local.set({
      [BLOCKLIST_STORAGE_KEY]: {
        addresses: [...this.addressBlocklist],
        domains: [...this.domainBlocklist],
      },
    })
  }

  scan(params: {
    tx: Record<string, unknown>
    origin?: string
    accountBalance?: string
    knownRecipients?: Set<string>
  }): RiskWarning[] {
    const warnings: RiskWarning[] = []

    warnings.push(...this.checkAddressReputation(params.tx))
    if (params.origin) {
      warnings.push(...this.checkPhishingDomain(params.origin))
    }
    warnings.push(
      ...this.checkUnusualPatterns(params.tx, params.accountBalance, params.knownRecipients),
    )
    warnings.push(...this.checkExchangeTag(params.tx))
    if (params.origin) {
      warnings.push(...this.checkDomainVerification(params.origin))
    }

    return warnings
  }

  getOverallRisk(warnings: RiskWarning[]): RiskLevel {
    if (warnings.some((w) => w.level === 'critical')) return 'critical'
    if (warnings.some((w) => w.level === 'high')) return 'high'
    if (warnings.some((w) => w.level === 'medium')) return 'medium'
    if (warnings.some((w) => w.level === 'low')) return 'low'
    return 'safe'
  }

  private checkAddressReputation(tx: Record<string, unknown>): RiskWarning[] {
    const destination = tx.Destination as string | undefined
    if (!destination) return []

    if (this.addressBlocklist.has(destination)) {
      return [
        {
          level: 'critical',
          code: 'BLOCKLISTED_ADDRESS',
          message: 'Destination address is on the scam blocklist',
          details: `Address ${destination} has been reported as fraudulent.`,
        },
      ]
    }

    return []
  }

  private checkPhishingDomain(origin: string): RiskWarning[] {
    try {
      const url = new URL(origin)
      const hostname = url.hostname.toLowerCase()

      if (this.domainBlocklist.has(hostname)) {
        return [
          {
            level: 'critical',
            code: 'PHISHING_DOMAIN',
            message: 'This website is on the phishing blocklist',
            details: `Domain ${hostname} has been identified as a phishing site.`,
          },
        ]
      }
    } catch {
      // Invalid URL, skip
    }

    return []
  }

  private checkUnusualPatterns(
    tx: Record<string, unknown>,
    accountBalance?: string,
    knownRecipients?: Set<string>,
  ): RiskWarning[] {
    const warnings: RiskWarning[] = []
    const amount = tx.Amount
    const destination = tx.Destination as string | undefined

    // Check for large transactions (>10% of balance)
    if (typeof amount === 'string' && accountBalance) {
      const txAmount = Number(amount)
      const balance = Number(accountBalance)
      if (balance > 0 && txAmount / balance > 0.1) {
        warnings.push({
          level: 'medium',
          code: 'LARGE_TRANSACTION',
          message: 'This transaction is more than 10% of your balance',
          details: `Sending ${(txAmount / 1_000_000).toFixed(6)} XRP out of ${(balance / 1_000_000).toFixed(6)} XRP total.`,
        })
      }
    }

    // Check for first-time recipient
    if (destination && knownRecipients && !knownRecipients.has(destination)) {
      warnings.push({
        level: 'low',
        code: 'NEW_RECIPIENT',
        message: 'This is the first transaction to this address',
        details: 'Double-check the destination address before confirming.',
      })
    }

    return warnings
  }

  private checkExchangeTag(tx: Record<string, unknown>): RiskWarning[] {
    const destination = tx.Destination as string | undefined
    const tag = tx.DestinationTag as number | undefined

    if (!destination) return []

    if (KNOWN_EXCHANGE_ADDRESSES.has(destination) && tag === undefined) {
      return [
        {
          level: 'high',
          code: 'MISSING_EXCHANGE_TAG',
          message: 'Destination tag is required for this exchange',
          details:
            'Sending to a known exchange without a destination tag may result in lost funds.',
        },
      ]
    }

    return []
  }

  private checkDomainVerification(origin: string): RiskWarning[] {
    try {
      const url = new URL(origin)
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
        return [
          {
            level: 'medium',
            code: 'INSECURE_ORIGIN',
            message: 'This website is not using HTTPS',
            details: 'Transactions from non-HTTPS origins may be intercepted.',
          },
        ]
      }
    } catch {
      return [
        {
          level: 'low',
          code: 'UNKNOWN_ORIGIN',
          message: 'Could not verify the origin of this request',
        },
      ]
    }

    return []
  }
}
