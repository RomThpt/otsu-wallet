export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'

export interface BalanceChange {
  currency: string
  issuer?: string
  before: string
  after: string
  delta: string
}

export interface RiskWarning {
  level: RiskLevel
  code: string
  message: string
  details?: string
}

export interface SimulationResult {
  success: boolean
  balanceChanges: BalanceChange[]
  fee: string
  objectsCreated: number
  objectsDeleted: number
  error?: string
}
