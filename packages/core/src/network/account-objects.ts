import type { EscrowRecord, CheckRecord } from '@otsu/types'

export function parseEscrows(objects: Record<string, unknown>[]): EscrowRecord[] {
  return objects
    .filter((obj) => obj.LedgerEntryType === 'Escrow')
    .map((obj) => {
      const record: EscrowRecord = {
        seq: obj.Sequence as number,
        account: obj.Account as string,
        destination: obj.Destination as string,
        amount: obj.Amount as string,
      }

      if (obj.Condition) record.condition = obj.Condition as string
      if (obj.CancelAfter !== undefined) record.cancelAfter = obj.CancelAfter as number
      if (obj.FinishAfter !== undefined) record.finishAfter = obj.FinishAfter as number
      if (obj.PreviousTxnID) record.previousTxnID = obj.PreviousTxnID as string

      return record
    })
}

export function parseChecks(objects: Record<string, unknown>[]): CheckRecord[] {
  return objects
    .filter((obj) => obj.LedgerEntryType === 'Check')
    .map((obj) => {
      const sendMax = obj.SendMax
      let parsedSendMax: string | { currency: string; issuer: string; value: string }

      if (typeof sendMax === 'string') {
        parsedSendMax = sendMax
      } else if (typeof sendMax === 'object' && sendMax !== null) {
        const amt = sendMax as { currency: string; issuer: string; value: string }
        parsedSendMax = { currency: amt.currency, issuer: amt.issuer, value: amt.value }
      } else {
        parsedSendMax = '0'
      }

      const record: CheckRecord = {
        index: obj.index as string,
        account: obj.Account as string,
        destination: obj.Destination as string,
        sendMax: parsedSendMax,
        sequence: obj.Sequence as number,
      }

      if (obj.Expiration !== undefined) record.expiration = obj.Expiration as number

      return record
    })
}
