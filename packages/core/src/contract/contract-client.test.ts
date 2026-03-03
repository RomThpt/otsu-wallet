import { describe, it, expect, vi } from 'vitest'
import { ContractClient } from './contract-client'
import { ErrorCodes } from '@otsu/constants'

function createMockClient(response?: Record<string, unknown>, error?: Error) {
  return {
    request: error ? vi.fn().mockRejectedValue(error) : vi.fn().mockResolvedValue(response ?? {}),
  } as unknown as import('../network/client').XrplClient
}

function createMockCache() {
  return {
    getCachedContractInfo: vi.fn().mockResolvedValue(null),
    setCachedContractInfo: vi.fn().mockResolvedValue(undefined),
  } as unknown as import('../storage/cache').WalletCache
}

describe('ContractClient', () => {
  describe('getContractInfo', () => {
    it('parses contract_info response', async () => {
      const mockResponse = {
        abi: [
          {
            name: 'transfer',
            parameters: [
              { flags: 1, stype: 'STAmount', label: 'amount' },
              { flags: 0, stype: 'AccountID', label: 'recipient' },
            ],
          },
          {
            name: 'getBalance',
            parameters: [],
          },
        ],
        owner: 'rOwner123',
        source_uri: 'https://example.com/source',
      }

      const client = new ContractClient(createMockClient(mockResponse))
      const info = await client.getContractInfo('rContract123')

      expect(info.address).toBe('rContract123')
      expect(info.functions).toHaveLength(2)
      expect(info.functions[0].name).toBe('transfer')
      expect(info.functions[0].parameters).toHaveLength(2)
      expect(info.functions[0].parameters[0].sType).toBe('STAmount')
      expect(info.functions[0].parameters[0].flags).toBe(1)
      expect(info.functions[0].parameters[0].label).toBe('amount')
      expect(info.functions[1].name).toBe('getBalance')
      expect(info.owner).toBe('rOwner123')
      expect(info.sourceUri).toBe('https://example.com/source')
    })

    it('returns cached result on second call', async () => {
      const mockClient = createMockClient({
        abi: [{ name: 'foo', parameters: [] }],
      })
      const client = new ContractClient(mockClient)

      await client.getContractInfo('rContract123')
      await client.getContractInfo('rContract123')

      expect(mockClient.request).toHaveBeenCalledTimes(1)
    })

    it('throws CONTRACT_NOT_FOUND on entryNotFound', async () => {
      const client = new ContractClient(createMockClient(undefined, new Error('entryNotFound')))

      await expect(client.getContractInfo('rMissing')).rejects.toMatchObject({
        code: ErrorCodes.CONTRACT_NOT_FOUND,
      })
    })

    it('throws CONTRACT_NOT_SUPPORTED on unknownCmd', async () => {
      const client = new ContractClient(createMockClient(undefined, new Error('unknownCmd')))

      await expect(client.getContractInfo('rAny')).rejects.toMatchObject({
        code: ErrorCodes.CONTRACT_NOT_SUPPORTED,
      })
    })

    it('uses persistent cache when available', async () => {
      const mockCache = createMockCache()
      const cachedInfo = {
        address: 'rCached',
        functions: [{ name: 'cached_fn', parameters: [] }],
      }
      vi.mocked(mockCache.getCachedContractInfo).mockResolvedValue(cachedInfo)

      const mockClient = createMockClient()
      const client = new ContractClient(mockClient, mockCache)

      const info = await client.getContractInfo('rCached')

      expect(info.functions[0].name).toBe('cached_fn')
      expect(mockClient.request).not.toHaveBeenCalled()
    })
  })

  describe('isContractSupported', () => {
    it('returns false on unknownCmd', async () => {
      const client = new ContractClient(createMockClient(undefined, new Error('unknownCmd')))
      expect(await client.isContractSupported()).toBe(false)
    })

    it('returns false on amendmentBlocked', async () => {
      const client = new ContractClient(createMockClient(undefined, new Error('amendmentBlocked')))
      expect(await client.isContractSupported()).toBe(false)
    })

    it('returns true on entryNotFound (command exists)', async () => {
      const client = new ContractClient(createMockClient(undefined, new Error('entryNotFound')))
      expect(await client.isContractSupported()).toBe(true)
    })

    it('returns true on successful response', async () => {
      const client = new ContractClient(createMockClient({ abi: [] }))
      expect(await client.isContractSupported()).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('clears memory cache', async () => {
      const mockClient = createMockClient({
        abi: [{ name: 'fn1', parameters: [] }],
      })
      const client = new ContractClient(mockClient)

      await client.getContractInfo('rContract')
      client.clearCache()
      await client.getContractInfo('rContract')

      expect(mockClient.request).toHaveBeenCalledTimes(2)
    })
  })
})
