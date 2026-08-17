import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import Complete from './Complete.vue'

describe('Complete', () => {
  it('announces wallet creation while keeping the celebration decorative', () => {
    const wrapper = mount(Complete)
    const status = wrapper.get('[role="status"]')
    const animation = wrapper.get('[data-testid="success-animation"]')

    expect(status.attributes('aria-live')).toBe('polite')
    expect(status.text()).toContain('All Set!')
    expect(status.text()).toContain('Your wallet is ready to use')
    expect(animation.attributes('aria-hidden')).toBe('true')
    expect(animation.attributes('data-kind')).toBe('wallet')
    expect(wrapper.get('button').text()).toBe('Go to Wallet')
  })
})
