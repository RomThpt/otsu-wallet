export interface XrplUri {
  address: string
  amount?: string
  destinationTag?: number
  currency?: string
  issuer?: string
}

export function parseXrplUri(uri: string): XrplUri | null {
  const cleaned = uri.replace(/^(web\+)?xrpl:/i, '')

  const [addressPart, queryString] = cleaned.split('?')

  if (!addressPart) return null

  const address = addressPart.trim()

  if (!/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address)) return null

  const result: XrplUri = { address }

  if (queryString) {
    const params = new URLSearchParams(queryString)

    const amount = params.get('amount')
    if (amount) {
      const drops = Number(amount)
      if (!isNaN(drops) && drops > 0) {
        result.amount = (drops / 1_000_000).toFixed(6)
      }
    }

    const dt = params.get('dt')
    if (dt) {
      const tag = parseInt(dt, 10)
      if (!isNaN(tag) && tag >= 0) {
        result.destinationTag = tag
      }
    }

    const currency = params.get('currency')
    if (currency) {
      result.currency = currency
    }

    const issuer = params.get('issuer')
    if (issuer) {
      result.issuer = issuer
    }
  }

  return result
}
