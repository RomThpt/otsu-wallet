export type ContractSType = 'STAmount' | 'AccountID' | 'UInt32' | 'UInt64' | 'Hash256' | 'Blob'

export interface ContractParameterDef {
  flags: number
  sType: ContractSType
  label?: string
}

export interface ContractFunction {
  name: string
  parameters: ContractParameterDef[]
}

export interface ContractInfo {
  address: string
  functions: ContractFunction[]
  owner?: string
  sourceUri?: string
}

export interface ContractParameterValue {
  sType: ContractSType
  value: string
  flags: number
}

export interface ContractCallParams {
  contractAddress: string
  functionName: string
  parameters?: ContractParameterValue[]
  fee?: string
}
