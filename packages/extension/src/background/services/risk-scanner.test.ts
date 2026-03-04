import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RiskScanner } from './risk-scanner'

let mockStorage: Record<string, unknown> = {}

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(mockStorage, items)
      }),
    },
  },
})

describe('RiskScanner', () => {
  let scanner: RiskScanner

  beforeEach(() => {
    mockStorage = {}
    vi.clearAllMocks()
    scanner = new RiskScanner()
  })

  describe('initialize', () => {
    it('loads blocklists from chrome.storage', async () => {
      const scamAddress = 'rScamAddress123'
      mockStorage['otsu-blocklists'] = {
        addresses: [scamAddress],
        domains: ['evil-site.com'],
      }

      await scanner.initialize()

      const warnings = scanner.scan({
        tx: { Destination: scamAddress },
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'critical',
          code: 'BLOCKLISTED_ADDRESS',
        }),
      )
    })

    it('uses defaults when storage is empty', async () => {
      await scanner.initialize()

      const warnings = scanner.scan({
        tx: { Destination: 'rSafeAddress' },
      })

      const addressWarnings = warnings.filter((w) => w.code === 'BLOCKLISTED_ADDRESS')
      expect(addressWarnings).toHaveLength(0)
    })

    it('handles storage errors gracefully', async () => {
      vi.mocked(chrome.storage.local.get).mockRejectedValueOnce(new Error('storage unavailable'))

      await expect(scanner.initialize()).resolves.toBeUndefined()
    })
  })

  describe('address reputation', () => {
    it('returns critical warning for blocklisted address', async () => {
      const scamAddress = 'rBlocklistedScammer'
      mockStorage['otsu-blocklists'] = {
        addresses: [scamAddress],
        domains: [],
      }
      await scanner.initialize()

      const warnings = scanner.scan({
        tx: { Destination: scamAddress },
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'critical',
          code: 'BLOCKLISTED_ADDRESS',
          message: 'Destination address is on the scam blocklist',
        }),
      )
    })

    it('returns no warning for safe address', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSafeAddress123' },
      })

      const addressWarnings = warnings.filter((w) => w.code === 'BLOCKLISTED_ADDRESS')
      expect(addressWarnings).toHaveLength(0)
    })

    it('returns no warning when tx has no Destination', () => {
      const warnings = scanner.scan({
        tx: { TransactionType: 'TrustSet' },
      })

      const addressWarnings = warnings.filter((w) => w.code === 'BLOCKLISTED_ADDRESS')
      expect(addressWarnings).toHaveLength(0)
    })
  })

  describe('phishing domain', () => {
    it('returns critical warning for blocklisted domain', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'https://xrpl-airdrop.com/claim',
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'critical',
          code: 'PHISHING_DOMAIN',
          message: 'This website is on the phishing blocklist',
        }),
      )
    })

    it('returns no warning for safe domain', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'https://safe-dapp.example.com',
      })

      const phishingWarnings = warnings.filter((w) => w.code === 'PHISHING_DOMAIN')
      expect(phishingWarnings).toHaveLength(0)
    })

    it('includes custom domains after updateBlocklists', async () => {
      await scanner.updateBlocklists({ domains: ['custom-scam.io'] })

      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'https://custom-scam.io/phish',
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'critical',
          code: 'PHISHING_DOMAIN',
        }),
      )
    })

    it('does not check domain when origin is not provided', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
      })

      const phishingWarnings = warnings.filter((w) => w.code === 'PHISHING_DOMAIN')
      expect(phishingWarnings).toHaveLength(0)
    })
  })

  describe('unusual patterns', () => {
    it('returns medium warning for large transaction (>10% of balance)', () => {
      const warnings = scanner.scan({
        tx: {
          Destination: 'rSomeAddress',
          Amount: '20000000', // 20 XRP
        },
        accountBalance: '100000000', // 100 XRP
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'medium',
          code: 'LARGE_TRANSACTION',
          message: 'This transaction is more than 10% of your balance',
        }),
      )
    })

    it('returns no warning for small transaction (<= 10% of balance)', () => {
      const warnings = scanner.scan({
        tx: {
          Destination: 'rSomeAddress',
          Amount: '5000000', // 5 XRP
        },
        accountBalance: '100000000', // 100 XRP
      })

      const largeWarnings = warnings.filter((w) => w.code === 'LARGE_TRANSACTION')
      expect(largeWarnings).toHaveLength(0)
    })

    it('returns low warning for new recipient', () => {
      const knownRecipients = new Set(['rKnown1', 'rKnown2'])

      const warnings = scanner.scan({
        tx: { Destination: 'rNewRecipient' },
        knownRecipients,
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'low',
          code: 'NEW_RECIPIENT',
          message: 'This is the first transaction to this address',
        }),
      )
    })

    it('returns no warning for known recipient', () => {
      const knownRecipients = new Set(['rKnownAddress'])

      const warnings = scanner.scan({
        tx: { Destination: 'rKnownAddress' },
        knownRecipients,
      })

      const newRecipientWarnings = warnings.filter((w) => w.code === 'NEW_RECIPIENT')
      expect(newRecipientWarnings).toHaveLength(0)
    })

    it('skips balance check when accountBalance is not provided', () => {
      const warnings = scanner.scan({
        tx: {
          Destination: 'rSomeAddress',
          Amount: '99000000',
        },
      })

      const largeWarnings = warnings.filter((w) => w.code === 'LARGE_TRANSACTION')
      expect(largeWarnings).toHaveLength(0)
    })

    it('skips new recipient check when knownRecipients is not provided', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
      })

      const newRecipientWarnings = warnings.filter((w) => w.code === 'NEW_RECIPIENT')
      expect(newRecipientWarnings).toHaveLength(0)
    })
  })

  describe('exchange tag', () => {
    it('returns high warning for known exchange without destination tag', () => {
      // Bitstamp address from constants
      const bitstampAddress = 'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh'

      const warnings = scanner.scan({
        tx: { Destination: bitstampAddress },
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'high',
          code: 'MISSING_EXCHANGE_TAG',
          message: 'Destination tag is required for this exchange',
        }),
      )
    })

    it('returns no warning for known exchange with destination tag', () => {
      const bitstampAddress = 'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh'

      const warnings = scanner.scan({
        tx: {
          Destination: bitstampAddress,
          DestinationTag: 12345,
        },
      })

      const exchangeWarnings = warnings.filter((w) => w.code === 'MISSING_EXCHANGE_TAG')
      expect(exchangeWarnings).toHaveLength(0)
    })

    it('returns no warning for non-exchange address without tag', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rRandomAddress123' },
      })

      const exchangeWarnings = warnings.filter((w) => w.code === 'MISSING_EXCHANGE_TAG')
      expect(exchangeWarnings).toHaveLength(0)
    })
  })

  describe('domain verification', () => {
    it('returns medium warning for HTTP origin', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'http://insecure-dapp.com',
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'medium',
          code: 'INSECURE_ORIGIN',
          message: 'This website is not using HTTPS',
        }),
      )
    })

    it('returns no warning for HTTPS origin', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'https://secure-dapp.com',
      })

      const insecureWarnings = warnings.filter((w) => w.code === 'INSECURE_ORIGIN')
      expect(insecureWarnings).toHaveLength(0)
    })

    it('allows localhost without HTTPS', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'http://localhost:3000',
      })

      const insecureWarnings = warnings.filter((w) => w.code === 'INSECURE_ORIGIN')
      expect(insecureWarnings).toHaveLength(0)
    })

    it('returns low warning for invalid origin URL', () => {
      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'not-a-valid-url',
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'low',
          code: 'UNKNOWN_ORIGIN',
        }),
      )
    })
  })

  describe('NFT transfer fee', () => {
    it('returns medium warning for high NFT transfer fee (>10%)', () => {
      const warnings = scanner.scan({
        tx: {
          TransactionType: 'NFTokenMint',
          TransferFee: 15000, // 15%
        },
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'medium',
          code: 'HIGH_NFT_TRANSFER_FEE',
        }),
      )
    })

    it('returns no warning for normal NFT transfer fee', () => {
      const warnings = scanner.scan({
        tx: {
          TransactionType: 'NFTokenMint',
          TransferFee: 5000, // 5%
        },
      })

      const nftWarnings = warnings.filter((w) => w.code === 'HIGH_NFT_TRANSFER_FEE')
      expect(nftWarnings).toHaveLength(0)
    })

    it('skips check for non-NFT transactions', () => {
      const warnings = scanner.scan({
        tx: {
          TransactionType: 'Payment',
          Destination: 'rSafe',
        },
      })

      const nftWarnings = warnings.filter((w) => w.code === 'HIGH_NFT_TRANSFER_FEE')
      expect(nftWarnings).toHaveLength(0)
    })
  })

  describe('large escrow', () => {
    it('returns high warning for large escrow (>50% of balance)', () => {
      const warnings = scanner.scan({
        tx: {
          TransactionType: 'EscrowCreate',
          Amount: '60000000', // 60 XRP
        },
        accountBalance: '100000000', // 100 XRP
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'high',
          code: 'LARGE_ESCROW',
        }),
      )
    })

    it('returns no warning for small escrow', () => {
      const warnings = scanner.scan({
        tx: {
          TransactionType: 'EscrowCreate',
          Amount: '10000000', // 10 XRP
        },
        accountBalance: '100000000', // 100 XRP
      })

      const escrowWarnings = warnings.filter((w) => w.code === 'LARGE_ESCROW')
      expect(escrowWarnings).toHaveLength(0)
    })

    it('skips check when no accountBalance', () => {
      const warnings = scanner.scan({
        tx: {
          TransactionType: 'EscrowCreate',
          Amount: '90000000',
        },
      })

      const escrowWarnings = warnings.filter((w) => w.code === 'LARGE_ESCROW')
      expect(escrowWarnings).toHaveLength(0)
    })
  })

  describe('getOverallRisk', () => {
    it('returns safe when there are no warnings', () => {
      expect(scanner.getOverallRisk([])).toBe('safe')
    })

    it('returns critical when any warning is critical', () => {
      const result = scanner.getOverallRisk([
        { level: 'low', code: 'NEW_RECIPIENT', message: 'test' },
        { level: 'critical', code: 'BLOCKLISTED_ADDRESS', message: 'test' },
      ])
      expect(result).toBe('critical')
    })

    it('returns high when highest warning is high', () => {
      const result = scanner.getOverallRisk([
        { level: 'low', code: 'NEW_RECIPIENT', message: 'test' },
        { level: 'high', code: 'MISSING_EXCHANGE_TAG', message: 'test' },
        { level: 'medium', code: 'LARGE_TRANSACTION', message: 'test' },
      ])
      expect(result).toBe('high')
    })

    it('returns medium when highest warning is medium', () => {
      const result = scanner.getOverallRisk([
        { level: 'low', code: 'NEW_RECIPIENT', message: 'test' },
        { level: 'medium', code: 'LARGE_TRANSACTION', message: 'test' },
      ])
      expect(result).toBe('medium')
    })

    it('returns low when all warnings are low', () => {
      const result = scanner.getOverallRisk([
        { level: 'low', code: 'NEW_RECIPIENT', message: 'test' },
      ])
      expect(result).toBe('low')
    })
  })

  describe('updateBlocklists', () => {
    it('persists updated blocklists to chrome.storage', async () => {
      await scanner.updateBlocklists({
        addresses: ['rBadActor1', 'rBadActor2'],
        domains: ['scam-domain.net'],
      })

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        'otsu-blocklists': expect.objectContaining({
          addresses: expect.arrayContaining(['rBadActor1', 'rBadActor2']),
          domains: expect.arrayContaining(['scam-domain.net']),
        }),
      })
    })

    it('merges custom domains with default blocklist', async () => {
      await scanner.updateBlocklists({ domains: ['new-scam.io'] })

      const warnings = scanner.scan({
        tx: { Destination: 'rSomeAddress' },
        origin: 'https://xrpl-airdrop.com', // default blocklist entry
      })

      expect(warnings).toContainEqual(expect.objectContaining({ code: 'PHISHING_DOMAIN' }))
    })

    it('applies address blocklist immediately after update', async () => {
      const scamAddr = 'rNewlyReportedScam'
      await scanner.updateBlocklists({ addresses: [scamAddr] })

      const warnings = scanner.scan({
        tx: { Destination: scamAddr },
      })

      expect(warnings).toContainEqual(
        expect.objectContaining({
          level: 'critical',
          code: 'BLOCKLISTED_ADDRESS',
        }),
      )
    })
  })

  describe('combined scan', () => {
    it('returns multiple warnings from different checks', async () => {
      const scamAddress = 'rScammerAddr'
      await scanner.updateBlocklists({ addresses: [scamAddress] })

      const warnings = scanner.scan({
        tx: {
          Destination: scamAddress,
          Amount: '50000000',
        },
        origin: 'http://shady-site.com',
        accountBalance: '100000000',
        knownRecipients: new Set<string>(),
      })

      const codes = warnings.map((w) => w.code)
      expect(codes).toContain('BLOCKLISTED_ADDRESS')
      expect(codes).toContain('LARGE_TRANSACTION')
      expect(codes).toContain('NEW_RECIPIENT')
      expect(codes).toContain('INSECURE_ORIGIN')
    })
  })
})
