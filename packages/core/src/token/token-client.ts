import type { OwnedXrplAsset, TokenBalance, TrustlineParams } from '@otsu/types'
import type { XrplClient } from '../network/client'
import { transactionValueToDisplay, xrplAssetKey, xrplAssetSymbol } from './xrpl-assets'

const MPT_CAN_TRADE_FLAG = 0x00000010
const MPT_REQUIRE_AUTH_FLAG = 0x00000004
const MPT_LOCKED_FLAG = 0x00000001
const MPT_AUTHORIZED_FLAG = 0x00000002
const ACCOUNT_REQUIRE_AUTH_FLAG = 0x00040000
const ACCOUNT_GLOBAL_FREEZE_FLAG = 0x00400000

function decodeMptMetadata(value: unknown): { name?: string; ticker?: string } {
  if (typeof value !== 'string' || value.length === 0 || value.length % 2 !== 0) return {}
  try {
    const bytes = new Uint8Array(value.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)))
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
    return {
      name: typeof parsed.name === 'string' ? parsed.name : undefined,
      ticker: typeof parsed.ticker === 'string' ? parsed.ticker : undefined,
    }
  } catch {
    return {}
  }
}

export class TokenClient {
  constructor(private client: XrplClient) {}

  async getAccountTokens(address: string): Promise<TokenBalance[]> {
    const lines = await this.client.getAccountLines(address)
    const issuers = [...new Set(lines.map((line) => String(line.account)))]
    const issuerFlags = new Map(
      await Promise.all(
        issuers.map(async (issuer) => {
          const result = await this.client.request({
            command: 'account_info',
            account: issuer,
            ledger_index: 'validated',
          })
          return [
            issuer,
            Number((result.account_data as Record<string, unknown> | undefined)?.Flags ?? 0),
          ] as const
        }),
      ),
    )
    return lines.map((line) => ({
      currency: line.currency as string,
      issuer: line.account as string,
      value: line.balance as string,
      limit: line.limit as string,
      noRipple: (line.no_ripple ?? false) as boolean,
      authorized:
        ((issuerFlags.get(String(line.account)) ?? 0) & ACCOUNT_REQUIRE_AUTH_FLAG) === 0 ||
        line.peer_authorized === true,
      frozen:
        line.freeze === true ||
        line.freeze_peer === true ||
        ((issuerFlags.get(String(line.account)) ?? 0) & ACCOUNT_GLOBAL_FREEZE_FLAG) !== 0,
      disabledReason:
        line.freeze === true ||
        line.freeze_peer === true ||
        ((issuerFlags.get(String(line.account)) ?? 0) & ACCOUNT_GLOBAL_FREEZE_FLAG) !== 0
          ? 'Frozen by issuer'
          : ((issuerFlags.get(String(line.account)) ?? 0) & ACCOUNT_REQUIRE_AUTH_FLAG) !== 0 &&
              line.peer_authorized !== true
            ? 'Issuer authorization required'
            : undefined,
    }))
  }

  async getMptTokens(address: string): Promise<OwnedXrplAsset[]> {
    const objects: Record<string, unknown>[] = []
    let marker: unknown
    do {
      const page = await this.client.getAccountObjects(address, undefined, marker)
      objects.push(...page.objects.filter((object) => object.LedgerEntryType === 'MPToken'))
      marker = page.marker
    } while (marker)

    return Promise.all(
      objects.map(async (object) => {
        const issuanceId = String(object.MPTokenIssuanceID ?? '')
        if (!/^[A-Fa-f0-9]{48}$/.test(issuanceId)) {
          throw new Error('Account contains an invalid MPT issuance identifier')
        }
        const result = await this.client.request({
          command: 'ledger_entry',
          mpt_issuance: issuanceId,
          ledger_index: 'validated',
        })
        const node = (result.node ?? {}) as Record<string, unknown>
        const assetScale = Number(node.AssetScale ?? 0)
        if (!Number.isInteger(assetScale) || assetScale < 0 || assetScale > 18) {
          throw new Error('MPT issuance has an invalid asset scale')
        }
        const asset = {
          type: 'mpt' as const,
          issuanceId,
          assetScale,
          issuer: typeof node.Issuer === 'string' ? node.Issuer : undefined,
        }
        const metadata = decodeMptMetadata(node.MPTokenMetadata)
        const totalTransactionBalance = String(object.MPTAmount ?? '0')
        const lockedTransactionBalance = String(object.LockedAmount ?? '0')
        if (!/^\d+$/.test(totalTransactionBalance) || !/^\d+$/.test(lockedTransactionBalance)) {
          throw new Error('MPT holding contains an invalid balance')
        }
        const transactionBalance = (
          BigInt(totalTransactionBalance) - BigInt(lockedTransactionBalance)
        ).toString()
        if (BigInt(transactionBalance) < 0n) {
          throw new Error('MPT locked balance exceeds the total balance')
        }
        const symbol = metadata.ticker?.trim().slice(0, 20) || xrplAssetSymbol(asset)
        const flags = Number(node.Flags ?? 0)
        const holderFlags = Number(object.Flags ?? 0)
        const authorized =
          (flags & MPT_REQUIRE_AUTH_FLAG) === 0 || (holderFlags & MPT_AUTHORIZED_FLAG) !== 0
        const locked = (flags & MPT_LOCKED_FLAG) !== 0 || (holderFlags & MPT_LOCKED_FLAG) !== 0
        const tradeable = authorized && !locked && (flags & MPT_CAN_TRADE_FLAG) !== 0
        return {
          key: xrplAssetKey(asset),
          asset,
          symbol,
          name: metadata.name?.trim().slice(0, 80) || symbol,
          balance: transactionValueToDisplay(asset, transactionBalance),
          transactionBalance,
          lockedBalance: transactionValueToDisplay(asset, lockedTransactionBalance),
          authorized,
          tradeable,
          disabledReason: !authorized
            ? 'Issuer authorization required'
            : locked
              ? 'Locked by issuer'
              : (flags & MPT_CAN_TRADE_FLAG) === 0
                ? 'Trading disabled by issuer'
                : undefined,
        }
      }),
    )
  }

  buildSetTrustline(account: string, params: TrustlineParams): Record<string, unknown> {
    for (const [label, quality] of [
      ['QualityIn', params.qualityIn],
      ['QualityOut', params.qualityOut],
    ] as const) {
      if (
        quality !== undefined &&
        (!Number.isInteger(quality) || quality < 0 || quality > 0xffffffff)
      ) {
        throw new Error(`${label} must be an unsigned 32-bit integer`)
      }
    }
    return {
      TransactionType: 'TrustSet',
      Account: account,
      LimitAmount: {
        currency: params.currency,
        issuer: params.issuer,
        value: params.limit,
      },
      Flags: 0x00020000, // tfSetNoRipple
      ...(params.qualityIn !== undefined ? { QualityIn: params.qualityIn } : {}),
      ...(params.qualityOut !== undefined ? { QualityOut: params.qualityOut } : {}),
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
