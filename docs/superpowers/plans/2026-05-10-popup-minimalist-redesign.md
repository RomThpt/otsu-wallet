# Popup Minimalist Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refondre la couche visuelle du popup de l'extension Otsu en mono/brut (style Linear / Rabby) sans retirer de fonctionnalité, en mettant en place un système de tokens CSS qui simplifie aussi le thème EVA-01.

**Architecture:** Variables CSS sur `:root` / `.dark` / `.evangelion` comme source unique de vérité, exposées à Tailwind via `theme.extend.colors`. Les composants partagés (`Button`, `Card`, `Input`, etc.) consomment ces tokens. Les 24 vues popup migrent leurs classes hardcodées vers ces tokens par lots parallélisables. Le thème EVA-01 est réécrit pour ne piloter que les variables, passant de ~290 lignes d'overrides `!important` à ≤60 lignes.

**Tech Stack:** Vue 3, TypeScript, Tailwind CSS 3, Vite 6, Vitest, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-05-10-popup-minimalist-redesign-design.md`

**Branche cible:** `refactor/popup-minimalist`

---

## Setup

### Task 0: Branche dédiée

**Files:** N/A (git operation)

- [ ] **Step 1: Créer et basculer sur la branche**

```bash
cd /Users/romt/Developer/spec-wallet
git checkout -b refactor/popup-minimalist
```

Expected: `Switched to a new branch 'refactor/popup-minimalist'`

- [ ] **Step 2: Vérifier l'état initial du build et des tests**

```bash
pnpm install
pnpm typecheck
pnpm test
```

Expected: typecheck passe, 415 tests verts.

---

## Phase 1 — Système de tokens

### Task 1: Définir les variables CSS et étendre Tailwind

**Files:**
- Modify: `packages/extension/src/styles/main.css` (haut du fichier — bloc `@layer base`)
- Modify: `packages/extension/tailwind.config.js`

- [ ] **Step 1: Ajouter les variables CSS racine dans `main.css`**

Remplacer le contenu actuel des lignes 1–16 (imports fonts + `@tailwind` + base body) par :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg: #ffffff;
    --bg-subtle: #f8fafc;
    --bg-hover: #f1f5f9;
    --text: #0f172a;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --accent: #0f172a;
    --accent-fg: #ffffff;
    --link: #2563eb;
    --success: #16a34a;
    --warning: #d97706;
    --danger: #dc2626;
  }

  .dark {
    --bg: #0a0a0a;
    --bg-subtle: #111111;
    --bg-hover: #1a1a1a;
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --border: #1f1f1f;
    --accent: #f8fafc;
    --accent-fg: #0a0a0a;
    --link: #60a5fa;
    --success: #22c55e;
    --warning: #f59e0b;
    --danger: #ef4444;
  }

  body {
    @apply m-0 p-0 antialiased;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background-color: var(--bg);
    color: var(--text);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
```

Les imports `@fontsource/...` du haut du fichier doivent être **retirés** (ils seront restaurés conditionnellement dans le bloc EVA-01 à la Task 11).

- [ ] **Step 2: Étendre `tailwind.config.js` avec les couleurs sémantiques**

Dans `theme.extend.colors`, ajouter (au-dessus du bloc `primary`) :

```js
colors: {
  bg: 'var(--bg)',
  'bg-subtle': 'var(--bg-subtle)',
  'bg-hover': 'var(--bg-hover)',
  text: 'var(--text)',
  'text-muted': 'var(--text-muted)',
  border: 'var(--border)',
  accent: 'var(--accent)',
  'accent-fg': 'var(--accent-fg)',
  link: 'var(--link)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  primary: { /* … inchangé */ },
  eva: { /* … inchangé */ },
},
```

- [ ] **Step 3: Build pour vérifier que Tailwind purge correctement les nouvelles classes**

```bash
pnpm --filter @otsu/extension build
```

Expected: build OK. Pas encore de changement visuel — les composants n'utilisent pas les tokens.

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/styles/main.css packages/extension/tailwind.config.js
git commit -m "feat(extension): introduce CSS tokens and semantic color scale"
```

---

## Phase 2 — Composants partagés

### Task 2: Refonte de `Button.vue`

**Files:**
- Modify: `packages/extension/src/components/common/Button.vue`
- Test: `packages/extension/src/components/common/Button.test.ts`

- [ ] **Step 1: Inspecter `Button.test.ts` pour identifier les classes asserted**

```bash
cat packages/extension/src/components/common/Button.test.ts
```

Noter les assertions sur classes (probablement `bg-primary-600`, etc.) — elles devront être adaptées.

- [ ] **Step 2: Réécrire `Button.vue`**

```vue
<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}>()
</script>

