import { XRP_DECIMALS_XRPL, XRP_DECIMALS_EVM } from '@otsu/constants'

const XRPL_FACTOR = 10n ** BigInt(XRP_DECIMALS_XRPL)
const EVM_FACTOR = 10n ** BigInt(XRP_DECIMALS_EVM)
const CONVERSION_FACTOR = EVM_FACTOR / XRPL_FACTOR // 10^12

/**
 * Convert XRPL drops (6 decimals) to EVM wei (18 decimals).
 */
export function xrplDropsToEvmWei(drops: string): string {
  return (BigInt(drops) * CONVERSION_FACTOR).toString()
}

/**
 * Convert EVM wei (18 decimals) to XRPL drops (6 decimals).
 * Truncates any sub-drop precision.
 */
export function evmWeiToXrplDrops(wei: string): string {
  return (BigInt(wei) / CONVERSION_FACTOR).toString()
}

/**
 * Format EVM wei (18-decimal XRP) for display as a human-readable string.
 */
export function formatEvmXrp(wei: string): string {
  const value = BigInt(wei)
  const whole = value / EVM_FACTOR
  const fraction = value % EVM_FACTOR
  const fractionStr = fraction.toString().padStart(XRP_DECIMALS_EVM, '0').replace(/0+$/, '')
  if (fractionStr === '') return whole.toString()
  return `${whole}.${fractionStr}`
}
