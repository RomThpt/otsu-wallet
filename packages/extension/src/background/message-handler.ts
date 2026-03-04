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
} from '@otsu/types'
import { WalletController } from './controllers/wallet'
import { ProviderController } from './controllers/provider'

const controller = new WalletController()
const providerController = new ProviderController(controller)

export { controller, providerController }

export async function handleMessage(
  message: ExtensionMessage,
): Promise<ExtensionResponse> {
  try {
    await controller.initialize()

    switch (message.type) {
      case 'GET_STATE':
        return { success: true, data: controller.getState() }

      case 'CREATE_WALLET': {
        const payload = message.payload as CreateWalletPayload
        const result = await controller.createWallet(
          payload.authMethod,
          payload.password,
          payload.mnemonic,
        )
        return { success: true, data: result }
      }

      case 'UNLOCK': {
        const payload = message.payload as UnlockPayload
        const state = await controller.unlock('password', payload.password)
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

      default:
        return { success: false, error: `Unknown message type: ${message.type}` }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
