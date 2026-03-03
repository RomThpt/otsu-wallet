export const DEX_OFFER_FLAGS = {
  tfPassive: 0x00010000,
  tfImmediateOrCancel: 0x00020000,
  tfFillOrKill: 0x00040000,
  tfSell: 0x00080000,
} as const

export const MAX_ORDER_BOOK_DEPTH = 20

export const SLIPPAGE_WARNING_THRESHOLD = 0.05 // 5%