<template>
  <button
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-link focus:ring-offset-1 focus:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed',
      {
        'w-full': block,
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-4 py-2 text-sm': size === 'md' || !size,
        'px-6 py-3 text-base': size === 'lg',
        'bg-accent text-accent-fg hover:opacity-90': variant === 'primary' || !variant,
        'bg-transparent border border-border text-text hover:bg-bg-hover': variant === 'secondary',
        'bg-danger text-white hover:opacity-90': variant === 'danger',
        'bg-transparent text-text-muted hover:bg-bg-hover hover:text-text': variant === 'ghost',
      },
    ]"
  >
    <svg
      v-if="loading"
      class="animate-spin -ml-1 mr-2 h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
    <slot />
  </button>
</template>
```

- [ ] **Step 3: Adapter `Button.test.ts` aux nouvelles classes**

Pour chaque assertion qui vérifiait l'ancienne classe, remplacer par la nouvelle :
- `bg-primary-600` → `bg-accent`
- `bg-gray-200` → `bg-transparent` (et `border-border`)
- `bg-red-600` → `bg-danger`

- [ ] **Step 4: Lancer les tests**

```bash
pnpm --filter @otsu/extension test packages/extension/src/components/common/Button.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/extension/src/components/common/Button.vue packages/extension/src/components/common/Button.test.ts
git commit -m "refactor(extension): rebuild Button on semantic tokens"
```

### Task 3: Refonte de `Card.vue`

**Files:**
- Modify: `packages/extension/src/components/common/Card.vue`

- [ ] **Step 1: Réécrire `Card.vue`**

```vue
<script setup lang="ts">
defineProps<{
  padding?: boolean
  variant?: 'default' | 'plain'
}>()
</script>

<template>
  <div
    :class="[
      variant === 'plain' ? '' : 'border-b border-border',
      { 'py-4': padding !== false },
    ]"
  >
    <slot />
  </div>
</template>
```

Note : on retire `rounded-xl`, `border` complet, `bg-white` et `dark:bg-gray-800`. La carte devient un séparateur du dessous, et le fond reste celui du parent.

- [ ] **Step 2: Build pour vérifier**

```bash
pnpm --filter @otsu/extension build
```

Expected: build OK.

- [ ] **Step 3: Commit**

```bash
git add packages/extension/src/components/common/Card.vue
git commit -m "refactor(extension): Card becomes a bottom-border separator"
```

### Task 4: Refonte de `Input.vue`, `Toggle.vue`, `Skeleton.vue`, `Spinner.vue`, `OfflineBanner.vue`, `ToastContainer.vue`

**Files:**
- Modify: `packages/extension/src/components/common/Input.vue`
- Modify: `packages/extension/src/components/common/Toggle.vue`
- Modify: `packages/extension/src/components/common/Skeleton.vue`
- Modify: `packages/extension/src/components/common/Spinner.vue`
- Modify: `packages/extension/src/components/common/OfflineBanner.vue`
- Modify: `packages/extension/src/components/common/ToastContainer.vue`

- [ ] **Step 1: Lire chaque fichier pour identifier ses classes hardcodées**

```bash
for f in Input Toggle Skeleton Spinner OfflineBanner ToastContainer; do
  echo "=== $f.vue ==="
  cat packages/extension/src/components/common/$f.vue
