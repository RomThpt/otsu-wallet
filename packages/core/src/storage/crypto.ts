import { PBKDF2_ITERATIONS, SALT_LENGTH, IV_LENGTH, AES_KEY_LENGTH } from '@otsu/constants'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function getRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  )
}

export interface EncryptedData {
  ciphertext: string
  iv: string
  salt: string
}

export async function encrypt(plaintext: string, password: string): Promise<EncryptedData> {
  const salt = getRandomBytes(SALT_LENGTH)
  const iv = getRandomBytes(IV_LENGTH)
  const key = await deriveKey(password, salt)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext) as BufferSource,
  )

  return {
    ciphertext: bufferToHex(new Uint8Array(ciphertext)),
    iv: bufferToHex(iv),
    salt: bufferToHex(salt),
  }
}

export async function decrypt(data: EncryptedData, password: string): Promise<string> {
  const salt = hexToBuffer(data.salt)
  const iv = hexToBuffer(data.iv)
  const ciphertext = hexToBuffer(data.ciphertext)
  const key = await deriveKey(password, salt)

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )

  return decoder.decode(plaintext)
}

export async function deriveEncryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  return deriveKey(password, salt)
}

export async function encryptWithKey(
  plaintext: string,
  key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = getRandomBytes(IV_LENGTH)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plaintext) as BufferSource,
  )

  return {
    ciphertext: bufferToHex(new Uint8Array(ciphertext)),
    iv: bufferToHex(iv),
  }
}

export async function decryptWithKey(
  ciphertext: string,
  iv: string,
  key: CryptoKey,
): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: hexToBuffer(iv) as BufferSource },
    key,
    hexToBuffer(ciphertext) as BufferSource,
  )

  return decoder.decode(plaintext)
}
