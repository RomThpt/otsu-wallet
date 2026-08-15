import type { XrplAsset, XrplAssetAmount } from '@otsu/types'

interface ExactDecimal {
  coefficient: bigint
  scale: number
}

const MAX_IOU_DECIMALS = 15
const MAX_MPT_AMOUNT = 0x7fffffffffffffffn

function powerOfTen(exponent: number): bigint {
  if (!Number.isInteger(exponent) || exponent < 0 || exponent > 100) {
    throw new Error('Decimal precision is out of range')
  }
  return 10n ** BigInt(exponent)
}

export function parseExactDecimal(value: string): ExactDecimal {
  const normalized = value.trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    throw new Error('Amount must be a positive decimal number')
  }
  const [whole, fraction = ''] = normalized.split('.')
  return normalizeExactDecimal({
    coefficient: BigInt(`${whole}${fraction}`),
    scale: fraction.length,
  })
}

export function normalizeExactDecimal(value: ExactDecimal): ExactDecimal {
  let { coefficient, scale } = value
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n
    scale--
  }
  return { coefficient, scale }
}

export function exactDecimalToString(value: ExactDecimal): string {
  const normalized = normalizeExactDecimal(value)
  if (normalized.scale === 0) return normalized.coefficient.toString()
  const digits = normalized.coefficient.toString().padStart(normalized.scale + 1, '0')
  const split = digits.length - normalized.scale
  return `${digits.slice(0, split)}.${digits.slice(split)}`
}

export function compareExactDecimals(left: ExactDecimal, right: ExactDecimal): number {
  const scale = Math.max(left.scale, right.scale)
  const leftValue = left.coefficient * powerOfTen(scale - left.scale)
  const rightValue = right.coefficient * powerOfTen(scale - right.scale)
  return leftValue === rightValue ? 0 : leftValue < rightValue ? -1 : 1
}

export function subtractExactDecimals(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const scale = Math.max(left.scale, right.scale)
  const coefficient =
    left.coefficient * powerOfTen(scale - left.scale) -
    right.coefficient * powerOfTen(scale - right.scale)
  if (coefficient < 0n) throw new Error('Amount subtraction would be negative')
  return normalizeExactDecimal({ coefficient, scale })
}

export function addExactDecimals(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const scale = Math.max(left.scale, right.scale)
  return normalizeExactDecimal({
    coefficient:
      left.coefficient * powerOfTen(scale - left.scale) +
      right.coefficient * powerOfTen(scale - right.scale),
    scale,
  })
}

export function multiplyDivideExact(
  amount: ExactDecimal,
  numerator: ExactDecimal,
  denominator: ExactDecimal,
  outputScale: number,
): ExactDecimal {
  if (denominator.coefficient === 0n) throw new Error('Order book contains a zero amount')
  let dividend = amount.coefficient * numerator.coefficient
  let divisor = denominator.coefficient
  const exponent = denominator.scale + outputScale - amount.scale - numerator.scale
  if (exponent >= 0) dividend *= powerOfTen(exponent)
  else divisor *= powerOfTen(-exponent)
  return normalizeExactDecimal({ coefficient: dividend / divisor, scale: outputScale })
}

export function applySlippage(
  value: ExactDecimal,
  slippageBps: number,
  outputScale = value.scale,
): ExactDecimal {
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 5_000) {
    throw new Error('Slippage must be between 0% and 50%')
  }
  let dividend = value.coefficient * BigInt(10_000 - slippageBps)
  let divisor = 10_000n
  const exponent = outputScale - value.scale
  if (exponent >= 0) dividend *= powerOfTen(exponent)
  else divisor *= powerOfTen(-exponent)
  return normalizeExactDecimal({ coefficient: dividend / divisor, scale: outputScale })
}

export function xrplAssetKey(asset: XrplAsset): string {
  if (asset.type === 'native') return 'native:XRP'
  if (asset.type === 'issued') return `issued:${asset.currency}:${asset.issuer}`
  return `mpt:${asset.issuanceId}`
}

export function xrplAssetSymbol(asset: XrplAsset): string {
  if (asset.type === 'native') return 'XRP'
  if (asset.type === 'issued') return asset.currency
  return `MPT ${asset.issuanceId.slice(0, 6)}`
}

export function xrplAssetBookSpec(asset: XrplAsset): Record<string, string> {
  if (asset.type === 'native') return { currency: 'XRP' }
  if (asset.type === 'issued') return { currency: asset.currency, issuer: asset.issuer }
  return { mpt_issuance_id: asset.issuanceId }
}

export function xrplAssetAmount(asset: XrplAsset, displayAmount: string): XrplAssetAmount {
  const amount = parseExactDecimal(displayAmount)
  if (amount.coefficient <= 0n) throw new Error('Amount must be greater than zero')
  if (asset.type === 'native') {
    if (amount.scale > 6) throw new Error('XRP supports at most 6 decimal places')
    return (amount.coefficient * powerOfTen(6 - amount.scale)).toString()
  }
  if (asset.type === 'mpt') {
    if (amount.scale > asset.assetScale) {
      throw new Error(`This MPT supports at most ${asset.assetScale} decimal places`)
    }
    const value = amount.coefficient * powerOfTen(asset.assetScale - amount.scale)
    if (value > MAX_MPT_AMOUNT) throw new Error('MPT amount exceeds the protocol maximum')
    return {
      mpt_issuance_id: asset.issuanceId,
      value: value.toString(),
    }
  }
  if (amount.scale > MAX_IOU_DECIMALS) {
    throw new Error(`Issued currencies support at most ${MAX_IOU_DECIMALS} decimal places`)
  }
  return { currency: asset.currency, issuer: asset.issuer, value: exactDecimalToString(amount) }
}

export function transactionAmountValue(amount: XrplAssetAmount): string {
  return typeof amount === 'string' ? amount : amount.value
}

export function transactionValueToDisplay(asset: XrplAsset, value: string): string {
  const amount = parseExactDecimal(value)
  if (asset.type === 'issued') return exactDecimalToString(amount)
  const scale = asset.type === 'native' ? 6 : asset.assetScale
  if (amount.scale !== 0) throw new Error('Atomic XRP and MPT amounts must be integers')
  return exactDecimalToString({ coefficient: amount.coefficient, scale })
}

export function quoteOutputScale(asset: XrplAsset): number {
  return asset.type === 'issued' ? MAX_IOU_DECIMALS : 0
}