done
```

- [ ] **Step 2: Appliquer la table de migration ci-dessous à chaque fichier**

Table de migration mécanique (cas généraux) :

| Avant | Après |
|---|---|
| `bg-white dark:bg-gray-900` | `bg-bg` |
| `bg-white dark:bg-gray-800` | `bg-bg-subtle` |
| `bg-gray-50 dark:bg-gray-900` | `bg-bg-subtle` |
| `bg-gray-100 dark:bg-gray-800` | `bg-bg-subtle` |
| `bg-gray-100 dark:bg-gray-700` | `bg-bg-hover` |
| `text-gray-900 dark:text-gray-100` | `text-text` |
| `text-gray-700 dark:text-gray-300` | `text-text` |
| `text-gray-500 dark:text-gray-400` | `text-text-muted` |
| `text-gray-600 dark:text-gray-400` | `text-text-muted` |
| `border-gray-200 dark:border-gray-700` | `border-border` |
| `border-gray-100 dark:border-gray-800` | `border-border` |
| `hover:bg-gray-100 dark:hover:bg-gray-800` | `hover:bg-bg-hover` |
| `hover:bg-gray-50 dark:hover:bg-gray-800/50` | `hover:bg-bg-hover` |
| `bg-yellow-50 dark:bg-yellow-900/20` | `bg-bg-subtle` (le warning passe sur l'icône/texte en `text-warning`) |
| `bg-blue-50 dark:bg-blue-900/20` | `bg-bg-subtle` |
| `bg-green-50 dark:bg-green-900/20` | `bg-bg-subtle` |
| `bg-red-50 dark:bg-red-900/20` | `bg-bg-subtle` |
| `text-yellow-700 dark:text-yellow-200` | `text-warning` |
| `text-yellow-800 dark:text-yellow-200` | `text-warning` |
| `text-red-600 dark:text-red-400` | `text-danger` |
| `text-green-600 dark:text-green-400` | `text-success` |
| `text-blue-600 dark:text-blue-400` | `text-link` |
| `text-primary-600 dark:text-primary-400` | `text-accent` |
| `bg-primary-600 hover:bg-primary-700 dark:bg-primary-500` | `bg-accent text-accent-fg hover:opacity-90` |
| `focus:ring-primary-500` | `focus:ring-link` |
| `rounded-xl` | `rounded-md` |

- [ ] **Step 3: Build et test**

```bash
pnpm --filter @otsu/extension build
pnpm --filter @otsu/extension test
```

Expected: build OK, tests verts.

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/components/common/
git commit -m "refactor(extension): migrate common components to semantic tokens"
```

---

## Phase 3 — App shell et Dashboard

### Task 5: Préparer les icônes pour la bottom nav

**Files:**
- Create: `packages/extension/src/components/common/icons/IconHome.vue`
- Create: `packages/extension/src/components/common/icons/IconArrowUp.vue`
- Create: `packages/extension/src/components/common/icons/IconArrowDown.vue`
- Create: `packages/extension/src/components/common/icons/IconClock.vue`
- Create: `packages/extension/src/components/common/icons/IconCompass.vue`

- [ ] **Step 1: Créer chaque composant icône (SVG inline, 18px, currentColor, stroke-width 2)**

`IconHome.vue` :
```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 9.5L12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/>
  </svg>
</template>
```

`IconArrowUp.vue` :
```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
</template>
```

`IconArrowDown.vue` :
```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 5v14M19 12l-7 7-7-7"/>
  </svg>
</template>
```

`IconClock.vue` :
```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 7v5l3 2"/>
  </svg>
</template>
```

`IconCompass.vue` :
```vue
<template>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M15.5 8.5l-2 5-5 2 2-5z"/>
  </svg>
</template>
```

- [ ] **Step 2: Commit**

```bash
git add packages/extension/src/components/common/icons/
git commit -m "feat(extension): add minimal nav icons"
```

### Task 6: Refonte de `App.vue` (header + bottom nav)

**Files:**
- Modify: `packages/extension/src/popup/App.vue`

- [ ] **Step 1: Réécrire `App.vue`**

Remplacer le `<template>` complet par :

