import type { VaultData } from '@otsu/types'
import { VaultManager } from '../storage/vault'

const vaultManager = new VaultManager()

export async function setupPassword(vaultData: VaultData, password: string): Promise<void> {
  await vaultManager.create(vaultData, password)
}

export async function unlockWithPassword(password: string): Promise<VaultData> {
  return vaultManager.unlock(password)
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const data = await vaultManager.unlock(currentPassword)
  await vaultManager.destroy()
  await vaultManager.create(data, newPassword)
}

export async function vaultExists(): Promise<boolean> {
  return vaultManager.exists()
}

export async function destroyVault(): Promise<void> {
  await vaultManager.destroy()
}
