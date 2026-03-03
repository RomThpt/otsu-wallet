export interface EscrowRecord {
  seq: number
  account: string
  destination: string
  amount: string
  condition?: string
  cancelAfter?: number
  finishAfter?: number
  previousTxnID?: string
}

export interface CheckRecord {
  index: string
  account: string
  destination: string
  sendMax: string | { currency: string; issuer: string; value: string }
  expiration?: number
  sequence: number
}

export interface AccountFlags {
  requireDestTag: boolean
  disallowXRP: boolean
  defaultRipple: boolean
  globalFreeze: boolean
  noFreeze: boolean
  depositAuth: boolean
}

export interface CreateEscrowParams {
  destination: string
  amount: string
  condition?: string
  cancelAfter?: number
  finishAfter?: number
  destinationTag?: number
}

export interface FinishEscrowParams {
  owner: string
  offerSequence: number
  condition?: string
  fulfillment?: string
}

export interface CancelEscrowParams {
  owner: string
  offerSequence: number
}

export interface CreateCheckParams {
  destination: string
  sendMax: string | { currency: string; issuer: string; value: string }
  expiration?: number
  destinationTag?: number
}

export interface CashCheckParams {
  checkID: string
  amount?: string | { currency: string; issuer: string; value: string }
  deliverMin?: string | { currency: string; issuer: string; value: string }
}

export interface CancelCheckParams {
  checkID: string
}

export interface AccountSettingsParams {
  domain?: string
  emailHash?: string
  setFlag?: number
  clearFlag?: number
}
