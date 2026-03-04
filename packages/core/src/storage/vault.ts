import { get, set, del } from 'idb-keyval'
import type { EncryptedVault, VaultData } from '@otsu/types'
import { PBKDF2_ITERATIONS } from '@otsu/constants'
import { OtsuError, ErrorCodes } from '@otsu/constants'
import { encrypt, decrypt } from './crypto'

const VAULT_KEY = 'otsu-vault'
const VAULT_VERSION = 1

export class VaultManager {
  async exists(): Promise<boolean> {
    const vault = await get<EncryptedVault>(VAULT_KEY)
    return vault !== undefined
  }

  async create(data: VaultData, password: string): Promise<void> {
    const existing = await this.exists()
    if (existing) {
      throw new OtsuError(ErrorCodes.VAULT_ALREADY_EXISTS, 'Vault already exists')
    }

    const plaintext = JSON.stringify(data)
    const encrypted = await encrypt(plaintext, password)

    const vault: EncryptedVault = {
      version: VAULT_VERSION,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      iterations: PBKDF2_ITERATIONS,
      authTag: '',
    }

    await set(VAULT_KEY, vault)
  }

  async unlock(password: string): Promise<VaultData> {
    const vault = await get<EncryptedVault>(VAULT_KEY)
    if (!vault) {
      throw new OtsuError(ErrorCodes.VAULT_NOT_FOUND, 'No vault found')
    }

    try {
      const plaintext = await decrypt(
        {
          ciphertext: vault.ciphertext,
          iv: vault.iv,
          salt: vault.salt,
        },
        password,
      )

      return JSON.parse(plaintext) as VaultData
    } catch {
      throw new OtsuError(ErrorCodes.INVALID_PASSWORD, 'Invalid password')
    }
  }

  async update(data: VaultData, password: string): Promise<void> {
    const vault = await get<EncryptedVault>(VAULT_KEY)
    if (!vault) {
      throw new OtsuError(ErrorCodes.VAULT_NOT_FOUND, 'No vault found')
    }

    const plaintext = JSON.stringify(data)
    const encrypted = await encrypt(plaintext, password)

    const updated: EncryptedVault = {
      version: VAULT_VERSION,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      iterations: PBKDF2_ITERATIONS,
      authTag: '',
    }

    await set(VAULT_KEY, updated)
  }

  async destroy(): Promise<void> {
    await del(VAULT_KEY)
  }
}
