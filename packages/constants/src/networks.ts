import type { NetworkConfig } from '@otsu/types'

export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    url: 'wss://xrplcluster.com',
    explorer: 'https://livenet.xrpl.org',
    type: 'mainnet',
  },
  testnet: {
    id: 'testnet',
    name: 'Testnet',
    url: 'wss://s.altnet.rippletest.net:51233',
    explorer: 'https://testnet.xrpl.org',
    faucet: 'https://faucet.altnet.rippletest.net/accounts',
    type: 'testnet',
  },
  devnet: {
    id: 'devnet',
    name: 'Devnet',
    url: 'wss://s.devnet.rippletest.net:51233',
    explorer: 'https://devnet.xrpl.org',
    faucet: 'https://faucet.devnet.rippletest.net/accounts',
    type: 'devnet',
  },
  alphanet: {
    id: 'alphanet',
    name: 'AlphaNet',
    url: 'wss://alphanet.nerdnest.xyz',
    features: ['smart-contracts'],
    type: 'custom',
  },
} as const
