import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Input from './Input.vue'

describe('Input', () => {
  it('connects its label and hint to the input', () => {
    const wrapper = mount(Input, {
      props: { label: 'Password', hint: 'Use at least 8 characters' },
    })

    const input = wrapper.get('input')
    const label = wrapper.get('label')
    const hint = wrapper.get('.form-help')

    expect(input.classes()).toContain('form-control')
    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('aria-describedby')).toBe(hint.attributes('id'))
  })

  it('exposes error state to assistive technology', () => {
    const wrapper = mount(Input, {
      props: { error: 'Password is required' },
    })

    const input = wrapper.get('input')
    const error = wrapper.get('.form-error')

    expect(input.classes()).toContain('form-control-error')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(error.attributes('id'))
  })

  it('updates its model value', async () => {
    const wrapper = mount(Input, { props: { modelValue: '' } })

    await wrapper.get('input').setValue('hello')

    expect(wrapper.emitted('update:modelValue')).toEqual([['hello']])
  })
})
