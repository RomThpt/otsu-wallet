<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNftStore } from '../../stores/nft'
import { NFT_FLAGS } from '@otsu/constants'
import Button from '../../components/common/Button.vue'
import Input from '../../components/common/Input.vue'

const router = useRouter()
const nftStore = useNftStore()

const uri = ref('')
const taxon = ref('0')
const transferFee = ref('0')
const transferable = ref(true)
const burnable = ref(true)
const step = ref<'form' | 'confirm' | 'result'>('form')
const error = ref('')
const txHash = ref('')

function getFlags(): number {
  let flags = 0
  if (transferable.value) flags |= NFT_FLAGS.tfTransferable
  if (burnable.value) flags |= NFT_FLAGS.tfBurnable
  return flags
}

function confirmMint() {
  if (!uri.value) return
  error.value = ''
  step.value = 'confirm'
}

async function executeMint() {
  error.value = ''
  const hash = await nftStore.mintNFT({
    uri: uri.value,
    taxon: Number(taxon.value) || 0,
    flags: getFlags(),
    transferFee: Number(transferFee.value) * 1000 || 0, // Convert % to basis points (1% = 1000)
  })

  if (hash) {
    txHash.value = hash
    step.value = 'result'
  } else {
    error.value = 'Mint failed'
    step.value = 'form'
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <button
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        @click="router.push('/explore/nfts')"
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
      <h2 class="text-sm font-bold">Mint NFT</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Form Step -->
      <template v-if="step === 'form'">
        <Input v-model="uri" label="URI" placeholder="ipfs://... or https://..." />

        <Input
          v-model="taxon"
          label="Taxon"
          placeholder="0"
          hint="Group identifier for collections"
        />

        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300"
            >Transfer Fee (%)</label
          >
          <input
            v-model="transferFee"
            type="range"
            min="0"
            max="50"
            step="0.1"
            class="mt-1 block w-full"
          />
          <p class="text-xs text-gray-500 mt-1">{{ transferFee }}%</p>
        </div>

        <div class="space-y-2">
          <label class="flex items-center gap-2">
            <input v-model="transferable" type="checkbox" class="rounded border-gray-300" />
            <span class="text-sm">Transferable</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="burnable" type="checkbox" class="rounded border-gray-300" />
            <span class="text-sm">Burnable</span>
          </label>
        </div>

        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

        <Button block :disabled="!uri" @click="confirmMint">Review</Button>
      </template>

      <!-- Confirm Step -->
      <template v-else-if="step === 'confirm'">
        <h3 class="text-sm font-bold">Confirm Mint</h3>
        <div class="space-y-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-500">URI</span>
            <span class="font-mono text-xs truncate ml-2 max-w-[200px]">{{ uri }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Taxon</span>
            <span>{{ taxon }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Transfer Fee</span>
            <span>{{ transferFee }}%</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500">Flags</span>
            <span>{{ transferable ? 'Transferable' : '' }} {{ burnable ? 'Burnable' : '' }}</span>
          </div>
        </div>

        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>

        <div class="flex gap-3">
          <Button variant="secondary" block @click="step = 'form'">Back</Button>
          <Button block :loading="nftStore.loading" @click="executeMint">Mint</Button>
        </div>
      </template>

      <!-- Result Step -->
      <template v-else>
        <div class="text-center py-8">
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4"
          >
            <svg
              class="h-6 w-6 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 class="text-lg font-bold">NFT Minted</h3>
          <p class="mt-2 text-xs text-gray-500 font-mono break-all">{{ txHash }}</p>
        </div>
        <Button block @click="router.push('/explore/nfts')">Back to Gallery</Button>
      </template>
    </div>
  </div>
</template>
