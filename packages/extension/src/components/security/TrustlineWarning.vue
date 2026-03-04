<script setup lang="ts">
defineProps<{
  issuer: string
  verified?: boolean
  domain?: string
}>()
</script>

<template>
  <div
    class="rounded-lg p-3 space-y-2"
    :class="verified ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'"
  >
    <template v-if="verified">
      <p class="text-xs font-medium text-green-800 dark:text-green-200">Verified Issuer</p>
      <p v-if="domain" class="text-xs text-green-700 dark:text-green-300">Domain: {{ domain }}</p>
    </template>
    <template v-else>
      <p class="text-xs font-medium text-yellow-800 dark:text-yellow-200">Unverified Issuer</p>
      <ul class="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc pl-4">
        <li>This issuer has not been verified</li>
        <li>Setting a trustline allows the issuer to send you tokens</li>
        <li>Only set trustlines for issuers you trust</li>
        <li>Each trustline increases your account reserve by 0.2 XRP</li>
      </ul>
    </template>
  </div>
</template>
