import { Wallet } from 'xrpl'
import ECDSA from 'xrpl/dist/npm/ECDSA'
import { secp256k1 } from '@noble/curves/secp256k1.js'
import { OtsuError, ErrorCodes } from '@otsu/constants'
import type { VaultAccount } from '@otsu/types'
import type { ImportPayload } from '@otsu/types'
import { deriveAccount } from './hd-deriver'
import { isValidMnemonic } from './mnemonic'

export interface ImportedAccount {
  address: string
  publicKey: string
  privateKey: string
  type: 'hd' | 'imported'
  index?: number
  derivationPath?: string
}

export function importFromMnemonic(mnemonic: string, index = 0): ImportedAccount {
  if (!isValidMnemonic(mnemonic)) {
    throw new OtsuError(ErrorCodes.INVALID_MNEMONIC, 'Invalid mnemonic phrase')
  }
  const derived = deriveAccount(mnemonic, index)
  return {
    address: derived.address,
    publicKey: derived.publicKey,
    privateKey: derived.privateKey,
    type: 'hd',
    index: derived.index,
    derivationPath: derived.derivationPath,
  }
}

export function importFromSecretKey(secret: string): ImportedAccount {
  if (!secret.startsWith('s') || secret.length < 20) {
    throw new OtsuError(ErrorCodes.INVALID_SECRET_KEY, 'Invalid XRPL secret key format')
  }

  try {
    const wallet = Wallet.fromSecret(secret, { algorithm: ECDSA.secp256k1 })
    return {
      address: wallet.classicAddress,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      type: 'imported',
    }
  } catch {
    throw new OtsuError(ErrorCodes.INVALID_SECRET_KEY, 'Failed to derive wallet from secret key')
  }
}

export function importFromFamilySeed(seed: string): ImportedAccount {
  if (!seed.startsWith('s') || seed.length < 20) {
    throw new OtsuError(ErrorCodes.INVALID_FAMILY_SEED, 'Invalid family seed format')
  }

  try {
    const wallet = Wallet.fromSeed(seed, { algorithm: ECDSA.secp256k1 })
    return {
      address: wallet.classicAddress,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      type: 'imported',
    }
  } catch {
    throw new OtsuError(ErrorCodes.INVALID_FAMILY_SEED, 'Failed to derive wallet from family seed')
  }
}

export function importFromPrivateKeyHex(hex: string): ImportedAccount {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex
  const cleanedUpper = cleaned.toUpperCase()

  if (!/^[0-9A-F]{64,66}$/.test(cleanedUpper)) {
    throw new OtsuError(
      ErrorCodes.INVALID_PRIVATE_KEY_HEX,
      'Private key must be 64 or 66 hex characters',
    )
  }

  try {
    const rawKey = cleanedUpper.length === 66 ? cleanedUpper.slice(2) : cleanedUpper
    const rawKeyBytes = new Uint8Array(rawKey.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    const pubKeyBytes = secp256k1.getPublicKey(rawKeyBytes, true)
    const publicKey = Buffer.from(pubKeyBytes).toString('hex').toUpperCase()
    const privateKey = `00${rawKey}`

    const wallet = new Wallet(publicKey, privateKey)
    return {
      address: wallet.classicAddress,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      type: 'imported',
    }
  } catch (e) {
    if (e instanceof OtsuError) throw e
    throw new OtsuError(
      ErrorCodes.INVALID_PRIVATE_KEY_HEX,
      'Failed to derive wallet from private key hex',
    )
  }
}

export function importFromXummSecretNumbers(numbers: string): ImportedAccount {
  const cleaned = numbers.replace(/[\s\-,\.]/g, '')
  const digits = cleaned.replace(/[^0-9]/g, '')

  if (digits.length !== 48) {
    throw new OtsuError(
      ErrorCodes.INVALID_XUMM_NUMBERS,
      'Xumm secret numbers must be 8 rows of 6 digits (48 digits total)',
    )
  }

  const rows: string[] = []
  for (let i = 0; i < 48; i += 6) {
    rows.push(digits.slice(i, i + 6))
  }

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    const value = parseInt(row.slice(0, 5), 10)
    const checksum = parseInt(row[5], 10)
    const calculated = value % 9
    if (checksum !== calculated) {
      throw new OtsuError(
        ErrorCodes.INVALID_XUMM_NUMBERS,
        `Checksum mismatch in row ${r + 1}`,
      )
    }
  }

  const entropyHex = rows.map((row) => {
    const value = parseInt(row.slice(0, 5), 10)
    const hex = value.toString(16).padStart(4, '0')
    return hex
  }).join('')

  const entropy = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    entropy[i] = parseInt(entropyHex.slice(i * 2, i * 2 + 2), 16)
  }

  try {
    const wallet = Wallet.fromEntropy(entropy, { algorithm: ECDSA.secp256k1 })
    return {
      address: wallet.classicAddress,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      type: 'imported',
    }
  } catch {
    throw new OtsuError(
      ErrorCodes.INVALID_XUMM_NUMBERS,
      'Failed to derive wallet from Xumm secret numbers',
    )
  }
}

export function importAccount(payload: ImportPayload): ImportedAccount {
  switch (payload.format) {
    case 'mnemonic':
      return importFromMnemonic(payload.value, payload.mnemonicIndex ?? 0)
    case 'secret_key':
      return importFromSecretKey(payload.value)
    case 'family_seed':
      return importFromFamilySeed(payload.value)
    case 'private_key_hex':
      return importFromPrivateKeyHex(payload.value)
    case 'xumm_secret_numbers':
      return importFromXummSecretNumbers(payload.value)
    default:
      throw new OtsuError(
        ErrorCodes.IMPORT_FORMAT_UNSUPPORTED,
        `Unsupported import format: ${payload.format}`,
      )
  }
}

export function importedToVaultAccount(imported: ImportedAccount): VaultAccount {
  return {
    address: imported.address,
    publicKey: imported.publicKey,
    privateKey: imported.privateKey,
    type: imported.type,
    derivationPath: imported.derivationPath,
    index: imported.index,
  }
}
