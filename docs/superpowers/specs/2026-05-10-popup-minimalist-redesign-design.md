# Popup Minimalist Redesign — Design

## Goal

Refaire la couche visuelle du popup de l'extension Otsu pour la rendre **plus sobre et plus cohérente**, sans retirer la moindre fonctionnalité. Direction visuelle : **mono/brut** (style Linear / Rabby), 1 couleur d'accent, séparateurs fins, pas de cards bombées.

Le thème EVA-01 est conservé en thème optionnel.

## Scope

**In scope** — popup uniquement (`packages/extension/src/popup/**` + composants partagés `packages/extension/src/components/**` + styles `packages/extension/src/styles/main.css` + `tailwind.config.js`) :

- Refonte du système de couleurs (variables CSS / tokens)
- Refonte des composants partagés visibles dans le popup : `Button`, `Card`, `Input`, `Toggle`, `Skeleton`, `Spinner`, `OfflineBanner`, `ToastContainer`
- Refonte de l'app shell `App.vue` (header + bottom nav)
- Refonte de `Dashboard.vue`
- Migration des 23 autres vues popup pour utiliser les nouveaux tokens (mécanique : remplacement de classes, pas de changement de structure ou de logique)
- Réécriture des overrides EVA-01 dans `main.css` pour s'appuyer sur les variables CSS

**Out of scope**

- Le flux d'onboarding (`src/tab/**`)
- La fenêtre de signature (`src/notification/**`)
- Le content script / provider injecté
- Les stores, le router, la logique métier (zéro changement)
- Le background / service worker

## Non-Goals

- Aucune fonctionnalité retirée. Le router et toutes les vues restent listées et accessibles.
- Pas de refactor de logique : on touche uniquement template + classes CSS + variables.
- Pas de nouveau composant fonctionnel — uniquement de la refonte stylistique.
- Pas de changement de structure de fichiers (mêmes chemins, mêmes noms).

## Diagnostic actuel

Sources principales du désordre visuel observé dans le code :

1. **Pas de tokens** — l'échelle `gray-50/100/200/700/800/900` est utilisée au hasard à travers 24 vues, sans rôles définis.
2. **Cards lourdes** — `Card.vue` impose `rounded-xl border bg-white` partout, ce qui fragmente l'écran (Dashboard = 3 boîtes empilées).
3. **Couleurs sémantiques tintées dispersées** — `bg-yellow-50/900-20`, `bg-blue-50`, `bg-green-50`, etc., utilisées en fonds d'alerte, ce qui ajoute du bruit visuel constant.
4. **Header surchargé** — logo "Otsu" + NetworkSelector + bouton Settings + AccountSelector entassés sur 36px de haut.
5. **Bottom nav faible** — 5 items texte uniquement, sans icônes, indicateur actif limité à un changement de couleur.
6. **EVA-01 = 290 lignes de `!important`** — le thème patch les classes Tailwind individuellement faute de variables CSS centrales. Fonctionnel mais fragile.

## Design

### 1. Système de tokens

Source de vérité unique : variables CSS définies sur `:root`, `.dark`, et `.evangelion`. Tailwind est étendu pour exposer ces variables via des couleurs sémantiques.

**Tokens neutres**
- `--bg` — fond principal (white / black / EVA deepest)
- `--bg-subtle` — fond secondaire pour sections (slate-50 / slate-950 / EVA surface)
- `--bg-hover` — état hover/pressed
- `--text` — texte principal
- `--text-muted` — texte secondaire
- `--border` — séparateurs et bordures fines

**Tokens d'accent (1 seule couleur)**
- `--accent` — light = `#0f172a` (slate-900), dark = `#f8fafc` (slate-50), EVA = `#a0de59`
- `--accent-fg` — texte affiché sur fond `--accent`
- `--link` — bleu froid `#2563eb` réservé aux liens et états sélectionnés (peut être identique à `--accent` selon le thème)

**Tokens sémantiques (utilisés uniquement sur icône + texte ; jamais en fond plein)**
- `--success` (vert sobre)
- `--warning` (amber sobre)
- `--danger` (rouge sobre)

