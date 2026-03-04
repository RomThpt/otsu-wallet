import type { ProviderMethod } from '@otsu/types'

export const SIGNING_TIMEOUT_MS = 60_000

export const NOTIFICATION_WINDOW_WIDTH = 400
export const NOTIFICATION_WINDOW_HEIGHT = 620

export const PROVIDER_METHODS: readonly ProviderMethod[] = [
  'connect',
  'disconnect',
  'getAddress',
  'getNetwork',
  'getBalance',
  'signTransaction',
  'signAndSubmit',
  'signMessage',
  'switchNetwork',
] as const