```vue
<template>
  <div class="w-[360px] h-[600px] bg-bg text-text flex flex-col overflow-hidden">
    <template v-if="!initialized">
      <div class="flex-1 flex items-center justify-center">
        <div class="animate-spin h-6 w-6 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    </template>

    <template v-else-if="wallet.locked">
      <Unlock />
    </template>

    <template v-else>
      <header class="flex items-center justify-between px-4 h-11 border-b border-border">
        <AccountSelector
          :accounts="wallet.accounts"
          :active-account="wallet.activeAccount"
          :loading="wallet.loading"
          :chain-type="wallet.currentChainType"
          @select="handleSelectAccount"
          @add-account="$router.push('/accounts')"
          @load-more="handleDeriveMore"
        />
        <div class="flex items-center gap-1">
          <NetworkSelector
            :active-network="wallet.network"
            :predefined-networks="wallet.predefinedNetworks"
            :custom-networks="wallet.customNetworks"
            @switch="handleSwitchNetwork"
            @manage="router.push('/settings/networks')"
          />
          <router-link
            to="/settings"
            aria-label="Settings"
            class="p-1.5 rounded hover:bg-bg-hover transition-colors"
          >
            <img
              v-if="identity.loggedIn && identity.avatarUrl"
              :src="identity.avatarUrl"
              alt="Profile"
              class="h-5 w-5 rounded-full object-cover"
            />
            <div
              v-else-if="identity.loggedIn && identity.initials"
              class="h-5 w-5 rounded-full bg-bg-subtle text-text flex items-center justify-center text-[9px] font-medium"
            >
              {{ identity.initials }}
            </div>
            <svg
              v-else
              class="h-5 w-5 text-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </router-link>
        </div>
      </header>

      <ToastContainer />
      <OfflineBanner v-if="!isOnline" />

      <main class="flex-1 overflow-y-auto">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <nav class="grid grid-cols-5 border-t border-border">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="relative flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors"
          :class="
            (item.exact ? $route.path === item.to : $route.path.startsWith(item.to))
              ? 'text-text'
              : 'text-text-muted hover:text-text'
          "
        >
          <span
            v-if="item.exact ? $route.path === item.to : $route.path.startsWith(item.to)"
            class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent"
          />
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </router-link>
      </nav>
    </template>
  </div>
</template>
```

- [ ] **Step 2: Adapter le `<script setup>` pour importer les icônes et déclarer `navItems`**

Au début du `<script setup>`, après les imports existants, ajouter :

```ts
import IconHome from '../components/common/icons/IconHome.vue'
import IconArrowUp from '../components/common/icons/IconArrowUp.vue'
import IconArrowDown from '../components/common/icons/IconArrowDown.vue'
import IconClock from '../components/common/icons/IconClock.vue'
import IconCompass from '../components/common/icons/IconCompass.vue'

const navItems = [
  { to: '/', label: 'Home', exact: true, icon: IconHome },
  { to: '/send', label: 'Send', exact: true, icon: IconArrowUp },
  { to: '/receive', label: 'Receive', exact: true, icon: IconArrowDown },
  { to: '/history', label: 'History', exact: true, icon: IconClock },
  { to: '/explore', label: 'Explore', exact: false, icon: IconCompass },
] as const
```

- [ ] **Step 3: Build**

```bash
pnpm --filter @otsu/extension build
```

Expected: build OK.

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/popup/App.vue
git commit -m "refactor(extension): minimalist app shell with icon nav"
```

### Task 7: Refonte de `Dashboard.vue`

**Files:**
- Modify: `packages/extension/src/popup/views/Dashboard.vue`

- [ ] **Step 1: Réécrire `Dashboard.vue`**

```vue
<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '../../stores/wallet'
import ReserveBreakdown from '../../components/wallet/ReserveBreakdown.vue'
import Skeleton from '../../components/common/Skeleton.vue'
import Button from '../../components/common/Button.vue'

const router = useRouter()
const wallet = useWalletStore()
const loading = ref(true)

const isActivated = computed(() => {
  if (wallet.isEvmNetwork) return true
  if (!wallet.balance) return true
  return Number(wallet.balance.total) > 0
})

const hasFaucet = computed(() => {
  const config =
    wallet.predefinedNetworks[wallet.network] ??
    wallet.customNetworks.find((n) => n.id === wallet.network)
  return !!config?.faucet
})

onMounted(async () => {
  try {
    if (wallet.isEvmNetwork) {
      await wallet.fetchEvmBalance()
    } else {
      await Promise.all([wallet.fetchBalance(), wallet.fetchXrpPrice()])
    }
  } catch {
    // Will show "--" balances
  } finally {
    loading.value = false
  }
})

async function handleFaucet() {
  const success = await wallet.requestFaucet()
  if (success) {
    if (wallet.isEvmNetwork) {
      await wallet.fetchEvmBalance()
    } else {
      await wallet.fetchBalance()
    }
  }
}
</script>

