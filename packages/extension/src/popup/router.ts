import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('./views/Dashboard.vue'),
  },
  {
    path: '/send',
    name: 'send',
    component: () => import('./views/Send.vue'),
  },
  {
    path: '/receive',
    name: 'receive',
    component: () => import('./views/Receive.vue'),
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('./views/History.vue'),
  },
  {
    path: '/history/:hash',
    name: 'transaction-detail',
    component: () => import('./views/TransactionDetail.vue'),
  },
  {
    path: '/explore',
    name: 'explore',
    component: () => import('./views/Explore.vue'),
  },
  {
    path: '/explore/tokens',
    name: 'tokens',
    component: () => import('./views/Tokens.vue'),
  },
  {
    path: '/explore/tokens/add',
    name: 'add-trustline',
    component: () => import('./views/AddTrustline.vue'),
  },
  {
    path: '/explore/nfts',
    name: 'nft-gallery',
    component: () => import('./views/NFTGallery.vue'),
  },
  {
    path: '/explore/nfts/mint',
    name: 'mint-nft',
    component: () => import('./views/MintNFT.vue'),
  },
  {
    path: '/explore/nfts/:tokenId',
    name: 'nft-detail',
    component: () => import('./views/NFTDetail.vue'),
  },
  {
    path: '/explore/dex',
    name: 'dex-trade',
    component: () => import('./views/DEXTrade.vue'),
  },
  {
    path: '/explore/dex/offers',
    name: 'dex-offers',
    component: () => import('./views/DEXOffers.vue'),
  },
  {
    path: '/explore/escrows',
    name: 'escrows',
    component: () => import('./views/Escrows.vue'),
  },
  {
    path: '/explore/checks',
    name: 'checks',
    component: () => import('./views/Checks.vue'),
  },
  {
    path: '/explore/contracts',
    name: 'contract-explorer',
    component: () => import('./views/ContractExplorer.vue'),
  },
  {
    path: '/explore/account-settings',
    name: 'account-settings',
    component: () => import('./views/AccountSettings.vue'),
  },
  {
    path: '/bridge',
    name: 'bridge',
    component: () => import('./views/Bridge.vue'),
  },
  {
    path: '/accounts',
    name: 'accounts',
    component: () => import('./views/AccountManagement.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/Settings.vue'),
  },
  {
    path: '/settings/networks',
    name: 'network-management',
    component: () => import('./views/NetworkManagement.vue'),
  },
  {
    path: '/settings/networks/add',
    name: 'add-custom-network',
    component: () => import('./views/AddCustomNetwork.vue'),
  },
  {
    path: '/settings/backup',
    name: 'backup-seed-phrase',
    component: () => import('./views/BackupSeedPhrase.vue'),
  },
  {
    path: '/settings/dapps',
    name: 'connected-dapps',
    component: () => import('./views/ConnectedDApps.vue'),
  },
  {
    path: '/address-book',
    name: 'address-book',
    component: () => import('./views/AddressBook.vue'),
  },
  // Legacy redirects
  {
    path: '/tokens',
    redirect: '/explore/tokens',
  },
  {
    path: '/tokens/add',
    redirect: '/explore/tokens/add',
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
