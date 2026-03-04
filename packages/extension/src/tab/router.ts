import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'welcome',
    component: () => import('./views/Welcome.vue'),
  },
  {
    path: '/generate',
    name: 'generate',
    component: () => import('./views/GenerateMnemonic.vue'),
  },
  {
    path: '/verify',
    name: 'verify',
    component: () => import('./views/VerifyMnemonic.vue'),
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('./views/SetupAuth.vue'),
  },
  {
    path: '/complete',
    name: 'complete',
    component: () => import('./views/Complete.vue'),
  },
  {
    path: '/import',
    name: 'import',
    component: () => import('./views/ImportWallet.vue'),
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
