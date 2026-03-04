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
          // OfferCreate creates a directory entry
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
