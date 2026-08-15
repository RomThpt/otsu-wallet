import type { NetworkConfig } from '@otsu/types'

type NetworkAppearance = Pick<NetworkConfig, 'type'>

export function networkIndicatorClass(network?: NetworkAppearance): string {
  return network?.type === 'mainnet' ? 'bg-emerald-400' : 'bg-zinc-950 dark:bg-zinc-100'
}
