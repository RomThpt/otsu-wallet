import type { MintNftParams, SellNftParams, BuyNftParams } from '@otsu/types'
import { NFT_OFFER_FLAGS } from '@otsu/constants'

export function buildMintNFT(account: string, params: MintNftParams): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'NFTokenMint',
    Account: account,
    URI: hexEncode(params.uri),
    NFTokenTaxon: params.taxon ?? 0,
  }

  if (params.flags !== undefined) {
    tx.Flags = params.flags
  }

  if (params.transferFee !== undefined) {
    tx.TransferFee = params.transferFee
  }

  return tx
}

export function buildBurnNFT(account: string, tokenId: string): Record<string, unknown> {
  return {
    TransactionType: 'NFTokenBurn',
    Account: account,
    NFTokenID: tokenId,
  }
}

export function buildCreateSellOffer(
  account: string,
  params: SellNftParams,
): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'NFTokenCreateOffer',
    Account: account,
    NFTokenID: params.nftId,
    Amount: params.amount,
    Flags: NFT_OFFER_FLAGS.tfSellNFToken,
  }

  if (params.destination) {
    tx.Destination = params.destination
  }

  return tx
}

export function buildCreateBuyOffer(
  account: string,
  params: BuyNftParams,
): Record<string, unknown> {
  return {
    TransactionType: 'NFTokenCreateOffer',
    Account: account,
    NFTokenID: params.nftId,
    Amount: params.amount,
    Owner: params.owner,
    Flags: 0,
  }
}

export function buildAcceptOffer(
  account: string,
  offerId: string,
  isSellOffer: boolean,
): Record<string, unknown> {
  const tx: Record<string, unknown> = {
    TransactionType: 'NFTokenAcceptOffer',
    Account: account,
  }

  if (isSellOffer) {
    tx.NFTokenSellOffer = offerId
  } else {
    tx.NFTokenBuyOffer = offerId
  }

  return tx
}

export function buildCancelOffers(account: string, offerIds: string[]): Record<string, unknown> {
  return {
    TransactionType: 'NFTokenCancelOffer',
    Account: account,
    NFTokenOffers: offerIds,
  }
}

function hexEncode(str: string): string {
  return Array.from(new TextEncoder().encode(str))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}
