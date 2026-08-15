<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DROPS_PER_XRP } from '@otsu/constants'
import { useWalletStore } from '../../stores/wallet'
import { useNftStore } from '../../stores/nft'
import PortfolioAssetRow from '../../components/wallet/PortfolioAssetRow.vue'
import TransactionItem from '../../components/wallet/TransactionItem.vue'
import NFTCard from '../../components/nft/NFTCard.vue'
import Skeleton from '../../components/common/Skeleton.vue'
import Button from '../../components/common/Button.vue'

type PortfolioTab = 'assets' | 'nfts' | 'activity'

const router = useRouter()
const wallet = useWalletStore()
const nftStore = useNftStore()
const loading = ref(true)
const sectionLoading = ref(false)
const sectionError = ref('')
const activeTab = ref<PortfolioTab>('assets')
const balanceVisible = ref(true)

const tabs: Array<{ id: PortfolioTab; label: string }> = [
  { id: 'assets', label: 'Assets' },
  { id: 'nfts', label: 'NFTs' },
  { id: 'activity', label: 'Activity' },
]

const isActivated = computed(() => {
  if (wallet.isEvmNetwork) return true
  if (!wallet.balance) return true
  return Number(wallet.balance.total) > 0
})

const hasFaucet = computed(() => {
  const config =
    wallet.predefinedNetworks[wallet.network] ??
    wallet.customNetworks.find((network) => network.id === wallet.network)
  return Boolean(config?.faucet)
})

const spendableXrp = computed(() => {
  if (!wallet.balance) return '0'
  return formatAmount(Number(wallet.balance.available) / DROPS_PER_XRP, 6)
})

const reservedXrp = computed(() => {
  if (!wallet.balance?.reserved) return null
  return formatAmount(Number(wallet.balance.reserved) / DROPS_PER_XRP, 6)
})

const nativeBalance = computed(() =>
  wallet.isEvmNetwork ? (wallet.evmBalance?.formatted ?? '0') : spendableXrp.value,
)

const activeNetworkConfig = computed(
  () =>
    wallet.predefinedNetworks[wallet.network] ??
    wallet.customNetworks.find((network) => network.id === wallet.network),
)

const nativeSymbol = computed(() =>
  wallet.isEvmNetwork ? (activeNetworkConfig.value?.nativeCurrency?.symbol ?? 'XRP') : 'XRP',
)

const usdTotal = computed(() => {
  if (wallet.isEvmNetwork || !wallet.balance || !wallet.xrpPrice || wallet.xrpPrice === '0') {
    return null
  }
  const price = Number(wallet.xrpPrice)
  if (!Number.isFinite(price) || price <= 0) return null
  const value = (Number(wallet.balance.available) / DROPS_PER_XRP) * price
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
})

const assetCount = computed(() =>
  wallet.isEvmNetwork ? wallet.evmTokens.length + 1 : wallet.tokens.length + 1,
)

const nativeUnitPrice = computed(() => {
  if (wallet.isEvmNetwork || !wallet.xrpPrice || wallet.xrpPrice === '0') return null
  const price = Number(wallet.xrpPrice)
  return Number.isFinite(price) && price > 0 ? formatCurrency(price) : null
})

const assetRows = computed(() => {
  const native = {
    key: `native:${wallet.network}`,
    name: nativeSymbol.value,
    amount: nativeBalance.value,
    usdValue: wallet.isEvmNetwork ? null : usdTotal.value,
    unitPrice: nativeUnitPrice.value,
    iconLabel: nativeSymbol.value.slice(0, 1).toUpperCase(),
    route: wallet.isEvmNetwork ? '/explore' : '/explore/tokens',
  }

  if (wallet.isEvmNetwork) {
    return [
      native,
      ...wallet.evmTokens.map((token) => ({
        key: token.contractAddress,
        name: token.symbol,
        amount: formatAssetAmount(token.formattedBalance),
        usdValue: null,
        unitPrice: null,
        iconLabel: token.symbol.slice(0, 2).toUpperCase(),
        route: '/explore/contracts',
      })),
    ]
  }

  return [
    native,
    ...wallet.tokens.map((token) => {
      const metadata = getMetadata(token.currency, token.issuer)
      const symbol = metadata?.symbol ?? token.currency
      return {
        key: `${token.currency}:${token.issuer}`,
        name: symbol,
        amount: formatAssetAmount(token.value),
        usdValue: null,
        unitPrice: null,
        iconLabel: symbol.slice(0, 2).toUpperCase(),
        route: '/explore/tokens',
      }
    }),
  ]
})

