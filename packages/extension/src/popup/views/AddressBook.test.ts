import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  storageGet: vi.fn(),
  storageSet: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mocks.push }),
}))

import AddressBook from './AddressBook.vue'

describe('AddressBook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.storageGet.mockResolvedValue({
      'otsu-address-book': [
        { name: 'Alpha', address: 'rAlpha' },
        { name: 'Beta', address: 'rBeta', tag: '7' },
      ],
    })
    mocks.storageSet.mockResolvedValue(undefined)
    vi.stubGlobal('chrome', {
      storage: { local: { get: mocks.storageGet, set: mocks.storageSet } },
    })
  })

  it('edits the selected filtered contact instead of the same-index unfiltered contact', async () => {
    const wrapper = mount(AddressBook)
    await flushPromises()
    await wrapper.get('input[placeholder="Name or address"]').setValue('Beta')
    await wrapper.get('button[aria-label="Edit Beta"]').trigger('click')

    const nameInput = wrapper
      .findAll('input')
      .find((input) => input.attributes('placeholder') === 'Contact name')!
    await nameInput.setValue('Beta Updated')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(mocks.storageSet).toHaveBeenLastCalledWith({
      'otsu-address-book': [
        { name: 'Alpha', address: 'rAlpha' },
        { name: 'Beta Updated', address: 'rBeta', tag: '7', notes: undefined },
      ],
    })
  })
})