**Mapping Tailwind** — dans `tailwind.config.js`, on ajoute :
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
}
```

Les classes existantes `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*` restent disponibles (Tailwind par défaut), mais on migrera progressivement vers les tokens. La palette `primary` reste pour compat mais devient un alias des tokens.

### 2. Polices

- `font-sans` par défaut → `system-ui, -apple-system, "Segoe UI", sans-serif`
- `font-mono` par défaut → `ui-monospace, Menlo, monospace`
- Suppression des `@import @fontsource/...` du CSS principal — chargement déplacé sous le sélecteur `.evangelion` uniquement (les fichiers `.woff2` Barlow/JetBrains restent dans `dist/` mais ne sont chargés que quand le thème EVA est actif)

### 3. Composants partagés

**`Card`**
- Avant : `rounded-xl border border-gray-100 bg-white p-4`
- Après : `border-b border-border` (juste un séparateur du dessous), padding vertical seulement
- Une prop `variant: 'default' | 'plain'` permet aussi un mode "no border" pour les contenus déjà séparés par leur layout

**`Button`**
- Coins : `rounded-md` (au lieu de `rounded-lg`)
- `primary` : `bg-accent text-accent-fg`, hover via opacity ou `--accent-hover`
- `secondary` : `bg-transparent border border-border text-text`, hover `bg-bg-hover`
- `ghost` : `bg-transparent text-text-muted`, hover `bg-bg-hover`
- `danger` : `bg-danger text-white`
- API publique inchangée (`variant`, `size`, `loading`, `disabled`, `block`)

**`Input`**
- Border simple `border border-border` + `rounded-md`, fond `bg-bg`, focus ring `--accent`
- API inchangée

**`Toggle`, `Skeleton`, `Spinner`, `ToastContainer`, `OfflineBanner`**
- Recolorisation via tokens, structure inchangée

### 4. App shell (`App.vue`)

**Header** — la hauteur reste ~44px mais le contenu est aéré :
```
[ AccountSelector ▾ ]                   [ NetworkBadge ▾ ]  [ ⚙ ]
```
- Le label texte "Otsu" est retiré (l'icône d'extension dans la barre Chrome suffit à identifier l'app)
- AccountSelector occupe la place principale à gauche
- NetworkSelector devient un badge compact à droite (couleur du dot indicateur du réseau)
- Le bouton Settings reste à l'extrême droite

**Bottom nav** — 5 items, chacun = icône 18px + label 11px en dessous :
- Dashboard (icône maison) / Send (flèche haut) / Receive (flèche bas) / History (horloge) / Explore (boussole)
- Item actif : barre 2px de couleur `--accent` collée en haut du tab + texte `--text` (au lieu d'un changement de couleur seul)
- Item inactif : icône + texte en `--text-muted`

### 5. Dashboard

Layout avant : Card balance + bloc activation + 2 boutons → 3 boîtes empilées.

Layout après (sans Card sur la balance) :
```
                                              (padding 20px)
  Total Balance
  1,234.567890  XRP                           ← typo grosse
  ≈ $678.90 USD                                ← muted

  ────────── (séparateur fin) ──────────

  Reserve breakdown (si pertinent)
  Available  1,200.00 XRP
  Reserve       34.56 XRP
                                              (séparateur fin)
  [  Send  ]  [  Receive  ]                   ← row, plein largeur

  ⚠ Account not activated                     ← 1 ligne, point d'exclamation coloré
     Send at least 1 XRP …
     [Request Test XRP]                       ← bouton secondaire compact
```

Plus de fond jaune sur le bloc activation : juste un point + texte en couleur `--warning`.

### 6. Couleurs sémantiques

Règle : `info / warn / danger` s'expriment via la **couleur de l'icône et du texte uniquement**. Le fond reste `--bg` ou `--bg-subtle`. Aucun bloc plein jaune/vert/bleu/rouge.

Exception : le bouton `danger` (action destructive) garde un fond rouge plein, car c'est un bouton, pas une zone d'info.

### 7. Thème EVA-01

Le bloc `.evangelion` dans `main.css` est réécrit pour ne redéfinir que les variables CSS :

```css
.evangelion {
  --bg: #1a0a2e;
  --bg-subtle: #2d1547;
  --bg-hover: #3d1f5c;
  --text: #e8d5f5;
  --text-muted: #a976c3;
  --border: #5f2a62;
  --accent: #a0de59;
  --accent-fg: #1a0a2e;
  /* … */

  font-family: 'Barlow Condensed', sans-serif;
}

.evangelion code,
.evangelion .font-mono {
  font-family: 'JetBrains Mono', monospace;
}

