import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BridgeService } from './bridge-service'

const feeResponse = {
  result: {
    source_base_fee_string: '0.1',
    source_token: { decimals: 6, gas_price: '0.000002' },
    execute_gas_multiplier: 1.2,
  },
}

describe('BridgeService fee estimation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(feeResponse),
      }),
    )
  })

  it('queries Axelar directly and calculates an XRPL-to-EVM fee without the SDK bundle', async () => {
    const estimate = await new BridgeService('testnet').estimateBridgeFee('xrpl-to-evm', '2000000')

    expect(fetch).toHaveBeenCalledWith('https://testnet.api.gmp.axelarscan.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'getFees',
        sourceChain: 'xrpl',
        destinationChain: 'xrpl-evm',
      }),
    })
    expect(estimate).toMatchObject({
      fee: '700000',
      sourceAmount: '2000000',
      destinationAmount: '1300000000000000000',
    })
  })

  it('keeps fee units correct for EVM-to-XRPL estimates', async () => {
    await expect(
      new BridgeService('mainnet').estimateBridgeFee('evm-to-xrpl', '2000000000000000000'),
    ).resolves.toMatchObject({ fee: '700000', destinationAmount: '1300000' })
  })

  it('rejects incomplete fee responses instead of returning a misleading quote', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ result: {} }),
    } as unknown as Response)

    await expect(
      new BridgeService('testnet').estimateBridgeFee('xrpl-to-evm', '2000000'),
    ).rejects.toThrow('incomplete fee data')
  })
})
