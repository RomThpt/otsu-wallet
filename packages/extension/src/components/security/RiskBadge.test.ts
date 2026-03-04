import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RiskBadge from './RiskBadge.vue'
import type { RiskLevel } from '@otsu/types'

describe('RiskBadge', () => {
  it('renders correct label for each risk level', () => {
    const cases: Array<[RiskLevel, string]> = [
      ['safe', 'Safe'],
      ['low', 'Low'],
      ['medium', 'Medium'],
      ['high', 'High'],
      ['critical', 'Critical'],
    ]
    for (const [level, expected] of cases) {
      const wrapper = mount(RiskBadge, { props: { level } })
      expect(wrapper.text()).toBe(expected)
    }
  })

  it('applies green classes for safe level', () => {
    const wrapper = mount(RiskBadge, { props: { level: 'safe' as RiskLevel } })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('bg-green-100')
  })

  it('applies red classes for critical level', () => {
    const wrapper = mount(RiskBadge, { props: { level: 'critical' as RiskLevel } })
    const span = wrapper.find('span')
    expect(span.classes()).toContain('bg-red-100')
  })
})
