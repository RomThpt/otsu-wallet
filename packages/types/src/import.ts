export type ImportFormat =
  | 'mnemonic'
  | 'secret_key'
  | 'family_seed'
  | 'private_key_hex'
  | 'xumm_secret_numbers'

export interface ImportPayload {
  format: ImportFormat
  value: string
  label?: string
  mnemonicIndex?: number
}
