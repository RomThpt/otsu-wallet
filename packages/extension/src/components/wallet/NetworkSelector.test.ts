import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NetworkSelector from './NetworkSelector.vue'

const networks = {
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    url: 'wss://xrplcluster.com',
    type: 'mainnet' as const,
    chainType: 'xrpl' as const,
  },
  testnet: {
    id: 'testnet',
    name: 'Testnet',
    url: 'wss://s.altnet.rippletest.net:51233',
    type: 'testnet' as const,
    chainType: 'xrpl' as const,
  },
}

describe('NetworkSelector', () => {
  it('uses neutral text and the lighter green indicator for mainnet', () => {
    const wrapper = mount(NetworkSelector, {
      props: {
        activeNetwork: 'mainnet',
        predefinedNetworks: networks,
        customNetworks: [],
      },
    })

    const trigger = wrapper.get('button[aria-haspopup="listbox"]')
    expect(trigger.classes()).toContain('text-text')
    expect(trigger.classes()).not.toContain('text-success')
    expect(wrapper.get('[data-testid="active-network-indicator"]').classes()).toContain(
      'bg-emerald-400',
    )
  })

  it('uses the neutral dark indicator for non-mainnet networks and dropdown options', async () => {
    const wrapper = mount(NetworkSelector, {
      props: {
        activeNetwork: 'testnet',
        predefinedNetworks: networks,
        customNetworks: [],
      },
    })

    expect(wrapper.get('[data-testid="active-network-indicator"]').classes()).toEqual(
      expect.arrayContaining(['bg-zinc-950', 'dark:bg-zinc-100']),
    )

    await wrapper.get('button[aria-haspopup="listbox"]').trigger('click')
    const indicators = wrapper.findAll('[data-testid="network-indicator"]')
    expect(indicators[0].classes()).toContain('bg-emerald-400')
    expect(indicators[1].classes()).toEqual(
      expect.arrayContaining(['bg-zinc-950', 'dark:bg-zinc-100']),
    )
  })
})