<template>
  <div class="px-5 py-6 space-y-6">
    <section>
      <p class="text-xs uppercase tracking-wider text-text-muted">Total Balance</p>

      <template v-if="loading">
        <div class="mt-2 space-y-2">
          <Skeleton variant="rect" height="32px" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </template>

      <template v-else-if="wallet.isEvmNetwork">
        <p class="mt-1 text-3xl font-semibold tracking-tight">
          {{ wallet.evmBalance?.formatted ?? '0' }}
          <span class="text-base font-normal text-text-muted">XRP</span>
        </p>
      </template>

      <ReserveBreakdown v-else :balance="wallet.balance" :xrp-price="wallet.xrpPrice" />
    </section>

    <div class="grid grid-cols-2 gap-3">
      <Button variant="primary" block @click="router.push('/send')">Send</Button>
      <Button variant="secondary" block @click="router.push('/receive')">Receive</Button>
    </div>

    <p v-if="!isActivated" class="flex items-start gap-2 text-sm text-warning">
      <span aria-hidden="true">●</span>
      <span>
        <span class="font-medium">Account not activated.</span>
        <span class="text-text-muted"> Send at least 1 XRP to activate this account.</span>
      </span>
    </p>

    <Button v-if="hasFaucet" variant="secondary" size="sm" block :loading="wallet.loading" @click="handleFaucet">
      Request Test XRP
    </Button>
  </div>
</template>
```

Note : on retire `Card` (plus utilisé ici), et le bloc activation devient une simple ligne.

- [ ] **Step 2: Build et lancer les tests**

```bash
pnpm --filter @otsu/extension build
pnpm --filter @otsu/extension test
```

Expected: build OK, tests verts (le Dashboard n'a pas de test unitaire).

- [ ] **Step 3: Commit**

```bash
git add packages/extension/src/popup/views/Dashboard.vue
git commit -m "refactor(extension): clean Dashboard layout, drop card framing"
```

### Task 8: Vérification visuelle Phase 3

**Files:** N/A (vérification manuelle)

- [ ] **Step 1: Charger l'extension dans Chrome en mode développeur**

1. Ouvrir Chrome → `chrome://extensions/`
2. Activer "Developer mode"
3. Cliquer "Load unpacked" → sélectionner `packages/extension/dist/`
4. Ouvrir le popup de l'extension

- [ ] **Step 2: Vérifier visuellement**

- Header : AccountSelector à gauche, NetworkSelector + Settings à droite, séparateur fin en bas
- Bottom nav : 5 icônes + labels, item actif avec barre 2px en haut
- Dashboard : balance grosse + 2 boutons Send/Receive
- Toggler le mode dark via Settings (ou mettre `localStorage.setItem('otsu-theme', 'dark')` dans la console du popup) pour vérifier que les tokens dark fonctionnent

- [ ] **Step 3: Ne pas commit (vérification seulement)**

---

## Phase 4 — Migration des autres vues

> **Stratégie** : chaque lot peut être traité par un subagent indépendant. La table de migration de la Task 4 s'applique mécaniquement. Pour chaque vue, on remplace les classes hardcodées et on retire les `Card` lourdes là où elles fragmentent l'écran sans ajouter de valeur.

### Task 9: Lot A — Send, Receive, History, Tokens, Explore

**Files:**
- Modify: `packages/extension/src/popup/views/Send.vue`
- Modify: `packages/extension/src/popup/views/Receive.vue`
- Modify: `packages/extension/src/popup/views/History.vue`
- Modify: `packages/extension/src/popup/views/Tokens.vue`
- Modify: `packages/extension/src/popup/views/Explore.vue`
- Modify: `packages/extension/src/popup/views/Unlock.vue`

- [ ] **Step 1: Pour chaque fichier, appliquer la table de migration de la Task 4**

Pour chaque vue, dans cet ordre :
1. Remplacer toutes les occurrences de la table de mapping (Task 4 step 2)
2. Quand un `<Card>` ne contient qu'un seul bloc qui occupe la vue entière, le remplacer par un `<section>` simple
3. Conserver l'ordre des éléments et toute la logique du `<script setup>`

- [ ] **Step 2: Build et tests**

```bash
pnpm --filter @otsu/extension build
pnpm --filter @otsu/extension test
```

Expected: build OK. `Unlock.test.ts` doit toujours passer (adapter les assertions de classes si besoin).

- [ ] **Step 3: Commit**

```bash
git add packages/extension/src/popup/views/Send.vue packages/extension/src/popup/views/Receive.vue packages/extension/src/popup/views/History.vue packages/extension/src/popup/views/Tokens.vue packages/extension/src/popup/views/Explore.vue packages/extension/src/popup/views/Unlock.vue
git commit -m "refactor(extension): migrate core flow views to tokens"
```

