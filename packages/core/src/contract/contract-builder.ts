import type { ContractCallParams } from '@otsu/types'
import {
  ErrorCodes,
  OtsuError,
  CONTRACT_DEFAULT_FEE,
  CONTRACT_MAX_PARAMETERS,
} from '@otsu/constants'

export function validateContractCall(params: ContractCallParams): void {
  if (!params.contractAddress) {
    throw new OtsuError(ErrorCodes.CONTRACT_INVALID_PARAMETERS, 'Contract address is required')
  }

  if (!params.functionName) {
    throw new OtsuError(ErrorCodes.CONTRACT_INVALID_PARAMETERS, 'Function name is required')
  }

  if (params.parameters && params.parameters.length > CONTRACT_MAX_PARAMETERS) {
    throw new OtsuError(
      ErrorCodes.CONTRACT_INVALID_PARAMETERS,
      `Maximum ${CONTRACT_MAX_PARAMETERS} parameters allowed`,
    )
  }
}

export function buildContractCall(
  account: string,
  params: ContractCallParams,
): Record<string, unknown> {
  validateContractCall(params)

  const tx: Record<string, unknown> = {
    TransactionType: 'ContractCall',
    Account: account,
    Destination: params.contractAddress,
    ContractFunction: params.functionName,
    Fee: params.fee ?? CONTRACT_DEFAULT_FEE,
  }

  if (params.parameters && params.parameters.length > 0) {
    tx.Parameters = params.parameters.map((p) => ({
      ContractParameter: {
        SType: p.sType,
        Value: p.value,
        Flags: p.flags,
      },
    }))
  }

  return tx
}
