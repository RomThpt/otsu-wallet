<script setup lang="ts">
defineProps<{
  issuer: string
  verified?: boolean
  domain?: string
}>()
</script>

<template>
  <div class="rounded-lg p-3 space-y-2 bg-bg-subtle">
    <template v-if="verified">
      <p class="text-xs font-medium text-success">Verified Issuer</p>
      <p v-if="domain" class="text-xs text-success">Domain: {{ domain }}</p>
    </template>
    <template v-else>
      <p class="text-xs font-medium text-warning">Unverified Issuer</p>
      <ul class="text-xs text-warning space-y-1 list-disc pl-4">
        <li>This issuer has not been verified</li>
        <li>Setting a trustline allows the issuer to send you tokens</li>
        <li>Only set trustlines for issuers you trust</li>
        <li>Each trustline increases your account reserve by 0.2 XRP</li>
      </ul>
    </template>
  </div>
</template>