### Task 10: Lot B — NFT, DEX, Bridge, Contract

**Files:**
- Modify: `packages/extension/src/popup/views/NFTGallery.vue`
- Modify: `packages/extension/src/popup/views/NFTDetail.vue`
- Modify: `packages/extension/src/popup/views/MintNFT.vue`
- Modify: `packages/extension/src/popup/views/DEXTrade.vue`
- Modify: `packages/extension/src/popup/views/DEXOffers.vue`
- Modify: `packages/extension/src/popup/views/Bridge.vue`
- Modify: `packages/extension/src/popup/views/ContractExplorer.vue`

- [ ] **Step 1: Appliquer la table de migration de la Task 4 à chaque fichier**

- [ ] **Step 2: Build et tests**

```bash
pnpm --filter @otsu/extension build
pnpm --filter @otsu/extension test
```

- [ ] **Step 3: Commit**

```bash
git add packages/extension/src/popup/views/NFTGallery.vue packages/extension/src/popup/views/NFTDetail.vue packages/extension/src/popup/views/MintNFT.vue packages/extension/src/popup/views/DEXTrade.vue packages/extension/src/popup/views/DEXOffers.vue packages/extension/src/popup/views/Bridge.vue packages/extension/src/popup/views/ContractExplorer.vue
git commit -m "refactor(extension): migrate NFT/DEX/Bridge/Contract views to tokens"
```

### Task 11: Lot C — Settings et gestion

**Files:**
- Modify: `packages/extension/src/popup/views/Settings.vue`
- Modify: `packages/extension/src/popup/views/AccountSettings.vue`
- Modify: `packages/extension/src/popup/views/AccountManagement.vue`
- Modify: `packages/extension/src/popup/views/NetworkManagement.vue`
- Modify: `packages/extension/src/popup/views/AddCustomNetwork.vue`
- Modify: `packages/extension/src/popup/views/ConnectedDApps.vue`
- Modify: `packages/extension/src/popup/views/AddressBook.vue`
- Modify: `packages/extension/src/popup/views/BackupSeedPhrase.vue`

- [ ] **Step 1: Appliquer la table de migration de la Task 4**

- [ ] **Step 2: Build et tests**

```bash
pnpm --filter @otsu/extension build
pnpm --filter @otsu/extension test
```

- [ ] **Step 3: Commit**

```bash
git add packages/extension/src/popup/views/Settings.vue packages/extension/src/popup/views/AccountSettings.vue packages/extension/src/popup/views/AccountManagement.vue packages/extension/src/popup/views/NetworkManagement.vue packages/extension/src/popup/views/AddCustomNetwork.vue packages/extension/src/popup/views/ConnectedDApps.vue packages/extension/src/popup/views/AddressBook.vue packages/extension/src/popup/views/BackupSeedPhrase.vue
git commit -m "refactor(extension): migrate settings and management views to tokens"
```

### Task 12: Lot D — vues secondaires

**Files:**
- Modify: `packages/extension/src/popup/views/Escrows.vue`
- Modify: `packages/extension/src/popup/views/Checks.vue`
- Modify: `packages/extension/src/popup/views/AddTrustline.vue`
- Modify: `packages/extension/src/popup/views/TransactionDetail.vue`

- [ ] **Step 1: Appliquer la table de migration de la Task 4**

- [ ] **Step 2: Build et tests**

```bash
pnpm --filter @otsu/extension build
pnpm --filter @otsu/extension test
```

- [ ] **Step 3: Commit**

```bash
git add packages/extension/src/popup/views/Escrows.vue packages/extension/src/popup/views/Checks.vue packages/extension/src/popup/views/AddTrustline.vue packages/extension/src/popup/views/TransactionDetail.vue
git commit -m "refactor(extension): migrate secondary views to tokens"
```

### Task 13: Lot E — composants `wallet/`, `security/`, `dapp/`

**Files:**
- Modify (parcourir et appliquer la table) : tous les `.vue` dans `packages/extension/src/components/wallet/`, `packages/extension/src/components/security/`, `packages/extension/src/components/dapp/`, `packages/extension/src/components/bridge/`, `packages/extension/src/components/contract/`, `packages/extension/src/components/dex/`, `packages/extension/src/components/nft/`

- [ ] **Step 1: Lister les fichiers concernés**

