import type {
  ExtensionMessage,
  ExtensionResponse,
  CreateWalletPayload,
  UnlockPayload,
  SendPaymentPayload,
  SwitchNetworkPayload,
  ImportAccountPayload,
  SetActiveAccountPayload,
  UpdateAccountLabelPayload,
  SetTrustlinePayload,
  RemoveTrustlinePayload,
  SendTokenPaymentPayload,
  GetTransactionHistoryPayload,
  DeriveMoreAccountsPayload,
  ProviderRequestPayload,
  SigningApprovedPayload,
  SigningRejectedPayload,
  GetSigningRequestPayload,
  SetSettingsPayload,
  RevokePermissionPayload,
  MintNftPayload,
  SellNftPayload,
  BuyNftPayload,
  AcceptNftOfferPayload,
  CancelNftOfferPayload,
  GetNftOffersPayload,
  CreateDexOfferPayload,
  CancelDexOfferPayload,
  GetOrderBookPayload,
  CreateEscrowPayload,
  FinishEscrowPayload,
  CancelEscrowPayload,
  CreateCheckPayload,
  CashCheckPayload,
  CancelCheckPayload,
  AccountSettingsPayload,
  GetNftMetadataPayload,
  ExportMnemonicPayload,
  AddCustomNetworkPayload,
  RemoveCustomNetworkPayload,
  GetContractInfoPayload,
  CallContractPayload,
  ChangeAuthMethodPayload,
  EvmSendTransactionPayload,
  EvmGetTokensPayload,
  EvmCallContractPayload,
  EvmEstimateGasPayload,
  EvmAddTokenPayload,
  BridgeEstimatePayload,
  BridgeTransferPayload,
  BridgeStatusPayload,
  IdentityLinkWalletPayload,
} from '@otsu/types'
import { WalletController } from './controllers/wallet'
import { ProviderController } from './controllers/provider'
import { IdentityController } from './controllers/identity'

const controller = new WalletController()
const providerController = new ProviderController(controller)
const identityController = new IdentityController()

export { controller, providerController, identityController }

