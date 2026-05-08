export type PermissionScope = 'read' | 'sign' | 'submit' | 'switchNetwork' | 'contractCall'

export interface DAppPermission {
  origin: string
  favicon?: string
  title?: string
  connectedAt: number
  address: string
  scopes?: PermissionScope[]
}
