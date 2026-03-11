import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { IdentityProfile } from '@otsu/types'
import { sendMessage } from '../lib/messaging'

export const useIdentityStore = defineStore('identity', () => {
  const loggedIn = ref(false)
  const profile = ref<IdentityProfile | null>(null)
  const linkedAddress = ref<string | null>(null)
  const loading = ref(false)

  const displayName = computed(() => {
    if (!profile.value) return null
    return (
      profile.value.name ??
      profile.value.preferredUsername ??
      profile.value.email ??
      profile.value.sub
    )
  })

  const avatarUrl = computed(() => profile.value?.picture ?? null)

  const initials = computed(() => {
    if (!profile.value) return null
    const name = profile.value.name ?? profile.value.preferredUsername ?? profile.value.email
    if (!name) return '?'
    const parts = name.split(/[\s@]+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  })

  async function fetchState() {
    const response = await sendMessage<{
      loggedIn: boolean
      profile: IdentityProfile | null
      linkedAddress: string | null
    }>({ type: 'IDENTITY_GET_STATE' })

    if (response.success && response.data) {
      loggedIn.value = response.data.loggedIn
      profile.value = response.data.profile
      linkedAddress.value = response.data.linkedAddress
    }
  }

  async function login() {
    loading.value = true
    try {
      const response = await sendMessage<{ url: string }>({ type: 'IDENTITY_LOGIN' })
      if (!response.success || !response.data) {
        throw new Error(response.error ?? 'Failed to start login')
      }
      // Open the authorization URL in a new tab
      window.open(response.data.url, '_blank')
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    try {
      await sendMessage({ type: 'IDENTITY_LOGOUT' })
      loggedIn.value = false
      profile.value = null
      linkedAddress.value = null
    } finally {
      loading.value = false
    }
  }

  async function refreshProfile() {
    const response = await sendMessage<IdentityProfile>({ type: 'IDENTITY_REFRESH_PROFILE' })
    if (response.success && response.data) {
      profile.value = response.data
      linkedAddress.value = response.data.xrplAddress ?? null
    }
  }

  async function linkWallet(address: string) {
    loading.value = true
    try {
      const response = await sendMessage({
        type: 'IDENTITY_LINK_WALLET',
        payload: { address },
      })
      if (!response.success) {
        throw new Error(response.error ?? 'Failed to link wallet')
      }
      await refreshProfile()
    } finally {
      loading.value = false
    }
  }

  async function unlinkWallet() {
    loading.value = true
    try {
      const response = await sendMessage({ type: 'IDENTITY_UNLINK_WALLET' })
      if (!response.success) {
        throw new Error(response.error ?? 'Failed to unlink wallet')
      }
      await refreshProfile()
    } finally {
      loading.value = false
    }
  }

  return {
    loggedIn,
    profile,
    linkedAddress,
    loading,
    displayName,
    avatarUrl,
    initials,
    fetchState,
    login,
    logout,
    refreshProfile,
    linkWallet,
    unlinkWallet,
  }
})