const tradeRoute = computed(() => (wallet.isEvmNetwork ? '/bridge' : '/explore/dex'))
const actions = computed(() => [
  { label: 'Send', route: '/send', icon: 'send' },
  { label: 'Receive', route: '/receive', icon: 'receive' },
  { label: 'Trade', route: tradeRoute.value, icon: 'trade' },
  { label: 'Explore', route: '/explore', icon: 'explore' },
])

onMounted(async () => {
  await loadOverview()
})

watch(
  () => wallet.network,
  async () => {
    await loadOverview()
    if (activeTab.value !== 'assets') await loadTab(activeTab.value)
  },
)

async function loadOverview(): Promise<void> {
  loading.value = wallet.isEvmNetwork ? !wallet.evmBalance : !wallet.balance
  sectionError.value = ''
  try {
    if (wallet.isEvmNetwork) {
      await Promise.all([wallet.fetchEvmBalance(), wallet.fetchEvmTokens()])
    } else {
      await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice(), wallet.fetchTokens()])
    }
  } catch (error) {
    sectionError.value = error instanceof Error ? error.message : 'Unable to refresh portfolio'
  } finally {
    loading.value = false
  }
}

async function loadTab(tab: PortfolioTab): Promise<void> {
  activeTab.value = tab
  sectionError.value = ''

  if (tab === 'assets') {
    if (assetCount.value <= 1) await loadOverview()
    return
  }

  if (wallet.isEvmNetwork) return

  sectionLoading.value = true
  try {
    if (tab === 'nfts') {
      await nftStore.fetchNFTs()
    } else if (wallet.transactions.length === 0) {
      await wallet.fetchTransactionHistory()
    }
  } catch (error) {
    sectionError.value = error instanceof Error ? error.message : 'Unable to load this section'
  } finally {
    sectionLoading.value = false
  }
}

function handleTabKeydown(event: KeyboardEvent, index: number): void {
  let nextIndex = index
  if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabs.length - 1
  else return

  event.preventDefault()
  const nextTab = tabs[nextIndex]
  void loadTab(nextTab.id)
  document.getElementById(`portfolio-tab-${nextTab.id}`)?.focus()
}

async function handleFaucet(): Promise<void> {
  const success = await wallet.requestFaucet()
  if (success) await loadOverview()
}

function getMetadata(currency: string, issuer: string) {
  return wallet.tokenMetadata[`${currency}:${issuer}`]
}

function formatAmount(value: number, maximumFractionDigits: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    useGrouping: true,
  }).format(value)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatAssetAmount(value: string): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return value
  return formatAmount(numericValue, 6)
}
</script>