```bash
find packages/extension/src/components -name '*.vue' | sort
```

- [ ] **Step 2: Pour chaque fichier, appliquer la table de migration de la Task 4**

- [ ] **Step 3: Build et tests**

```bash
pnpm --filter @otsu/extension build
pnpm --filter @otsu/extension test
```

`AccountSelector.test.ts` peut référencer des classes — adapter si nécessaire.

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/components/
git commit -m "refactor(extension): migrate domain components to tokens"
```

---

## Phase 5 — Simplification du thème EVA-01

### Task 14: Réécrire le bloc `.evangelion` dans `main.css`

**Files:**
- Modify: `packages/extension/src/styles/main.css`

- [ ] **Step 1: Remplacer tout le bloc EVA-01 actuel (lignes 28–290) par la version basée sur les tokens**

```css
/* ============================================================
   EVANGELION (EVA-01) THEME
   Pilote uniquement les variables CSS — tout le reste suit.
   ============================================================ */

/* Fonts chargés uniquement quand le thème EVA est actif */
@import url('@fontsource/barlow-condensed/400.css') (prefers-color-scheme);
@import url('@fontsource/barlow-condensed/600.css') (prefers-color-scheme);
@import url('@fontsource/barlow-condensed/700.css') (prefers-color-scheme);
@import url('@fontsource/jetbrains-mono/400.css') (prefers-color-scheme);
@import url('@fontsource/jetbrains-mono/700.css') (prefers-color-scheme);

.evangelion {
  --bg: #1a0a2e;
  --bg-subtle: #2d1547;
  --bg-hover: #3d1f5c;
  --text: #e8d5f5;
  --text-muted: #a976c3;
  --border: #5f2a62;
  --accent: #a0de59;
  --accent-fg: #1a0a2e;
  --link: #a0de59;
  --success: #a0de59;
  --warning: #f5c024;
  --danger: #e81900;

  font-family: 'Barlow Condensed', sans-serif;
}

.evangelion code,
.evangelion pre,
.evangelion .font-mono,
.evangelion [class*='font-mono'] {
  font-family: 'JetBrains Mono', monospace;
}

