import { describe, it, expect } from 'vitest'
import {
  buildMintNFT,
  buildBurnNFT,
  buildCreateSellOffer,
  buildCreateBuyOffer,
  buildAcceptOffer,
  buildCancelOffers,
} from './nft-builders'

const ACCOUNT = 'rTestAccount123456789'

describe('NFT Builders', () => {
  describe('buildMintNFT', () => {
    it('builds basic mint transaction', () => {
      const tx = buildMintNFT(ACCOUNT, { uri: 'ipfs://Qm123' })

      expect(tx.TransactionType).toBe('NFTokenMint')
      expect(tx.Account).toBe(ACCOUNT)
      expect(tx.URI).toBeTruthy()
      expect(tx.NFTokenTaxon).toBe(0)
    })

    it('includes optional fields', () => {
      const tx = buildMintNFT(ACCOUNT, {
        uri: 'https://example.com/nft.json',
        taxon: 42,
        flags: 0x00000008,
        transferFee: 5000,
      })

      expect(tx.NFTokenTaxon).toBe(42)
      expect(tx.Flags).toBe(0x00000008)
      expect(tx.TransferFee).toBe(5000)
    })
  })

  describe('buildBurnNFT', () => {
    it('builds burn transaction', () => {
      const tx = buildBurnNFT(ACCOUNT, '00080000ABCD')

      expect(tx.TransactionType).toBe('NFTokenBurn')
      expect(tx.Account).toBe(ACCOUNT)
      expect(tx.NFTokenID).toBe('00080000ABCD')
    })
  })

  describe('buildCreateSellOffer', () => {
    it('builds sell offer with tfSellNFToken flag', () => {
      const tx = buildCreateSellOffer(ACCOUNT, {
        nftId: '00080000ABCD',
        amount: '1000000',
      })

      expect(tx.TransactionType).toBe('NFTokenCreateOffer')
      expect(tx.NFTokenID).toBe('00080000ABCD')
      expect(tx.Amount).toBe('1000000')
      expect(tx.Flags).toBe(1) // tfSellNFToken
    })

    it('includes destination for directed offer', () => {
      const tx = buildCreateSellOffer(ACCOUNT, {
        nftId: '00080000ABCD',
        amount: '1000000',
        destination: 'rBuyer123',
      })

      expect(tx.Destination).toBe('rBuyer123')
    })
  })

  describe('buildCreateBuyOffer', () => {
    it('builds buy offer with Owner field', () => {
      const tx = buildCreateBuyOffer(ACCOUNT, {
        nftId: '00080000ABCD',
        amount: '5000000',
        owner: 'rOwner123',
      })

      expect(tx.TransactionType).toBe('NFTokenCreateOffer')
      expect(tx.Owner).toBe('rOwner123')
      expect(tx.Flags).toBe(0)
    })
  })

  describe('buildAcceptOffer', () => {
    it('builds accept sell offer', () => {
      const tx = buildAcceptOffer(ACCOUNT, 'OFFER123', true)

      expect(tx.TransactionType).toBe('NFTokenAcceptOffer')
      expect(tx.NFTokenSellOffer).toBe('OFFER123')
      expect(tx.NFTokenBuyOffer).toBeUndefined()
    })

    it('builds accept buy offer', () => {
      const tx = buildAcceptOffer(ACCOUNT, 'OFFER456', false)

      expect(tx.NFTokenBuyOffer).toBe('OFFER456')
      expect(tx.NFTokenSellOffer).toBeUndefined()
    })
  })

  describe('buildCancelOffers', () => {
    it('builds cancel with multiple offer IDs', () => {
      const tx = buildCancelOffers(ACCOUNT, ['OFFER1', 'OFFER2'])

      expect(tx.TransactionType).toBe('NFTokenCancelOffer')
      expect(tx.NFTokenOffers).toEqual(['OFFER1', 'OFFER2'])
    })
  })
})