.evangelion .font-bold,
.evangelion h1, .evangelion h2, .evangelion h3 {
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.evangelion *,
.evangelion *::before,
.evangelion *::after {
  border-radius: 0 !important;
}

/* L-bracket corner accents — conservés tels quels */
.evangelion .border-b { /* ... */ }
```

Les ~250 overrides `!important` actuels (qui patchaient les classes Tailwind nominales `dark:bg-gray-*`, `dark:text-*`, etc.) deviennent inutiles : il suffit que les composants utilisent les tokens, et les tokens sont redéfinis par le sélecteur `.evangelion`.

Cible : passer de **290 lignes à ≤ 60 lignes** dans le bloc EVA-01 du CSS, **sans changement visuel** du thème pour l'utilisateur.

## Plan d'exécution

L'ordre suivant garantit que chaque étape est testable visuellement et que l'extension reste fonctionnelle à tout moment.

1. **Tokens & Tailwind** — ajouter les variables CSS sur `:root` / `.dark` / `.evangelion` dans `main.css`, étendre `tailwind.config.js` avec les couleurs sémantiques. Polices système par défaut. Aucun composant migré encore.
2. **Composants partagés** — refondre `Button`, `Card`, `Input`, `Toggle`, `Skeleton`, `Spinner`, `OfflineBanner`, `ToastContainer` pour consommer les tokens. Les vues continuent de fonctionner car les classes legacy `gray-*` restent valides.
3. **App shell** — refondre `App.vue` (header simplifié + bottom nav avec icônes).
4. **Dashboard** — refondre `Dashboard.vue` selon le layout ci-dessus.
5. **Migration des autres vues** — par lots parallélisables via subagents :
   - Lot A : Send, Receive, History, Tokens, Explore
   - Lot B : NFT (Gallery, Detail, Mint), DEX (Trade, Offers), Bridge, ContractExplorer
   - Lot C : Settings, AccountSettings, AccountManagement, NetworkManagement, AddCustomNetwork, ConnectedDApps, AddressBook, BackupSeedPhrase
   - Lot D : Unlock, Escrows, Checks, AddTrustline, TransactionDetail
   - Pour chaque vue : remplacement des classes hardcodées (`bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, `bg-yellow-50`, `bg-blue-50`, `bg-green-50`, etc.) par les tokens. Aucun changement de structure ou de logique.
6. **EVA-01 simplifié** — réécrire le bloc `.evangelion` du CSS pour ne piloter que les variables.
7. **Vérification** — `pnpm typecheck && pnpm test && pnpm --filter @otsu/extension build`. Capture Puppeteer du popup chargé en extension Chrome non-packée pour comparaison avant/après.

## Risques & mitigations

- **Composants hors `popup/views/` mais utilisés par le popup** (ex. `components/wallet/AccountSelector.vue`, `components/wallet/NetworkSelector.vue`, `components/security/*`, `components/dapp/*`) : à inclure dans la migration de classes du lot correspondant.
- **EVA-01 régression** : tester les 3 thèmes (light, dark, EVA) sur Dashboard + Send + Settings avant de supprimer les overrides `!important`.
- **Tests `Button.test.ts` / `AccountSelector.test.ts` / `Unlock.test.ts`** : peuvent référencer des classes Tailwind dans leurs assertions. À auditer et adapter au cours du refactor.
- **Build Tailwind purge** : les nouvelles couleurs (`bg-accent`, `text-text-muted`, etc.) doivent apparaître dans le content scan — ok puisque `content: ['./src/**/*.{vue,ts,html}']`.

## Critères d'acceptation

- Le popup s'ouvre, fonctionne et permet d'accéder à toutes les vues actuelles (vérifié sur Chrome via extension non-packée).
- Light / Dark / EVA-01 fonctionnent et sont visuellement distincts.
- Aucune fonctionnalité retirée (router inchangé, vues toujours listées, stores inchangés).
- `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm --filter @otsu/extension build` passent.
- Le bloc `.evangelion` dans `main.css` fait ≤ 60 lignes.
- Les vues popup ne contiennent plus de `bg-yellow-50`, `bg-blue-50`, `bg-green-50` ou équivalents tintés en fond plein (sauf cas justifié documenté).

## Open questions

- **Accent color (à valider)** : par défaut, light = `#0f172a` (slate-900), dark = `#f8fafc` (slate-50). Alternative possible : un accent bleu froid unique (`#2563eb`) sur les deux modes pour un côté plus "wallet web3". Décision finalisée à la première revue de Dashboard.
- **Bottom nav** : 5 items est correct, mais "Explore" pourrait être mergé avec Dashboard ou déplacé en menu si l'espace devient trop serré avec les icônes. À évaluer après l'étape 3.
