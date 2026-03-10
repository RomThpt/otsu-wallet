<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '../../stores/wallet'
import Button from '../../components/common/Button.vue'
import Card from '../../components/common/Card.vue'

const wallet = useWalletStore()
const copied = ref(false)
const qrDataUrl = ref('')

const address = computed(() => wallet.activeAccount ?? '')

const isTestnet = computed(() => {
  return ['testnet', 'devnet'].includes(wallet.network) || wallet.network === 'evm-testnet'
})

const isEvm = computed(() => wallet.isEvmNetwork)

const currencyLabel = computed(() => {
  return 'XRP'
})

async function copyAddress() {
  await navigator.clipboard.writeText(address.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
}

onMounted(async () => {
  if (address.value) {
    try {
      const { default: QRCode } = await import('qrcode')
      qrDataUrl.value = await QRCode.toDataURL(address.value, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
    } catch {
      // QR code generation failed; address is still displayed
    }
  }
})
</script>

<template>
  <div class="p-4 space-y-4">
    <h2 class="text-lg font-bold">Receive {{ currencyLabel }}</h2>

    <Card>
      <div class="flex flex-col items-center space-y-4">
        <div v-if="qrDataUrl" class="rounded-lg bg-white p-2">
          <img :src="qrDataUrl" alt="QR Code" class="w-40 h-40" />
        </div>
        <div
          v-else
          class="w-40 h-40 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-sm text-gray-500"
        >
          Loading QR...
        </div>

        <div class="w-full">
          <div class="flex items-center gap-2 mb-1">
            <p class="text-xs text-gray-500 dark:text-gray-400">Your address</p>
            <span
              v-if="isEvm"
              class="px-1 py-0.5 rounded text-[9px] font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
            >
              EVM
            </span>
          </div>
          <p class="text-xs font-mono break-all bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            {{ address }}
          </p>
        </div>

        <Button block variant="secondary" @click="copyAddress">
          {{ copied ? 'Copied' : 'Copy Address' }}
        </Button>
      </div>
    </Card>

    <div
      v-if="isTestnet"
      class="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-3 text-xs text-yellow-700 dark:text-yellow-300"
    >
      You are on {{ wallet.network }}. Funds sent here have no real value.
    </div>
  </div>
</template>
