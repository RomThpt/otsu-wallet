import type { TokenBalance, TrustlineParams } from '@otsu/types'
import type { XrplClient } from '../network/client'

export class TokenClient {
  constructor(private client: XrplClient) {}

  async getAccountTokens(address: string): Promise<TokenBalance[]> {
    const lines = await this.client.getAccountLines(address)
    return lines.map((line) => ({
      currency: line.currency as string,
      issuer: line.account as string,
      value: line.balance as string,
      limit: line.limit as string,
      noRipple: (line.no_ripple ?? false) as boolean,
    }))
  }

  buildSetTrustline(account: string, params: TrustlineParams): Record<string, unknown> {
    return {
      TransactionType: 'TrustSet',
      Account: account,
      LimitAmount: {
        currency: params.currency,
        issuer: params.issuer,
        value: params.limit,
      },
      Flags: 0x00020000, // tfSetNoRipple
    }
  }

  buildRemoveTrustline(account: string, currency: string, issuer: string): Record<string, unknown> {
    return {
      TransactionType: 'TrustSet',
      Account: account,
      LimitAmount: {
        currency,
        issuer,
        value: '0',
      },
    }
  }
}
