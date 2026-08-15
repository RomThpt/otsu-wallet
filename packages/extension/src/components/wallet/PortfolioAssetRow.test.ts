import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PortfolioAssetRow from './PortfolioAssetRow.vue'

describe('PortfolioAssetRow', () => {
  it('presents amount and valuation in the requested two-column hierarchy', async () => {
    const wrapper = mount(PortfolioAssetRow, {
      props: {
        name: 'WBTC',
        amount: '0.0388',
        usdValue: '$2,470.68',
        unitPrice: '$63,702.15',
        iconLabel: 'WB',
        balanceVisible: true,
      },
    })

    expect(wrapper.get('[data-field="asset-name"]').text()).toBe('WBTC')
    expect(wrapper.get('[data-field="asset-amount"]').text()).toBe('0.0388')
    expect(wrapper.get('[data-field="asset-usd-value"]').text()).toBe('$2,470.68')
    expect(wrapper.get('[data-field="asset-unit-price"]').text()).toBe('$63,702.15')
    expect(wrapper.get('button').attributes('aria-label')).toContain('balance 0.0388')

    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('uses explicit unavailable and hidden states instead of invented prices', async () => {
    const wrapper = mount(PortfolioAssetRow, {
      props: {
        name: 'USD',
        amount: '25',
        usdValue: null,
        unitPrice: null,
        iconLabel: 'US',
        balanceVisible: true,
      },
    })

    expect(wrapper.get('[data-field="asset-usd-value"]').text()).toBe('$—')
    expect(wrapper.get('[data-field="asset-unit-price"]').text()).toBe('Price unavailable')

    await wrapper.setProps({ balanceVisible: false })
    expect(wrapper.get('[data-field="asset-amount"]').text()).toBe('••••')
    expect(wrapper.get('[data-field="asset-usd-value"]').text()).toBe('••••')
    expect(wrapper.get('[data-field="asset-unit-price"]').text()).toBe('Hidden')
  })
})
