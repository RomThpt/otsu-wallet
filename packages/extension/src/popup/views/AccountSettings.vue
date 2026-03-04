<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ACCOUNT_SET_FLAGS } from '@otsu/core'
import { sendMessage } from '../../lib/messaging'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const success = ref('')
const domain = ref('')

const flags = [
  {
    key: 'requireDestTag',
    flag: ACCOUNT_SET_FLAGS.asfRequireDest,
    label: 'Require Destination Tag',
    description: 'Require a destination tag for incoming transactions',
  },
  {
    key: 'disallowXRP',
    flag: ACCOUNT_SET_FLAGS.asfDisallowXRP,
    label: 'Disallow XRP',
    description: 'Reject incoming XRP payments',
  },
  {
    key: 'defaultRipple',
    flag: ACCOUNT_SET_FLAGS.asfDefaultRipple,
    label: 'Default Ripple',
    description: 'Enable rippling on trust lines by default',
  },
  {
    key: 'depositAuth',
    flag: ACCOUNT_SET_FLAGS.asfDepositAuth,
    label: 'Deposit Authorization',
    description: 'Only accept transactions from known senders',
  },
]

async function setFlag(flag: number) {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const response = await sendMessage<{ hash: string }>({
      type: 'UPDATE_ACCOUNT_SETTINGS',
      payload: { setFlag: flag },
    })
    if (response.success) {
      success.value = 'Flag enabled'
    } else {
      error.value = response.error ?? 'Failed'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function clearFlag(flag: number) {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const response = await sendMessage<{ hash: string }>({
      type: 'UPDATE_ACCOUNT_SETTINGS',
      payload: { clearFlag: flag },
    })
    if (response.success) {
      success.value = 'Flag disabled'
    } else {
      error.value = response.error ?? 'Failed'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function setDomain() {
  if (!domain.value) return
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const response = await sendMessage<{ hash: string }>({
      type: 'UPDATE_ACCOUNT_SETTINGS',
      payload: { domain: domain.value },
    })
    if (response.success) {
      success.value = 'Domain set'
      domain.value = ''
    } else {
      error.value = response.error ?? 'Failed'
    }
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="router.push('/explore')"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h2 class="text-sm font-bold">Account Settings</h2>
    </div>

    <div class="flex-1 overflow-y-auto">
      <p v-if="error" class="px-4 py-2 text-xs text-red-500">{{ error }}</p>
      <p v-if="success" class="px-4 py-2 text-xs text-green-600">{{ success }}</p>

      <!-- Flags -->
      <div
        v-for="item in flags"
        :key="item.key"
        class="px-4 py-3 border-b border-gray-100 dark:border-gray-800"
      >
        <div class="flex items-center justify-between">
          <div class="flex-1 mr-3">
            <p class="text-sm font-medium">{{ item.label }}</p>
            <p class="text-xs text-gray-500 mt-0.5">{{ item.description }}</p>
          </div>
          <div class="flex gap-1">
            <button
              class="px-2 py-0.5 text-xs rounded border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
              :disabled="loading"
              @click="setFlag(item.flag)"
            >
              On
            </button>
            <button
              class="px-2 py-0.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
              :disabled="loading"
              @click="clearFlag(item.flag)"
            >
              Off
            </button>
          </div>
        </div>
      </div>

      <!-- Domain -->
      <div class="p-4 space-y-2">
        <Input v-model="domain" label="Domain" placeholder="example.com" />
        <Button size="sm" :loading="loading" :disabled="!domain" @click="setDomain"
          >Set Domain</Button
        >
      </div>
    </div>
  </div>
</template>
