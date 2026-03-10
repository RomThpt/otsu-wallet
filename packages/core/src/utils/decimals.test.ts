import { describe, it, expect } from 'vitest'
import { xrplDropsToEvmWei, evmWeiToXrplDrops, formatEvmXrp } from './decimals'

// Conversion factor between drops (6 decimals) and wei (18 decimals) is 10^12.
const FACTOR = 10n ** 12n

describe('decimals', () => {
  describe('xrplDropsToEvmWei', () => {
    it('should convert 1 drop to 10^12 wei', () => {
      expect(xrplDropsToEvmWei('1')).toBe(FACTOR.toString())
    })

    it('should convert 1_000_000 drops (1 XRP) to 10^18 wei', () => {
      expect(xrplDropsToEvmWei('1000000')).toBe((10n ** 18n).toString())
    })

    it('should convert 0 drops to 0 wei', () => {
      expect(xrplDropsToEvmWei('0')).toBe('0')
    })

    it('should handle large drop amounts', () => {
      // 100 billion XRP total supply = 100_000_000_000 * 1_000_000 drops
      const drops = '100000000000000000'
      const expected = (BigInt(drops) * FACTOR).toString()
      expect(xrplDropsToEvmWei(drops)).toBe(expected)
    })

    it('should convert 500_000 drops (0.5 XRP) correctly', () => {
      expect(xrplDropsToEvmWei('500000')).toBe((5n * 10n ** 17n).toString())
    })

    it('should convert 12 drops correctly', () => {
      expect(xrplDropsToEvmWei('12')).toBe((12n * FACTOR).toString())
    })
  })

  describe('evmWeiToXrplDrops', () => {
    it('should convert 10^12 wei to 1 drop', () => {
      expect(evmWeiToXrplDrops(FACTOR.toString())).toBe('1')
    })

    it('should convert 10^18 wei (1 XRP in EVM) to 1_000_000 drops', () => {
      expect(evmWeiToXrplDrops((10n ** 18n).toString())).toBe('1000000')
    })

    it('should convert 0 wei to 0 drops', () => {
      expect(evmWeiToXrplDrops('0')).toBe('0')
    })

    it('should truncate sub-drop precision', () => {
      // 10^12 - 1 wei is less than 1 drop — should truncate to 0
      expect(evmWeiToXrplDrops((FACTOR - 1n).toString())).toBe('0')
    })

    it('should truncate fractional drops without rounding', () => {
      // 1.9 drops worth of wei should truncate to 1
      const weiFor1point9Drops = (FACTOR + (FACTOR * 9n) / 10n).toString()
      expect(evmWeiToXrplDrops(weiFor1point9Drops)).toBe('1')
    })

    it('should handle large wei values', () => {
      const drops = '100000000000000000'
      const wei = (BigInt(drops) * FACTOR).toString()
      expect(evmWeiToXrplDrops(wei)).toBe(drops)
    })

    it('should round-trip with xrplDropsToEvmWei for whole drop amounts', () => {
      const drops = '42000000'
      const wei = xrplDropsToEvmWei(drops)
      expect(evmWeiToXrplDrops(wei)).toBe(drops)
    })
  })

  describe('formatEvmXrp', () => {
    it('should format 0 wei as "0"', () => {
      expect(formatEvmXrp('0')).toBe('0')
    })

    it('should format 10^18 wei (1 XRP) as "1"', () => {
      expect(formatEvmXrp((10n ** 18n).toString())).toBe('1')
    })

    it('should format 5 * 10^17 wei (0.5 XRP) as "0.5"', () => {
      expect(formatEvmXrp((5n * 10n ** 17n).toString())).toBe('0.5')
    })

    it('should format 1_000_000 drops in wei as "1"', () => {
      const wei = xrplDropsToEvmWei('1000000')
      expect(formatEvmXrp(wei)).toBe('1')
    })

    it('should strip trailing zeros in fractional part', () => {
      // 1.5 XRP = 1.5 * 10^18 wei
      const wei = (15n * 10n ** 17n).toString()
      expect(formatEvmXrp(wei)).toBe('1.5')
    })

    it('should format a very small amount (1 wei) correctly', () => {
      // 1 wei = 0.000000000000000001 XRP
      expect(formatEvmXrp('1')).toBe('0.000000000000000001')
    })

    it('should format 1 drop (10^12 wei) as "0.000001"', () => {
      expect(formatEvmXrp(FACTOR.toString())).toBe('0.000001')
    })

    it('should format multi-XRP amounts without fractional part when whole', () => {
      const wei = (100n * 10n ** 18n).toString()
      expect(formatEvmXrp(wei)).toBe('100')
    })

    it('should format fractional amounts with correct precision', () => {
      // 1.000000000000000001 XRP (1 XRP + 1 wei)
      const wei = (10n ** 18n + 1n).toString()
      expect(formatEvmXrp(wei)).toBe('1.000000000000000001')
    })

    it('should format 2.5 XRP correctly', () => {
      const wei = (25n * 10n ** 17n).toString()
      expect(formatEvmXrp(wei)).toBe('2.5')
    })
  })
})
