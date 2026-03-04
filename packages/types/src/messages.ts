export type ExtensionMessageType =
  | 'GET_STATE'
  | 'CREATE_WALLET'
  | 'UNLOCK'
  | 'LOCK'
  | 'GET_BALANCE'
  | 'SEND_PAYMENT'
  | 'SWITCH_NETWORK'
  | 'REQUEST_FAUCET'
  | 'GET_ACCOUNTS'
  | 'ADD_ACCOUNT'
  | 'SIGN_TRANSACTION'
  | 'IMPORT_ACCOUNT'
  | 'SET_ACTIVE_ACCOUNT'
  | 'UPDATE_ACCOUNT_LABEL'
  | 'GET_TOKENS'
  | 'SET_TRUSTLINE'
  | 'REMOVE_TRUSTLINE'
  | 'SEND_TOKEN_PAYMENT'
  | 'GET_TRANSACTION_HISTORY'
  | 'GET_XRP_PRICE'
  | 'DERIVE_MORE_ACCOUNTS'
  | 'GET_CACHED_DATA'

export interface ExtensionMessage<T = unknown> {
  type: ExtensionMessageType
  payload?: T
}

export interface ExtensionResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface CreateWalletPayload {
  mnemonic: string
  password?: string
  authMethod: 'password' | 'passkey'
}

export interface UnlockPayload {
  password?: string
}

export interface SendPaymentPayload {
  destination: string
  amount: string
  destinationTag?: number
}

export interface SwitchNetworkPayload {
  networkId: string
}

export interface ImportAccountPayload {
  format: 'mnemonic' | 'secret_key' | 'family_seed' | 'private_key_hex' | 'xumm_secret_numbers'
  value: string
  label?: string
  mnemonicIndex?: number
}

export interface SetActiveAccountPayload {
  address: string
}

export interface UpdateAccountLabelPayload {
  address: string
  label: string
}

export interface SetTrustlinePayload {
  currency: string
  issuer: string
  limit: string
}

export interface RemoveTrustlinePayload {
  currency: string
  issuer: string
}

export interface SendTokenPaymentPayload {
  destination: string
  currency: string
  issuer: string
  value: string
  destinationTag?: number
}

export interface GetTransactionHistoryPayload {
  marker?: unknown
  limit?: number
}

export interface DeriveMoreAccountsPayload {
  count: number
}
