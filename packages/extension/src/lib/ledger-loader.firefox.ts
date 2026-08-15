function unsupported(): never {
  throw new Error('Ledger WebHID is available in the Chromium extension')
}

export async function discoverLedgerEvmAccount(): Promise<never> {
  return unsupported()
}

export async function discoverLedgerXrplAccount(): Promise<never> {
  return unsupported()
}

export async function signLedgerEvmTransaction(): Promise<never> {
  return unsupported()
}

export async function signLedgerXrplTransaction(): Promise<never> {
  return unsupported()
}
