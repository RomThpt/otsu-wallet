import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Account } from '@otsu/types'

vi.mock('./AccountTypeIcon.vue', () => ({
  default: { template: '<span />' },
}))

import AccountSelector from './AccountSelector.vue'

const accounts: Account[] = [
  {
    index: 0,
    address: 'rN7n3473SaZBCG4dFL83w7p1W9cgZw6NlP',
    publicKey: 'ED123',
    type: 'hd',
    label: 'Account 1',
    chainType: 'xrpl',
  },
  {
    index: 1,
    address: 'rLDYrujdKUfVx28T9vRDAbyJ7G2WVhJbEZ',
    publicKey: 'ED456',
    type: 'hd',
    label: 'Account 2',
    chainType: 'xrpl',
  },
]

describe('AccountSelector', () => {
  it('renders active account label and truncated address', () => {
    const wrapper = mount(AccountSelector, {
      props: {
        accounts,
        activeAccount: accounts[0].address,
      },
    })
    expect(wrapper.text()).toContain('Account 1')
    expect(wrapper.text()).toContain('rN7n34...6NlP')
  })

  it('opens dropdown on click and shows listbox', async () => {
    const wrapper = mount(AccountSelector, {
      props: {
        accounts,
        activeAccount: accounts[0].address,
      },
    })
    await wrapper.find('button[aria-haspopup="listbox"]').trigger('click')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
  })

  it('emits select with correct address when account clicked', async () => {
    const wrapper = mount(AccountSelector, {
      props: {
        accounts,
        activeAccount: accounts[0].address,
      },
    })
    await wrapper.find('button[aria-haspopup="listbox"]').trigger('click')
    const options = wrapper.findAll('[role="option"]')
    await options[1].trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([accounts[1].address])
  })

  it('closes dropdown after selection', async () => {
    const wrapper = mount(AccountSelector, {
      props: {
        accounts,
        activeAccount: accounts[0].address,
      },
    })
    await wrapper.find('button[aria-haspopup="listbox"]').trigger('click')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
    const options = wrapper.findAll('[role="option"]')
    await options[0].trigger('click')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })
})