export async function handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  try {
    await controller.initialize()

    switch (message.type) {
      case 'GET_STATE':
        return { success: true, data: controller.getState() }

      case 'HAS_WALLET':
        return { success: true, data: await controller.hasWallet() }

      case 'CREATE_WALLET': {
        const payload = message.payload as CreateWalletPayload
        const result = await controller.createWallet(
          payload.authMethod,
          payload.password,
          payload.mnemonic,
          payload.credentialId,
          payload.prfKey,
        )
        return { success: true, data: result }
      }

      case 'UNLOCK': {
        const payload = message.payload as UnlockPayload
        const state = await controller.unlock(
          payload.method ?? 'password',
          payload.password,
          payload.passkeyKey,
        )
        return { success: true, data: state }
      }

      case 'LOCK':
        controller.lock()
        return { success: true }

      case 'GET_BALANCE': {
        const balance = await controller.getBalance()
        return { success: true, data: balance }
      }

      case 'SEND_PAYMENT': {
        const payload = message.payload as SendPaymentPayload
        const hash = await controller.sendPayment(payload)
        return { success: true, data: { hash } }
      }

      case 'SWITCH_NETWORK': {
        const payload = message.payload as SwitchNetworkPayload
        await controller.switchNetwork(payload.networkId)
        return { success: true }
      }

      case 'REQUEST_FAUCET':
        await controller.requestFaucet()
        return { success: true }

      case 'GET_ACCOUNTS':
        return { success: true, data: controller.getState().accounts }

      // --- Phase 2 message types ---

      case 'IMPORT_ACCOUNT': {
        const payload = message.payload as ImportAccountPayload
        const account = await controller.importAccount(payload)
        return { success: true, data: account }
      }

      case 'SET_ACTIVE_ACCOUNT': {
        const payload = message.payload as SetActiveAccountPayload
        await controller.setActiveAccount(payload.address)
        return { success: true }
      }

      case 'UPDATE_ACCOUNT_LABEL': {
        const payload = message.payload as UpdateAccountLabelPayload
        await controller.updateAccountLabel(payload.address, payload.label)
        return { success: true }
      }

      case 'GET_TOKENS': {
        const result = await controller.getTokens()
        return { success: true, data: result }
      }

      case 'SET_TRUSTLINE': {
        const payload = message.payload as SetTrustlinePayload
        const hash = await controller.setTrustline(payload)
        return { success: true, data: { hash } }
      }

      case 'REMOVE_TRUSTLINE': {
        const payload = message.payload as RemoveTrustlinePayload
        const hash = await controller.removeTrustline(payload.currency, payload.issuer)
        return { success: true, data: { hash } }
      }

      case 'SEND_TOKEN_PAYMENT': {
        const payload = message.payload as SendTokenPaymentPayload
        const hash = await controller.sendTokenPayment(payload)
        return { success: true, data: { hash } }
      }

      case 'GET_TRANSACTION_HISTORY': {
        const payload = (message.payload as GetTransactionHistoryPayload) ?? {}
        const page = await controller.getTransactionHistory(payload.marker, payload.limit)
        return { success: true, data: page }
      }

      case 'GET_XRP_PRICE': {
        const price = await controller.getXrpPrice()
        return { success: true, data: { price } }
      }

      case 'DERIVE_MORE_ACCOUNTS': {
        const payload = message.payload as DeriveMoreAccountsPayload
        const accounts = await controller.deriveMoreAccounts(payload.count)
        return { success: true, data: accounts }
      }

      case 'GET_CACHED_DATA': {
        const cached = await controller.getCachedData()
        return { success: true, data: cached }
      }

      // --- Phase 4 NFT message types ---

      case 'GET_NFTS': {
        const nfts = await controller.getNFTs()
        return { success: true, data: nfts }
      }

      case 'MINT_NFT': {
        const payload = message.payload as MintNftPayload
        const hash = await controller.mintNFT(payload)
        return { success: true, data: { hash } }
      }

      case 'BURN_NFT': {
        const payload = message.payload as { nftId: string }
        const hash = await controller.burnNFT(payload.nftId)
        return { success: true, data: { hash } }
      }

      case 'SELL_NFT': {
        const payload = message.payload as SellNftPayload
        const hash = await controller.createNFTSellOffer(payload)
        return { success: true, data: { hash } }
      }

      case 'BUY_NFT': {
        const payload = message.payload as BuyNftPayload
        const hash = await controller.createNFTBuyOffer(payload)
        return { success: true, data: { hash } }
      }

      case 'ACCEPT_NFT_OFFER': {
        const payload = message.payload as AcceptNftOfferPayload & { isSellOffer?: boolean }
        const hash = await controller.acceptNFTOffer(payload.offerId, payload.isSellOffer ?? true)
        return { success: true, data: { hash } }
      }

      case 'CANCEL_NFT_OFFER': {
        const payload = message.payload as CancelNftOfferPayload
        const hash = await controller.cancelNFTOffer(payload.offerIds)
        return { success: true, data: { hash } }
      }

      case 'GET_NFT_OFFERS': {
        const payload = message.payload as GetNftOffersPayload
        const offers = await controller.getNFTOffers(payload.nftId)
        return { success: true, data: offers }
      }

      // --- Phase 4 DEX message types ---

      case 'CREATE_DEX_OFFER': {
        const payload = message.payload as CreateDexOfferPayload
        const hash = await controller.createDexOffer(payload)
        return { success: true, data: { hash } }
      }

      case 'CANCEL_DEX_OFFER': {
        const payload = message.payload as CancelDexOfferPayload
        const hash = await controller.cancelDexOffer(payload.offerSequence)
        return { success: true, data: { hash } }
      }

      case 'GET_ORDER_BOOK': {
        const payload = message.payload as GetOrderBookPayload
        const book = await controller.getOrderBook(payload.base, payload.quote)
        return { success: true, data: book }
      }

      case 'GET_ACCOUNT_OFFERS': {
        const offers = await controller.getAccountOffers()
        return { success: true, data: offers }
      }

      // --- Phase 4 Advanced message types ---

      case 'CREATE_ESCROW': {
        const payload = message.payload as CreateEscrowPayload
        const hash = await controller.createEscrow(payload)
        return { success: true, data: { hash } }
      }

      case 'FINISH_ESCROW': {
        const payload = message.payload as FinishEscrowPayload
        const hash = await controller.finishEscrow(payload)
        return { success: true, data: { hash } }
      }

      case 'CANCEL_ESCROW': {
        const payload = message.payload as CancelEscrowPayload
        const hash = await controller.cancelEscrow(payload)
        return { success: true, data: { hash } }
      }

      case 'CREATE_CHECK': {
        const payload = message.payload as CreateCheckPayload
        const hash = await controller.createCheck(payload)
        return { success: true, data: { hash } }
      }

      case 'CASH_CHECK': {
        const payload = message.payload as CashCheckPayload
        const hash = await controller.cashCheck(payload)
        return { success: true, data: { hash } }
      }

      case 'CANCEL_CHECK': {
        const payload = message.payload as CancelCheckPayload
        const hash = await controller.cancelCheck(payload)
        return { success: true, data: { hash } }
      }

      case 'UPDATE_ACCOUNT_SETTINGS': {
        const payload = message.payload as AccountSettingsPayload
        const hash = await controller.updateAccountSettings(payload)
        return { success: true, data: { hash } }
      }

      // --- Phase 3 message types ---

      case 'PROVIDER_REQUEST': {
        const payload = message.payload as ProviderRequestPayload
        const response = await providerController.handleRequest(payload.request)
        if (response.error) {
          return { success: false, error: response.error, data: response }
        }
        return { success: true, data: response.result }
      }

      case 'SIGNING_APPROVED': {
        const payload = message.payload as SigningApprovedPayload
        await providerController.handleSigningApproved(payload.requestId)
        return { success: true }
      }

      case 'SIGNING_REJECTED': {
        const payload = message.payload as SigningRejectedPayload
        await providerController.handleSigningRejected(payload.requestId, payload.reason)
        return { success: true }
      }

      case 'GET_SIGNING_REQUEST': {
        const payload = message.payload as GetSigningRequestPayload
        const data = await providerController.getSigningRequest(payload.requestId)
        return { success: true, data }
      }

      case 'GET_SETTINGS': {
        const settings = await controller.getSettings()
        return { success: true, data: settings }
      }

      case 'SET_SETTINGS': {
        const payload = message.payload as SetSettingsPayload
        const settings = await controller.updateSettings(payload.settings)
        return { success: true, data: settings }
      }

      case 'GET_PERMISSIONS': {
        const permissions = await providerController.getPermissions()
        return { success: true, data: permissions }
      }

      case 'REVOKE_PERMISSION': {
        const payload = message.payload as RevokePermissionPayload
        await providerController.revokePermission(payload.origin)
        return { success: true }
      }

      // --- Phase 6 message types ---

      case 'GET_ACCOUNT_ESCROWS': {
        const escrows = await controller.getAccountEscrows()
        return { success: true, data: escrows }
      }

      case 'GET_ACCOUNT_CHECKS': {
        const checks = await controller.getAccountChecks()
        return { success: true, data: checks }
      }

      case 'GET_NFT_METADATA': {
        const payload = message.payload as GetNftMetadataPayload
        const metadata = await controller.getNftMetadata(payload.nftId, payload.uri)
        return { success: true, data: metadata }
      }

      case 'EXPORT_MNEMONIC': {
        const payload = message.payload as ExportMnemonicPayload
        const mnemonic = await controller.exportMnemonic(
          payload.method ?? 'password',
          payload.password,
          payload.passkeyKey,
        )
        return { success: true, data: { mnemonic } }
      }

      case 'RESET_WALLET':
        await controller.resetWallet()
        return { success: true }

      case 'GET_NETWORKS': {
        const networks = controller.getNetworks()
        return { success: true, data: networks }
      }

      case 'ADD_CUSTOM_NETWORK': {
        const payload = message.payload as AddCustomNetworkPayload
        const network = await controller.addCustomNetwork(payload)
        return { success: true, data: network }
      }

      case 'REMOVE_CUSTOM_NETWORK': {
        const payload = message.payload as RemoveCustomNetworkPayload
        await controller.removeCustomNetwork(payload.networkId)
        return { success: true }
      }

      // --- Smart Contract message types ---

      case 'GET_CONTRACT_INFO': {
        const payload = message.payload as GetContractInfoPayload
        const info = await controller.getContractInfo(payload.contractAddress)
        return { success: true, data: info }
      }

      case 'CALL_CONTRACT': {
        const payload = message.payload as CallContractPayload
        const hash = await controller.callContract(payload)
        return { success: true, data: { hash } }
      }

      case 'CHANGE_AUTH_METHOD': {
        const payload = message.payload as ChangeAuthMethodPayload
        await controller.changeAuthMethod(
          payload.method,
          payload.password,
          payload.credentialId,
          payload.prfKey,
        )
        return { success: true }
      }

      // --- EVM message types ---

      case 'EVM_SEND_TRANSACTION': {
        const payload = message.payload as EvmSendTransactionPayload
        const hash = await controller.evmSendTransaction(payload)
        return { success: true, data: { hash } }
      }

      case 'EVM_GET_TOKENS': {
        const payload = (message.payload as EvmGetTokensPayload) ?? {}
        const tokens = await controller.evmGetTokens(payload.address)
        return { success: true, data: tokens }
      }

      case 'EVM_CALL_CONTRACT': {
        const payload = message.payload as EvmCallContractPayload
        const hash = await controller.evmCallContract(payload)
        return { success: true, data: { hash } }
      }

      case 'EVM_ESTIMATE_GAS': {
        const payload = message.payload as EvmEstimateGasPayload
        const gas = await controller.evmEstimateGas(payload)
        return { success: true, data: { gas } }
      }

      case 'EVM_ADD_TOKEN': {
        const payload = message.payload as EvmAddTokenPayload
        const token = await controller.evmAddToken(payload.contractAddress)
        return { success: true, data: token }
      }

      // --- Bridge message types ---

      case 'BRIDGE_ESTIMATE': {
        const payload = message.payload as BridgeEstimatePayload
        const estimate = await controller.bridgeEstimate(payload.direction, payload.amount)
        return { success: true, data: estimate }
      }

      case 'BRIDGE_TRANSFER': {
        const payload = message.payload as BridgeTransferPayload
        const bridgeTx = await controller.bridgeTransfer(payload)
        return { success: true, data: bridgeTx }
      }

      case 'BRIDGE_STATUS': {
        const payload = message.payload as BridgeStatusPayload
        const status = await controller.bridgeGetStatus(payload.txHash)
        return { success: true, data: { status } }
      }

      case 'BRIDGE_HISTORY': {
        const history = await controller.bridgeGetHistory()
        return { success: true, data: history }
      }

      // --- Identity message types ---

      case 'IDENTITY_LOGIN': {
        await identityController.login()
        return { success: true }
      }

      case 'IDENTITY_LOGOUT':
        await identityController.logout()
        return { success: true }

      case 'IDENTITY_GET_STATE':
        return { success: true, data: identityController.getState() }

      case 'IDENTITY_REFRESH_PROFILE': {
        const profile = await identityController.refreshProfile()
        return { success: true, data: profile }
      }

      case 'IDENTITY_LINK_WALLET': {
        const payload = message.payload as IdentityLinkWalletPayload
        await identityController.linkWallet(payload.address)
        return { success: true }
      }

      case 'IDENTITY_UNLINK_WALLET':
        await identityController.unlinkWallet()
        return { success: true }

      default:
        return { success: false, error: `Unknown message type: ${message.type}` }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
