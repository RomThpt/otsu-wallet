import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser'
import type { VaultData } from '@otsu/types'
import { OtsuError, ErrorCodes } from '@otsu/constants'
import { encrypt, decrypt } from '../storage/crypto'

const PASSKEY_VAULT_KEY = 'otsu-passkey-vault'
const RP_NAME = 'Otsu Wallet'
const RP_ID = 'otsu-wallet'

interface PasskeyVaultRecord {
  credentialId: string
  encryptedVault: string
  iv: string
  salt: string
}

function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

export async function registerPasskey(vaultData: VaultData): Promise<void> {
  try {
    const challenge = generateChallenge()

    const registration = await startRegistration({
      optionsJSON: {
        rp: { name: RP_NAME, id: RP_ID },
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

    const plaintext = JSON.stringify(vaultData)

    if (prfResult?.results?.first) {
      const prfKey = new Uint8Array(prfResult.results.first)
      const encrypted = await encrypt(plaintext, bufferToHex(prfKey))

      const record: PasskeyVaultRecord = {
        credentialId: registration.id,
        encryptedVault: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      }

      localStorage.setItem(PASSKEY_VAULT_KEY, JSON.stringify(record))
    } else {
      const wrappingKey = bufferToHex(crypto.getRandomValues(new Uint8Array(32)))
      const encrypted = await encrypt(plaintext, wrappingKey)

      const record: PasskeyVaultRecord = {
        credentialId: registration.id,
        encryptedVault: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
      }

      localStorage.setItem(PASSKEY_VAULT_KEY, JSON.stringify(record))
      localStorage.setItem(`${PASSKEY_VAULT_KEY}-wrapping`, wrappingKey)
    }
  } catch (error) {
    throw new OtsuError(
      ErrorCodes.PASSKEY_REGISTRATION_FAILED,
      (error as Error).message,
    )
  }
}

export async function authenticatePasskey(): Promise<VaultData> {
  const stored = localStorage.getItem(PASSKEY_VAULT_KEY)
  if (!stored) {
    throw new OtsuError(ErrorCodes.VAULT_NOT_FOUND, 'No passkey vault found')
  }

  const record: PasskeyVaultRecord = JSON.parse(stored)

  try {
    const challenge = generateChallenge()

    const authentication = await startAuthentication({
      optionsJSON: {
        challenge: bufferToBase64url(challenge),
        rpId: RP_ID,
        allowCredentials: [
          {
            id: record.credentialId,
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

    let key: string

    if (prfResult?.results?.first) {
      key = bufferToHex(new Uint8Array(prfResult.results.first))
    } else {
      const wrappingKey = localStorage.getItem(`${PASSKEY_VAULT_KEY}-wrapping`)
      if (!wrappingKey) {
        throw new OtsuError(ErrorCodes.PASSKEY_NOT_SUPPORTED, 'PRF not available and no wrapping key')
      }
      key = wrappingKey
    }

    const plaintext = await decrypt(
      {
        ciphertext: record.encryptedVault,
        iv: record.iv,
        salt: record.salt,
      },
      key,
    )

    return JSON.parse(plaintext) as VaultData
  } catch (error) {
    if (error instanceof OtsuError) throw error
    throw new OtsuError(ErrorCodes.INVALID_PASSWORD, (error as Error).message)
  }
}

export function hasPasskey(): boolean {
  return localStorage.getItem(PASSKEY_VAULT_KEY) !== null
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