<template>
  <div class="flex min-h-full flex-col px-4 pb-4">
    <section
      class="flex flex-col items-center pt-4 text-center"
      aria-labelledby="portfolio-balance"
    >
      <div class="flex items-center gap-1.5 text-text-muted">
        <p id="portfolio-balance" class="text-[11px] uppercase tracking-[0.18em]">
          Portfolio balance
        </p>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-bg-hover hover:text-text"
          :aria-label="balanceVisible ? 'Hide balances' : 'Show balances'"
          @click="balanceVisible = !balanceVisible"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-if="balanceVisible"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
            />
            <path
              v-if="balanceVisible"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.4 10.4 0 0112 5c6 0 9.5 7 9.5 7a16 16 0 01-2.2 3.1M6.6 6.6C3.9 8.4 2.5 12 2.5 12s3.5 7 9.5 7a9.8 9.8 0 004.1-.9"
            />
          </svg>
        </button>
      </div>

      <template v-if="loading">
        <Skeleton class="mt-3" variant="rect" height="52px" width="220px" />
        <Skeleton
          v-if="!wallet.isEvmNetwork"
          class="mt-3"
          variant="text"
          height="18px"
          width="112px"
        />
      </template>
      <template v-else>
        <p class="mt-1 text-[46px] leading-none tracking-[-0.035em] tabular-nums">
          {{
            balanceVisible ? (wallet.isEvmNetwork ? nativeBalance : (usdTotal ?? '$—')) : '••••••'
          }}
          <span v-if="wallet.isEvmNetwork" class="text-base tracking-normal text-text-muted">
            {{ nativeSymbol }}
          </span>
        </p>
        <p
          v-if="!wallet.isEvmNetwork && reservedXrp"
          class="mt-3 flex min-h-5 items-center gap-1.5 text-[13px] tabular-nums text-text-muted"
        >
          <span>{{ balanceVisible ? `${reservedXrp} XRP reserved` : 'Balance hidden' }}</span>
          <span
            class="flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] leading-none"
            title="XRPL requires part of the balance to remain reserved."
            aria-label="About the XRPL account reserve"
          >
            i
          </span>
        </p>
      </template>
    </section>

    <section
      class="mx-auto mt-6 flex w-full max-w-[328px] items-start justify-between"
      aria-label="Wallet actions"
    >
      <button
        v-for="action in actions"
        :key="action.label"
        type="button"
        class="group flex w-[68px] flex-col items-center gap-2 text-[13px]"
        @click="router.push(action.route)"
      >
        <span
          class="flex h-14 w-14 items-center justify-center rounded-[18px] bg-bg-subtle text-text shadow-card ring-1 ring-border/70 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:ring-text-muted/35 group-active:translate-y-0 group-active:scale-95"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-if="action.icon === 'send'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M7 17L17 7m0 0H8m9 0v9"
            />
            <path
              v-else-if="action.icon === 'receive'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M17 7L7 17m0 0h9m-9 0V8"
            />
            <path
              v-else-if="action.icon === 'trade'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M7 7h11m0 0l-3-3m3 3l-3 3M17 17H6m0 0l3 3m-3-3l3-3"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z"
            />
          </svg>
        </span>
        <span>{{ action.label }}</span>
      </button>
    </section>

    <div v-if="!isActivated" class="mt-5 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-warning">
      <p class="font-medium">Activate this account</p>
      <p class="mt-0.5 text-xs leading-5 text-text-muted">
        Receive at least 1 XRP before making transactions.
      </p>
    </div>

    <button
      v-if="hasFaucet"
      type="button"
      class="mt-5 flex min-h-12 w-full items-center justify-between rounded-[18px] bg-bg-subtle px-4 text-left text-[15px] shadow-card ring-1 ring-border/70 transition-all hover:ring-text-muted/35 active:scale-[0.995] disabled:cursor-wait disabled:opacity-60"
      :disabled="wallet.loading"
      @click="handleFaucet"
    >
      <span>{{ wallet.loading ? 'Requesting test XRP…' : 'Request test XRP' }}</span>
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.75"
          d="M5 12h14m-5-5l5 5-5 5"
        />
      </svg>
    </button>

    <section class="mt-6" aria-label="Portfolio">
      <div
        class="flex items-center gap-9 border-b border-border"
        role="tablist"
        aria-label="Portfolio categories"
      >
        <button
          v-for="(tab, index) in tabs"
          :id="`portfolio-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`portfolio-panel-${tab.id}`"
          :tabindex="activeTab === tab.id ? 0 : -1"
          class="relative min-h-11 pb-2 pt-2 text-[15px] transition-colors"
          :class="activeTab === tab.id ? 'text-text' : 'text-text-muted hover:text-text'"
          @click="loadTab(tab.id)"
          @keydown="handleTabKeydown($event, index)"
        >
          {{ tab.label }}
          <span
            v-if="activeTab === tab.id"
            class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-text"
          />
        </button>
      </div>

      <p v-if="sectionError" class="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
        {{ sectionError }}
      </p>

      <div
        v-if="activeTab === 'assets'"
        id="portfolio-panel-assets"
        role="tabpanel"
        aria-labelledby="portfolio-tab-assets"
        class="mt-3 space-y-2"
      >
        <PortfolioAssetRow
          v-for="asset in assetRows"
          :key="asset.key"
          :name="asset.name"
          :amount="asset.amount"
          :usd-value="asset.usdValue"
          :unit-price="asset.unitPrice"
          :icon-label="asset.iconLabel"
          :balance-visible="balanceVisible"
          @select="router.push(asset.route)"
        />
      </div>

      <template v-else-if="activeTab === 'nfts'">
        <div
          v-if="wallet.isEvmNetwork"
          id="portfolio-panel-nfts"
          role="tabpanel"
          aria-labelledby="portfolio-tab-nfts"
          class="py-12 text-center"
        >
          <p class="text-sm font-medium">NFTs are not available on this network</p>
          <p class="mt-1 text-xs text-text-muted">
            Switch to an XRPL network to view your collection.
          </p>
        </div>
        <div
          v-else-if="sectionLoading"
          id="portfolio-panel-nfts"
          role="tabpanel"
          aria-labelledby="portfolio-tab-nfts"
          class="mt-3 grid grid-cols-2 gap-3"
        >
          <Skeleton v-for="item in 4" :key="item" variant="rect" height="164px" />
        </div>
        <div
          v-else-if="nftStore.nfts.length === 0"
          id="portfolio-panel-nfts"
          role="tabpanel"
          aria-labelledby="portfolio-tab-nfts"
          class="py-12 text-center"
        >
          <p class="text-sm font-medium">No NFTs yet</p>
          <p class="mt-1 text-xs text-text-muted">Your XRPL collection will appear here.</p>
          <Button
            class="mt-4"
            variant="secondary"
            size="sm"
            @click="router.push('/explore/nfts/mint')"
          >
            Mint an NFT
          </Button>
        </div>
        <div
          v-else
          id="portfolio-panel-nfts"
          role="tabpanel"
          aria-labelledby="portfolio-tab-nfts"
          class="mt-3"
        >
          <div class="grid grid-cols-2 gap-3">
            <NFTCard
              v-for="nft in nftStore.nfts.slice(0, 4)"
              :key="nft.nftId"
              :nft="nft"
              @click="router.push(`/explore/nfts/${nft.nftId}`)"
            />
          </div>
          <button
            class="mt-4 w-full text-sm font-medium text-link"
            @click="router.push('/explore/nfts')"
          >
            View all NFTs
          </button>
        </div>
      </template>

      <template v-else>
        <div
          v-if="wallet.isEvmNetwork"
          id="portfolio-panel-activity"
          role="tabpanel"
          aria-labelledby="portfolio-tab-activity"
          class="py-12 text-center"
        >
          <p class="text-sm font-medium">Activity is not available on this network</p>
          <p class="mt-1 text-xs text-text-muted">EVM activity support is coming later.</p>
        </div>
        <div
          v-else-if="sectionLoading"
          id="portfolio-panel-activity"
          role="tabpanel"
          aria-labelledby="portfolio-tab-activity"
          class="mt-3 overflow-hidden rounded-[20px] bg-bg-subtle"
        >
          <div
            v-for="item in 4"
            :key="item"
            class="flex items-center gap-3 border-b border-border/70 p-3 last:border-0"
          >
            <Skeleton variant="rect" width="40px" height="40px" />
            <div class="flex-1 space-y-2">
              <Skeleton variant="text" width="42%" />
              <Skeleton variant="text" width="28%" height="12px" />
            </div>
          </div>
        </div>
        <div
          v-else-if="wallet.transactions.length === 0"
          id="portfolio-panel-activity"
          role="tabpanel"
          aria-labelledby="portfolio-tab-activity"
          class="py-12 text-center"
        >
          <p class="text-sm font-medium">No activity yet</p>
          <p class="mt-1 text-xs text-text-muted">Completed transactions will appear here.</p>
        </div>
        <div
          v-else
          id="portfolio-panel-activity"
          role="tabpanel"
          aria-labelledby="portfolio-tab-activity"
          class="mt-3 overflow-hidden rounded-[20px] bg-bg-subtle shadow-card"
        >
          <TransactionItem
            v-for="transaction in wallet.transactions.slice(0, 5)"
            :key="transaction.hash"
            :tx="transaction"
            class="cursor-pointer border-b border-border/70 last:border-0"
            @click="router.push(`/history/${transaction.hash}`)"
          />
          <button
            class="w-full border-t border-border/70 py-3 text-sm font-medium text-link"
            @click="router.push('/history')"
          >
            View all activity
          </button>
        </div>
      </template>
    </section>

    <footer
      class="mt-auto flex items-center justify-center gap-1.5 pt-7 text-[11px] text-text-muted"
    >
      <svg
        class="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <rect x="6" y="10" width="12" height="10" rx="2" stroke-width="1.75" />
        <path stroke-linecap="round" stroke-width="1.75" d="M9 10V7a3 3 0 016 0v3" />
      </svg>
      <span>Otsu is non-custodial. You own your keys.</span>
    </footer>
  </div>
</template>