.evangelion .font-bold,
.evangelion .font-semibold,
.evangelion h1,
.evangelion h2,
.evangelion h3 {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Pas de coins arrondis sauf spinners et toggles */
.evangelion *,
.evangelion *::before,
.evangelion *::after {
  border-radius: 0 !important;
}
.evangelion .animate-spin,
.evangelion [role='switch'] span {
  border-radius: 9999px !important;
}

/* Selection */
.evangelion ::selection {
  background-color: rgba(160, 222, 89, 0.3);
  color: #e8d5f5;
}

/* Scrollbar */
.evangelion ::-webkit-scrollbar {
  width: 6px;
}
.evangelion ::-webkit-scrollbar-track {
  background: #1a0a2e;
}
.evangelion ::-webkit-scrollbar-thumb {
  background: #5f2a62;
}
.evangelion ::-webkit-scrollbar-thumb:hover {
  background: #4a2670;
}

/* Glow sur l'accent */
.evangelion .text-accent {
  text-shadow: 0 0 8px rgba(160, 222, 89, 0.3);
}

/* Placeholders */
.evangelion ::placeholder {
  color: #6b4580 !important;
}
```

Note : les imports `@fontsource` ne sont chargés que pour le thème EVA (le sélecteur `(prefers-color-scheme)` est un trick — alternative plus propre : charger les fonts à la demande via JS quand `theme === 'evangelion'`). Si le trick `@import url(... (prefers-color-scheme))` ne marche pas, restaurer les imports `@fontsource` au sommet du fichier ; ils seront simplement chargés en permanence (coût ≈ 80 Ko par police).

- [ ] **Step 2: Build et vérifier la taille du bundle**

```bash
pnpm --filter @otsu/extension build
ls -la packages/extension/dist/main.css
```

Expected: build OK. `main.css` doit avoir nettement diminué.

- [ ] **Step 3: Vérification visuelle des 3 thèmes**

Charger l'extension, ouvrir le popup, basculer sur `system` → `light` → `dark` → `evangelion` via Settings et vérifier que :
- Le contraste reste lisible dans les 3 modes
- L'accent est appliqué partout (boutons primary, items nav actifs, focus rings)
- Le warning d'activation est correctement coloré dans tous les thèmes
- EVA-01 garde ses coins droits, sa typographie capitale et son glow vert

- [ ] **Step 4: Commit**

```bash
git add packages/extension/src/styles/main.css
git commit -m "refactor(extension): rebuild EVA-01 theme on top of CSS tokens"
```

---

## Phase 6 — Vérification finale

### Task 15: Audit des résidus

**Files:** N/A (audit)

- [ ] **Step 1: Chercher les classes legacy résiduelles dans le popup**

```bash
cd packages/extension/src
grep -rn 'bg-yellow-50\|bg-blue-50\|bg-green-50\|bg-red-50' popup/ components/ || echo "OK"
grep -rn 'bg-gray-100 dark:bg-gray-800\|bg-white dark:bg-gray-900' popup/ components/ || echo "OK"
```

Expected: peu ou pas de matches (ceux qui restent doivent être justifiés ou migrés).

- [ ] **Step 2: Compter les lignes du bloc EVA-01**

```bash
grep -c '^' packages/extension/src/styles/main.css
awk '/EVANGELION/,/^$/' packages/extension/src/styles/main.css | wc -l
```

Expected: bloc EVA ≤ 60 lignes.

- [ ] **Step 3: Si résidus présents, les migrer et commit**

```bash
git add -p
git commit -m "refactor(extension): clean residual legacy classes"
```

### Task 16: Vérification globale

**Files:** N/A

- [ ] **Step 1: Lancer la suite complète**

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm --filter @otsu/extension build
```

Expected: tout vert.

- [ ] **Step 2: Charger l'extension dans Chrome et tester un flow utilisateur**

Scénario minimal :
1. Déverrouiller le wallet
2. Vérifier le Dashboard (balance affichée)
3. Naviguer Send → annuler
4. Naviguer Receive → vérifier QR
5. Naviguer History
6. Ouvrir Settings → basculer thème dark, evangelion, system
7. Ouvrir NFT Gallery, Tokens, DEX Trade

Aucun crash, aucune régression de fonctionnalité.

- [ ] **Step 3: Push de la branche**

```bash
git push -u origin refactor/popup-minimalist
```

- [ ] **Step 4: Ouvrir une PR**

```bash
gh pr create --title "Popup minimalist redesign" --body "$(cat <<'EOF'
## Summary
- Introduit un système de tokens CSS (light / dark / evangelion) consommé par les composants partagés et toutes les vues popup
- Refonte de Button, Card, Input et de l'app shell vers un style mono/brut
- Reconstruit le thème EVA-01 sur les tokens (≈250 → ≤60 lignes)

## Test plan
- [ ] pnpm typecheck && pnpm test && pnpm lint && pnpm --filter @otsu/extension build verts
- [ ] Popup chargé dans Chrome : navigation OK sur Dashboard, Send, Receive, History, Settings, NFT, DEX
- [ ] Les 3 thèmes (light, dark, evangelion) fonctionnent et sont visuellement distincts
EOF
)"
```

---

## Self-Review

**Spec coverage**
- Tokens CSS → Task 1 ✓
- Polices système → Task 1 ✓ (et fonts EVA conditionnels Task 14)
- Refonte Button/Card/Input/Toggle/Skeleton/Spinner/OfflineBanner/ToastContainer → Tasks 2, 3, 4 ✓
- Refonte App.vue → Task 6 ✓
- Refonte Dashboard.vue → Task 7 ✓
- Migration des 23 autres vues → Tasks 9–12 ✓
- Migration des composants `wallet/`, `security/`, `dapp/`, etc. → Task 13 ✓ (mentionné comme risque dans la spec, couvert ici)
- Réécriture EVA-01 → Task 14 ✓
- Tests `Button.test.ts`, `AccountSelector.test.ts`, `Unlock.test.ts` → adressés Tasks 2, 9, 13 ✓
- Critères d'acceptation (typecheck, test, lint, build) → Task 16 ✓

**Open questions à résoudre dans la spec**
- Accent color : tranchée par défaut dans le plan (slate-900 light / slate-50 dark). À ajuster en Task 8 si l'utilisateur préfère un bleu après inspection visuelle.
- Bottom nav 5 items : conservé tel quel (Task 6).

**Type / signatures**
- `Button` props inchangés (`variant | size | loading | disabled | block`)
- `Card` ajoute prop optionnelle `variant?: 'default' | 'plain'` — compatible avec usages existants

Plan complet.
