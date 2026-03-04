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
    path: '/tokens',
    name: 'tokens',
    component: () => import('./views/Tokens.vue'),
  },
  {
    path: '/tokens/add',
    name: 'add-trustline',
    component: () => import('./views/AddTrustline.vue'),
  },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
