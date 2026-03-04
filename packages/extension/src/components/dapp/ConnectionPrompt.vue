<script setup lang="ts">
import DAppInfo from './DAppInfo.vue'

const props = defineProps<{
  origin: string
  favicon?: string
  title?: string
  scopes?: string[]
}>()

defineEmits<{
  approve: []
  deny: []
}>()

const SCOPE_LABELS: Record<string, { label: string; icon: string }> = {
  read: { label: 'View your wallet address and balance', icon: 'eye' },
  sign: { label: 'Request transaction signing', icon: 'pencil' },
  submit: { label: 'Sign and submit transactions', icon: 'pencil' },
  switchNetwork: { label: 'Switch network', icon: 'globe' },
}

const DEFAULT_PERMISSIONS = [
  { label: 'View your wallet address', icon: 'eye' },
  { label: 'View current network', icon: 'globe' },
  { label: 'Request transaction signing', icon: 'pencil' },
]

const permissions = props.scopes?.length
  ? props.scopes.map((s) => SCOPE_LABELS[s] ?? { label: s, icon: 'eye' })
  : DEFAULT_PERMISSIONS
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-700">
      <DAppInfo :origin="origin" :favicon="favicon" :title="title" />
    </div>

    <!-- Content -->
    <div class="flex-1 p-4 space-y-4 overflow-auto">
      <p class="text-sm text-gray-700 dark:text-gray-300 text-center">
        wants to connect to your wallet
      </p>

      <!-- Permissions -->
      <div class="space-y-2">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          This site will be able to
        </p>
        <ul class="space-y-2">
          <li
            v-for="perm in permissions"
            :key="perm.label"
            class="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300"
          >
            <!-- Eye Icon -->
            <svg
              v-if="perm.icon === 'eye'"
              class="w-4 h-4 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>

            <!-- Globe Icon -->
            <svg
              v-if="perm.icon === 'globe'"
              class="w-4 h-4 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>

            <!-- Pencil Icon -->
            <svg
              v-if="perm.icon === 'pencil'"
              class="w-4 h-4 text-gray-400 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>

            {{ perm.label }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Actions -->
    <div class="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
      <button
        class="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 transition-colors"
        @click="$emit('deny')"
      >
        Deny
      </button>
      <button
        class="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 transition-colors"
        @click="$emit('approve')"
      >
        Allow
      </button>
    </div>
  </div>
</template>
