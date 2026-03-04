import type { SimulationResult, BalanceChange } from '@otsu/types'
import { DROPS_PER_XRP } from '@otsu/constants'

export class TransactionSimulator {
  simulate(tx: Record<string, unknown>, accountBalance?: string): SimulationResult {
    try {
      const txType = tx.TransactionType as string
      const fee = (tx.Fee as string) ?? '12'

      const balanceChanges: BalanceChange[] = []
      let objectsCreated = 0
      let objectsDeleted = 0

      // Fee is always deducted from sender
      const feeXrp = (Number(fee) / DROPS_PER_XRP).toFixed(6)

      switch (txType) {
        case 'Payment': {
          const amount = tx.Amount
          if (typeof amount === 'string') {
            // XRP payment (in drops)
            const dropsNum = Number(amount)
            const xrpAmount = (dropsNum / DROPS_PER_XRP).toFixed(6)
            const totalDeducted = ((dropsNum + Number(fee)) / DROPS_PER_XRP).toFixed(6)

            const currentBalance = accountBalance
              ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
              : '0'
            const afterBalance = (Number(currentBalance) - Number(totalDeducted)).toFixed(6)

            balanceChanges.push({
              currency: 'XRP',
              before: currentBalance,
              after: afterBalance,
              delta: `-${xrpAmount}`,
            })
          } else if (amount && typeof amount === 'object') {
            // Token payment
            const tokenAmount = amount as { currency: string; issuer: string; value: string }
            balanceChanges.push({
              currency: tokenAmount.currency,
              issuer: tokenAmount.issuer,
              before: '0', // We don't know the before, client can fill this
              after: '0',
              delta: `-${tokenAmount.value}`,
            })
            // Fee still deducted in XRP
            const currentXrp = accountBalance
              ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
              : '0'
            balanceChanges.push({
              currency: 'XRP',
              before: currentXrp,
              after: (Number(currentXrp) - Number(feeXrp)).toFixed(6),
              delta: `-${feeXrp}`,
            })
          }
          break
        }

        case 'TrustSet': {
          // TrustSet creates a trust line object if LimitAmount > 0
          const limitAmount = tx.LimitAmount as { value?: string } | undefined
          if (limitAmount && Number(limitAmount.value) > 0) {
            objectsCreated = 1 // Creates a RippleState object
          } else {
            objectsDeleted = 1 // Removes a RippleState object
          }
          // Only fee deducted
          const currentXrp = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp,
            after: (Number(currentXrp) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
          break
        }

        case 'OfferCreate': {
          objectsCreated = 1
          const currentXrp = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp,
            after: (Number(currentXrp) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
          break
        }

        case 'OfferCancel': {
          objectsDeleted = 1
          const currentXrp4 = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp4,
            after: (Number(currentXrp4) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
          break
        }

        case 'NFTokenMint': {
          objectsCreated = 1
          const currentXrp5 = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp5,
            after: (Number(currentXrp5) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
          break
        }

        case 'NFTokenBurn': {
          objectsDeleted = 1
          const currentXrp6 = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp6,
            after: (Number(currentXrp6) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
          break
        }

        case 'NFTokenCreateOffer': {
          objectsCreated = 1
          const currentXrp7 = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          // Buy offers lock XRP
          const flags = (tx.Flags as number) ?? 0
          const isSell = (flags & 1) !== 0
          if (!isSell && typeof tx.Amount === 'string') {
            const lockAmount = Number(tx.Amount) / DROPS_PER_XRP
            const totalDeducted = lockAmount + Number(feeXrp)
            balanceChanges.push({
              currency: 'XRP',
              before: currentXrp7,
              after: (Number(currentXrp7) - totalDeducted).toFixed(6),
              delta: `-${lockAmount.toFixed(6)}`,
            })
          } else {
            balanceChanges.push({
              currency: 'XRP',
              before: currentXrp7,
              after: (Number(currentXrp7) - Number(feeXrp)).toFixed(6),
              delta: `-${feeXrp}`,
            })
          }
          break
        }

        case 'NFTokenAcceptOffer': {
          const currentXrp8 = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp8,
            after: (Number(currentXrp8) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
          break
        }

        case 'CheckCreate':
        case 'EscrowCreate': {
          objectsCreated = 1
          const currentXrp9 = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp9,
            after: (Number(currentXrp9) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
          break
        }

        case 'ContractCall': {
          // Fee = gas limit for contract calls
          const currentXrpContract = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'

          let totalDelta = Number(feeXrp)

          // Check parameters for tfSendAmount flag (0x01) to detect XRP transfers
          const params = tx.Parameters as Array<Record<string, unknown>> | undefined
          if (params) {
            for (const param of params) {
              const inner = (param.ContractParameter ?? param) as Record<string, unknown>
              const flags = (inner.Flags as number) ?? 0
              if (flags & 0x01) {
                // tfSendAmount - parameter carries a token amount
                const paramValue = Number(inner.Value ?? 0)
                if (paramValue > 0) {
                  totalDelta += paramValue / DROPS_PER_XRP
                }
              }
            }
          }

          balanceChanges.push({
            currency: 'XRP',
            before: currentXrpContract,
            after: (Number(currentXrpContract) - totalDelta).toFixed(6),
            delta: `-${totalDelta.toFixed(6)}`,
          })
          break
        }

        default: {
          // Unknown type - just show fee
          const currentXrp = accountBalance
            ? (Number(accountBalance) / DROPS_PER_XRP).toFixed(6)
            : '0'
          balanceChanges.push({
            currency: 'XRP',
            before: currentXrp,
            after: (Number(currentXrp) - Number(feeXrp)).toFixed(6),
            delta: `-${feeXrp}`,
          })
        }
      }

      return {
        success: true,
        balanceChanges,
        fee: feeXrp,
        objectsCreated,
        objectsDeleted,
      }
    } catch (error) {
      return {
        success: false,
        balanceChanges: [],
        fee: '0',
        objectsCreated: 0,
        objectsDeleted: 0,
        error: (error as Error).message,
      }
    }
  }
}
