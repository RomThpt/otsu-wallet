export {
  setupPassword,
  unlockWithPassword,
  changePassword,
  vaultExists,
  destroyVault,
} from './auth-password'
export {
  performPasskeyRegistration,
  getPasskeyDecryptionKey,
  storePasskeyVault,
  decryptPasskeyVault,
  hasPasskey,
} from './auth-passkey'
export type { PasskeyRegistrationResult } from './auth-passkey'
export { AuthManager } from './auth-manager'
