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
  | 'PROVIDER_REQUEST'
  | 'SIGNING_APPROVED'
  | 'SIGNING_REJECTED'
  | 'GET_SIGNING_REQUEST'
  | 'GET_SETTINGS'
  | 'SET_SETTINGS'
  | 'GET_PERMISSIONS'
  | 'REVOKE_PERMISSION'
  | 'PROVIDER_EVENT'
  | 'GET_NFTS'
  | 'MINT_NFT'
  | 'BURN_NFT'
  | 'SELL_NFT'
  | 'BUY_NFT'
  | 'ACCEPT_NFT_OFFER'
  | 'CANCEL_NFT_OFFER'
  | 'GET_NFT_OFFERS'
  | 'CREATE_DEX_OFFER'
  | 'CANCEL_DEX_OFFER'
  | 'GET_ORDER_BOOK'
  | 'GET_ACCOUNT_OFFERS'
  | 'CREATE_ESCROW'
  | 'FINISH_ESCROW'
  | 'CANCEL_ESCROW'
  | 'CREATE_CHECK'
  | 'CASH_CHECK'
  | 'CANCEL_CHECK'
  | 'UPDATE_ACCOUNT_SETTINGS'
  | 'GET_ACCOUNT_ESCROWS'
  | 'GET_ACCOUNT_CHECKS'
  | 'GET_NFT_METADATA'
  | 'EXPORT_MNEMONIC'
  | 'RESET_WALLET'
  | 'GET_NETWORKS'
  | 'ADD_CUSTOM_NETWORK'
  | 'REMOVE_CUSTOM_NETWORK'
  | 'GET_CONTRACT_INFO'
  | 'CALL_CONTRACT'
  | 'CHANGE_AUTH_METHOD'
  | 'EVM_SEND_TRANSACTION'
  | 'EVM_GET_TOKENS'
  | 'EVM_CALL_CONTRACT'
  | 'EVM_ESTIMATE_GAS'
  | 'EVM_ADD_TOKEN'
  | 'BRIDGE_ESTIMATE'
  | 'BRIDGE_TRANSFER'
  | 'BRIDGE_STATUS'
  | 'BRIDGE_HISTORY'
  | 'IDENTITY_LOGIN'
  | 'IDENTITY_CALLBACK'
  | 'IDENTITY_LOGOUT'
  | 'IDENTITY_GET_STATE'
  | 'IDENTITY_REFRESH_PROFILE'
  | 'IDENTITY_LINK_WALLET'
  | 'IDENTITY_UNLINK_WALLET'
  | 'HAS_WALLET'

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
  credentialId?: string
  prfKey?: string
}

export interface UnlockPayload {
  method?: 'password' | 'passkey'
  password?: string
  passkeyKey?: string
}

export interface SendPaymentPayload {
  destination: string
  amount: string
  destinationTag?: number
  memos?: Array<{ type?: string; data: string }>
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
  memos?: Array<{ type?: string; data: string }>
}

export interface GetTransactionHistoryPayload {
  marker?: unknown
  limit?: number
}

export interface DeriveMoreAccountsPayload {
  count: number
}

export interface ProviderRequestPayload {
  request: import('./provider').OtsuProviderRequest
}

export interface SigningApprovedPayload {
  requestId: string
}

export interface SigningRejectedPayload {
  requestId: string
  reason?: string
}

export interface GetSigningRequestPayload {
  requestId: string
}

export interface SetSettingsPayload {
  settings: Partial<import('./settings').WalletSettings>
}

export interface RevokePermissionPayload {
  origin: string
}

export interface ProviderEventPayload {
  event: import('./provider').OtsuEvent
}

export interface MintNftPayload {
  uri: string
  taxon?: number
  flags?: number
  transferFee?: number
}

export interface SellNftPayload {
  nftId: string
  amount: string
  destination?: string
}

export interface BuyNftPayload {
  nftId: string
  amount: string
  owner: string
}

export interface AcceptNftOfferPayload {
  offerId: string
}

export interface CancelNftOfferPayload {
  offerIds: string[]
}

export interface GetNftOffersPayload {
  nftId: string
}

export interface CreateDexOfferPayload {
  takerGets: string | { currency: string; issuer: string; value: string }
  takerPays: string | { currency: string; issuer: string; value: string }
  expiration?: number
  flags?: number
}

export interface CancelDexOfferPayload {
  offerSequence: number
}

export interface GetOrderBookPayload {
  base: { currency: string; issuer?: string }
  quote: { currency: string; issuer?: string }
  limit?: number
}

export interface CreateEscrowPayload {
  destination: string
  amount: string
  condition?: string
  cancelAfter?: number
  finishAfter?: number
  destinationTag?: number
}

export interface FinishEscrowPayload {
  owner: string
  offerSequence: number
  condition?: string
  fulfillment?: string
}

export interface CancelEscrowPayload {
  owner: string
  offerSequence: number
}

export interface CreateCheckPayload {
  destination: string
  sendMax: string | { currency: string; issuer: string; value: string }
  expiration?: number
  destinationTag?: number
}

export interface CashCheckPayload {
  checkID: string
  amount?: string | { currency: string; issuer: string; value: string }
  deliverMin?: string | { currency: string; issuer: string; value: string }
}

export interface CancelCheckPayload {
  checkID: string
}

export interface AccountSettingsPayload {
  domain?: string
  emailHash?: string
  setFlag?: number
  clearFlag?: number
}

export interface GetNftMetadataPayload {
  nftId: string
  uri: string
}

export interface ExportMnemonicPayload {
  method?: 'password' | 'passkey'
  password?: string
  passkeyKey?: string
}

export interface AddCustomNetworkPayload {
  name: string
  url: string
  explorer?: string
  faucet?: string
}

export interface RemoveCustomNetworkPayload {
  networkId: string
}

export interface GetContractInfoPayload {
  contractAddress: string
}

export interface ChangeAuthMethodPayload {
  method: 'password' | 'passkey'
  password?: string
  credentialId?: string
  prfKey?: string
}

export type CallContractPayload = import('./contract').ContractCallParams

export interface EvmSendTransactionPayload {
  to: string
  value?: string
  data?: string
  gasLimit?: string
}

export interface EvmGetTokensPayload {
  address?: string
}

export interface EvmCallContractPayload {
  contractAddress: string
  abi: string
  functionName: string
  args?: unknown[]
  value?: string
}

export interface EvmEstimateGasPayload {
  to: string
  value?: string
  data?: string
}

export interface EvmAddTokenPayload {
  contractAddress: string
}

export interface BridgeEstimatePayload {
  direction: import('./bridge').BridgeDirection
  amount: string
}

export interface BridgeTransferPayload {
  direction: import('./bridge').BridgeDirection
  amount: string
  sourceAddress: string
  destinationAddress: string
}

export interface BridgeStatusPayload {
  txHash: string
}

export type { IdentityCallbackPayload, IdentityLinkWalletPayload } from './identity'
