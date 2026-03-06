import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import type { VaultData } from '@otsu/types'
import { OtsuError, ErrorCodes } from '@otsu/constants'
import { encrypt, decrypt } from '../storage/crypto'

const PASSKEY_VAULT_KEY = 'otsu-passkey-vault'
const RP_NAME = 'Otsu Wallet'

function getRpId(): string {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    return chrome.runtime.id
  }
  return globalThis.location?.hostname ?? 'otsu-wallet'
}

interface PasskeyVaultRecord {
  credentialId: string
  encryptedVault: string
  iv: string
  salt: string
}

export interface PasskeyRegistrationResult {
  credentialId: string
  prfKey: string
}

function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

/**
 * Runs WebAuthn registration ceremony in UI context.
 * Returns only the credential ID and PRF-derived key -- no vault data involved.
 * Requires PRF extension support; throws if unavailable.
 */
export async function performPasskeyRegistration(): Promise<PasskeyRegistrationResult> {
  try {
    const challenge = generateChallenge()

    const registration = await startRegistration({
      optionsJSON: {
        rp: { name: RP_NAME, id: getRpId() },
        user: {
          id: bufferToBase64url(crypto.getRandomValues(new Uint8Array(32))),
          name: 'Otsu Wallet User',
          displayName: 'Otsu Wallet User',
        },
        challenge: bufferToBase64url(challenge),
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          residentKey: 'required',
          userVerification: 'required',
        },
        extensions: {
          prf: {
            eval: {
              first: new Uint8Array(32).fill(1),
            },
          },
        } as AuthenticationExtensionsClientInputs,
      },
    })

    const prfResult = (registration.clientExtensionResults as Record<string, unknown>)?.prf as
      | { enabled?: boolean; results?: { first: ArrayBuffer } }
      | undefined

    if (!prfResult?.results?.first) {
      throw new OtsuError(
        ErrorCodes.PASSKEY_NOT_SUPPORTED,
        'Your device does not support the PRF extension required for passkey authentication. Please use password authentication.',
      )
    }

    return {
      credentialId: registration.id,
      prfKey: bufferToHex(new Uint8Array(prfResult.results.first)),
    }
  } catch (error) {
    if (error instanceof OtsuError) throw error
    throw new OtsuError(ErrorCodes.PASSKEY_REGISTRATION_FAILED, (error as Error).message)
  }
}

/**
 * Encrypts vault data with the PRF key and stores the passkey vault record.
 * Runs in background context -- vault data never leaves the background.
 */
export async function storePasskeyVault(
  vaultData: VaultData,
  credentialId: string,
  prfKey: string,
): Promise<void> {
  const plaintext = JSON.stringify(vaultData)
  const encrypted = await encrypt(plaintext, prfKey)

  const record: PasskeyVaultRecord = {
    credentialId,
    encryptedVault: encrypted.ciphertext,
    iv: encrypted.iv,
    salt: encrypted.salt,
  }

  await chrome.storage.local.set({ [PASSKEY_VAULT_KEY]: record })
}

/**
 * Runs WebAuthn authentication ceremony in UI context.
 * Returns only the PRF-derived decryption key -- vault data stays in background.
 */
export async function getPasskeyDecryptionKey(): Promise<string> {
  const localResult = await chrome.storage.local.get(PASSKEY_VAULT_KEY)
  const stored: PasskeyVaultRecord | undefined = localResult[PASSKEY_VAULT_KEY]
  if (!stored) {
    throw new OtsuError(ErrorCodes.VAULT_NOT_FOUND, 'No passkey vault found')
  }

  try {
    const challenge = generateChallenge()

    const authentication = await startAuthentication({
      optionsJSON: {
        challenge: bufferToBase64url(challenge),
        rpId: getRpId(),
        allowCredentials: [
          {
            id: stored.credentialId,
            type: 'public-key',
          },
        ],
        userVerification: 'required',
        extensions: {
          prf: {
            eval: {
              first: new Uint8Array(32).fill(1),
            },
          },
        } as AuthenticationExtensionsClientInputs,
      },
    })

    const prfResult = (authentication.clientExtensionResults as Record<string, unknown>)?.prf as
      | { results?: { first: ArrayBuffer } }
      | undefined

    if (!prfResult?.results?.first) {
      throw new OtsuError(
        ErrorCodes.PASSKEY_NOT_SUPPORTED,
        'PRF extension not available. Please re-register your passkey or use password authentication.',
      )
    }

    return bufferToHex(new Uint8Array(prfResult.results.first))
  } catch (error) {
    if (error instanceof OtsuError) throw error
    throw new OtsuError(ErrorCodes.INVALID_PASSWORD, (error as Error).message)
  }
}

/**
 * Decrypts the passkey vault using the provided key.
 * Runs in background context -- decrypted data stays in background.
 */
export async function decryptPasskeyVault(key: string): Promise<VaultData> {
  const localResult = await chrome.storage.local.get(PASSKEY_VAULT_KEY)
  const stored: PasskeyVaultRecord | undefined = localResult[PASSKEY_VAULT_KEY]
  if (!stored) {
    throw new OtsuError(ErrorCodes.VAULT_NOT_FOUND, 'No passkey vault found')
  }

  const plaintext = await decrypt(
    {
      ciphertext: stored.encryptedVault,
      iv: stored.iv,
      salt: stored.salt,
    },
    key,
  )

  return JSON.parse(plaintext) as VaultData
}

export async function hasPasskey(): Promise<boolean> {
  const result = await chrome.storage.local.get(PASSKEY_VAULT_KEY)
  return result[PASSKEY_VAULT_KEY] !== undefined
}

function bufferToBase64url(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
