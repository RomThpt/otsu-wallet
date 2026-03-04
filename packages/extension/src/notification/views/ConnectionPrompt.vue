<script setup lang="ts">
import { ref } from 'vue'
import { sendMessage } from '../../lib/messaging'
import ConnectionPromptBase from '../../components/dapp/ConnectionPrompt.vue'

const props = defineProps<{
  origin: string
  favicon?: string
  title?: string
  requestId: string
}>()

const submitting = ref(false)

async function handleApprove() {
  submitting.value = true
  try {
    await sendMessage({
      type: 'SIGNING_APPROVED',
      payload: { requestId: props.requestId },
    })
  } finally {
    window.close()
  }
}

async function handleDeny() {
  submitting.value = true
  try {
    await sendMessage({
      type: 'SIGNING_REJECTED',
      payload: { requestId: props.requestId },
    })
  } finally {
    window.close()
  }
}
</script>

<template>
  <ConnectionPromptBase
    :origin="origin"
    :favicon="favicon"
    :title="title"
    @approve="handleApprove"
    @deny="handleDeny"
  />
</template>
