import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import SuccessAnimation from './SuccessAnimation.vue'

describe('SuccessAnimation', () => {
  it('renders a decorative one-shot celebration with stable motion layers', () => {
    const wrapper = mount(SuccessAnimation)
    const animation = wrapper.get('[data-testid="success-animation"]')

    expect(animation.attributes('aria-hidden')).toBe('true')
    expect(animation.attributes('data-kind')).toBe('transaction')
    expect(animation.classes()).toContain('success-animation--compact')
    expect(wrapper.find('[data-motion="halo"]').exists()).toBe(true)
    expect(wrapper.find('[data-motion="ring"]').exists()).toBe(true)
    expect(wrapper.find('[data-motion="core"]').exists()).toBe(true)
    expect(
      wrapper.get('[data-motion="particles"]').findAll('.success-animation__spark'),
    ).toHaveLength(6)
    expect(wrapper.get('svg').attributes('focusable')).toBe('false')
  })

  it('supports the wallet artwork and hero size without changing its accessibility contract', () => {
    const wrapper = mount(SuccessAnimation, {
      props: { kind: 'wallet', size: 'hero' },
    })

    expect(wrapper.get('[data-testid="success-animation"]').attributes('data-kind')).toBe('wallet')
    expect(wrapper.get('[data-testid="success-animation"]').classes()).toContain(
      'success-animation--hero',
    )
    expect(wrapper.get('svg').classes()).toContain('success-animation__icon--wallet')
    expect(wrapper.findAll('.success-animation__draw')).toHaveLength(2)
  })
})
