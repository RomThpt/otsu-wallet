import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from './Button.vue'

describe('Button', () => {
  it('renders slot content', () => {
    const wrapper = mount(Button, {
      slots: { default: 'Click me' },
    })
    expect(wrapper.text()).toContain('Click me')
  })

  it('applies variant classes', () => {
    const primary = mount(Button, { props: { variant: 'primary' } })
    expect(primary.classes()).toContain('bg-primary-600')

    const secondary = mount(Button, { props: { variant: 'secondary' } })
    expect(secondary.classes()).toContain('bg-gray-200')
  })

  it('shows loading spinner when loading prop is true', () => {
    const wrapper = mount(Button, { props: { loading: true } })
    const svg = wrapper.find('svg.animate-spin')
    expect(svg.exists()).toBe(true)
  })

  it('sets disabled attribute and applies disabled classes when disabled prop is true', () => {
    const wrapper = mount(Button, { props: { disabled: true } })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.classes()).toContain('disabled:opacity-50')
  })

  it('adds w-full class when block prop is true', () => {
    const wrapper = mount(Button, { props: { block: true } })
    expect(wrapper.classes()).toContain('w-full')
  })
})
