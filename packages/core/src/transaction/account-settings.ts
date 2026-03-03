import type { AccountSettingsParams } from '@otsu/types'

// XRPL AccountSet flags
export const ACCOUNT_SET_FLAGS = {
  asfRequireDest: 1,
  asfRequireAuth: 2,
  asfDisallowXRP: 3,
  asfDisableMaster: 4,
  asfNoFreeze: 6,
  asfGlobalFreeze: 7,
  asfDefaultRipple: 8,
  asfDepositAuth: 9,
} as const

export function buildAccountSet(
  account: string,
  params: AccountSettingsParams,
): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'AccountSet',
    Account: account,
  }

  if (params.domain !== undefined) {
    tx.Domain = hexEncode(params.domain)
  }

  if (params.emailHash !== undefined) {
    tx.EmailHash = params.emailHash
  }

  if (params.setFlag !== undefined) {
    tx.SetFlag = params.setFlag
  }

  if (params.clearFlag !== undefined) {
    tx.ClearFlag = params.clearFlag
  }

  return tx
}

function hexEncode(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}
