# Otsu Wallet Specification

> A modern, security-first browser extension wallet for the XRP Ledger. Built to replace the current generation of unmaintained XRPL wallets with full support for native smart contracts (XLS-101), pre-sign transaction simulation, and backward-compatible dApp integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Authentication & Security](#authentication--security)
5. [Wallet & Account Management](#wallet--account-management)
6. [XRPL Features](#xrpl-features)
7. [Smart Contracts (XLS-101)](#smart-contracts-xls-101)
8. [dApp Integration & Compatibility](#dapp-integration--compatibility)
9. [Transaction Signing Flow](#transaction-signing-flow)
10. [UI/UX Design](#uiux-design)
11. [Network Support](#network-support)
12. [Data & Storage](#data--storage)
13. [Project Structure](#project-structure)
14. [Package Breakdown](#package-breakdown)
15. [Milestones](#milestones)
16. [Distribution & Licensing](#distribution--licensing)

---

## Overview

### Name

**Otsu**

### Vision

Replace all existing XRPL browser extension wallets (GemWallet, Crossmark, etc.) which are no longer actively maintained. Otsu is a feature-rich, security-first wallet that provides:

- **Pre-sign transaction simulation** via dry-run (`submit` with `fail_hard`) -- show users exactly what will happen before signing
- **Risk assessment** -- warn about risky addresses, unusual transactions, phishing domains, and potential scams
- **Full XRPL feature support** -- XRP, tokens, NFTs, DEX, AMM, escrow, checks, payment channels
- **Native smart contract support (XLS-101)** -- interact with WASM-based contracts via auto-generated ABI forms
- **Smart Escrows (XLS-100)** -- support for programmable escrow release conditions
- **Multi-account & multi-sign** -- HD wallet derivation + multi-signature account support
- **Hardware wallet integration** -- Ledger device support
- **Backward-compatible dApp connectivity** -- emulate GemWallet and Crossmark APIs for existing dApps
- **Passkey-first authentication** -- WebAuthn/biometrics as the default auth flow

### Design Goals

| Principle | Description |
|-----------|-------------|
| **Security First** | Every transaction shows simulation results before signing |
| **Replace, Don't Coexist** | Aggressively claim provider namespace; be first to activate |
| **Backward Compatible** | Existing dApps work without code changes via compatibility mode |
| **XRPL Native** | Embrace XRPL-specific concepts (reserves, destination tags, on-chain ABI) |
| **Progressive Disclosure** | Simple by default, advanced features accessible |
| **Offline Capable** | Cached balances and key export work without network |

### Inspiration

| Source | What we take |
|--------|--------------|
| **Rabby Wallet** | Pre-sign simulation, risk scanning, security UX, notification window pattern, account selector dropdown, provider priority/claiming |
| **GemWallet** | XRPL-specific transaction handling, API shape (for compatibility emulation) |
| **Crossmark** | API shape (for compatibility emulation) |

---

## Tech Stack

### Core

| Technology | Purpose |
|------------|---------|
| **Vue 3** | Frontend framework (Composition API) |
| **TypeScript** | Type safety across all packages |
| **Vite** | Build tool & dev server |
| **pnpm** | Package manager with workspace support |
| **Tailwind CSS** | Utility-first styling |

### XRPL Libraries

| Library | Purpose |
|---------|---------|
| **xrpl.js** | XRPL client, transaction building, signing |
| **ripple-keypairs** | Key generation and derivation |
| **ripple-binary-codec** | Transaction serialization |
| **bip39** | Mnemonic generation (BIP-39, 24-word) |

### Extension Infrastructure

| Technology | Purpose |
|------------|---------|
| **webextension-polyfill** | Cross-browser compatibility (Chrome/Firefox) |
| **@aspect-build/web-ext** | Extension building and packaging |

### Security

| Technology | Purpose |
|------------|---------|
| **@noble/hashes** | Cryptographic hashing (SHA-256, PBKDF2) |
| **@noble/ciphers** | AES-GCM encryption for local storage |
| **@simplewebauthn/browser** | Passkey/WebAuthn integration |
| **@ledgerhq/hw-transport-webusb** | Ledger hardware wallet support |

### State Management & Storage

| Technology | Purpose |
|------------|---------|
| **Pinia** | Vue state management |
| **idb-keyval** | IndexedDB wrapper for encrypted storage |

### Testing & Quality

| Technology | Purpose |
|------------|---------|
| **Vitest** | Unit testing |
| **Playwright** | E2E testing |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |

---

## Architecture

### Extension Components

Manifest V3 only. Chrome and Firefox simultaneous support.

```
+------------------------------------------------------------------+
|                        Otsu Browser Extension                     |
+------------------------------------------------------------------+
|                                                                    |
|  +--------------+  +----------------+  +------------------------+ |
|  |    Popup     |  |  Notification  |  |    Full Tab View       | |
|  |    (Vue)     |  |   Window       |  |      (Vue)             | |
|  |              |  |   (Vue)        |  |                        | |
|  | - Dashboard  |  | - Sign request |  | - Onboarding           | |
|  | - Send/Recv  |  | - Simulation   |  | - Contract Explorer    | |
|  | - History    |  | - dApp info    |  | - QR Scanner           | |
|  | - Tokens     |  | - Risk alerts  |  | - Settings             | |
|  | - NFTs       |  |                |  | - DEX                  | |
|  | - Settings   |  | 360x600px      |  | - Advanced features    | |
|  +---------+----+  +-------+--------+  +-----------+------------+ |
|            |               |                        |              |
|            +---------------+------------------------+              |
|                            |                                       |
|                            v                                       |
|  +-------------------------------------------------------------+  |
|  |                    Background Script                          |  |
|  |  (Service Worker with persistent WebSocket connection)        |  |
|  |                                                               |  |
|  |  +----------------+ +----------------+ +------------------+   |  |
|  |  | Wallet         | | Provider       | | Keyring          |   |  |
|  |  | Controller     | | Controller     | | Manager          |   |  |
|  |  +----------------+ +----------------+ +------------------+   |  |
|  |  +----------------+ +----------------+ +------------------+   |  |
|  |  | Transaction    | | Contract       | | Risk             |   |  |
|  |  | Simulator      | | Manager        | | Scanner          |   |  |
|  |  +----------------+ +----------------+ +------------------+   |  |
|  +-------------------------------------------------------------+  |
|                            |                                       |
|                            v                                       |
|  +-------------------------------------------------------------+  |
|  |                    Content Script                             |  |
|  |              (Injected into web pages)                        |  |
|  +-------------------------------------------------------------+  |
|                            |                                       |
|                            v                                       |
|  +-------------------------------------------------------------+  |
|  |                    Page Provider                              |  |
|  |  Injects:                                                     |  |
|  |    - window.xrpl        (Otsu native API)                     |  |
|  |    - window.gemwallet   (GemWallet compatibility)             |  |
|  |    - window.crossmark   (Crossmark compatibility)             |  |
|  +-------------------------------------------------------------+  |
|                                                                    |
+--------------------------------------------------------------------+
```

### Communication Flow

```
+----------+    postMessage    +--------------+    chrome.runtime    +------------+
|   dApp   | ----------------> |Content Script| -------------------> | Background |
| (website)|                   |              |                      |   Script   |
+----------+                   +--------------+                      +------------+
     ^                              |                                      |
     |                              |                               (if signing)
     |                              |                                      |
     |                              |                                      v
     |                              |                               +------------+
     |                              |                               |Notification|
     |                              |                               |  Window    |
     |                              |                               +------------+
     |                              |                                      |
     +------- response -------------+<------ chrome.runtime --------------+
```

### Key Controllers

| Controller | Responsibility |
|------------|----------------|
| **WalletController** | Account management, transaction building, network switching, balance queries |
| **ProviderController** | Handle dApp requests, permission management, compatibility layer routing |
| **KeyringManager** | Encrypted key storage, HD derivation (BIP-44), passkey auth, hardware wallet bridge |
| **TransactionSimulator** | Pre-sign dry-run via `submit` with `fail_hard`, balance impact analysis |
| **ContractManager** | XLS-101 contract interaction, ABI parsing via `contract_info`, event subscriptions |
| **RiskScanner** | Address reputation, scam database, phishing domain blocklist, pattern detection |

---

## Authentication & Security

### Passkey-First Authentication

Passkey (WebAuthn/biometrics) is the **default** authentication method. Password is available as a fallback for devices without biometric support.

**Onboarding flow:**
1. Welcome screen
2. Choose: Create new wallet / Import existing wallet
3. (If create) Display 24-word mnemonic
4. (If create) Verify by selecting words in correct order
5. (If import) Enter mnemonic / secret key / family seed / private key hex / XUMM secret numbers
6. Set up passkey (default) or password (fallback)
7. Dashboard

**Recovery flow:**
- If device is lost (passkey lost), recovery is mnemonic-only
- User must have backed up their 24-word mnemonic phrase

### Auto-Lock

- **Default timeout:** 1 hour
- **Configurable:** User can change the duration in settings
- Lock behavior: clears session keys from memory, requires re-authentication

### Blind Signing

- **Default:** Disabled
- **User setting:** Can be enabled in advanced settings
- When disabled, wallet refuses to sign transactions it cannot parse or simulate
- When enabled, shows a prominent warning before signing unknown transaction types

### Risk Scanning

| Check | Description |
|-------|-------------|
| **Address reputation** | Check destination against known-good and known-bad address databases |
| **Scam address database** | Maintained blocklist of known scam addresses, updated periodically |
| **Phishing domain blocklist** | Updatable list of known phishing domains; warn when dApp origin matches |
| **Unusual patterns** | Flag transactions that are unusually large (>10% of balance), first-time destinations, etc. |
| **Destination tag validation** | Warn if sending to a known exchange address without a destination tag |
| **Domain verification** | Verify domain field on destination accounts for payment pointer validation |

### Hardware Wallet

- Ledger device detection via WebUSB
- Sign transactions on device (never expose keys to browser)
- Address verification on device display
- Support Ledger's XRPL derivation path

---

## Wallet & Account Management

### Mnemonic & Key Derivation

| Parameter | Value |
|-----------|-------|
| **Mnemonic length** | 24 words (BIP-39) |
| **Primary derivation path** | `m/44'/144'/0'/0/n` (XRPL BIP-44 standard) |
| **Ledger derivation path** | Supported as alternative |
| **Initial accounts shown** | 50 (Rabby-style, with "load more" for additional) |

### Import Formats

| Format | Description |
|--------|-------------|
| **Mnemonic phrase** | 12 or 24 word BIP-39 phrase |
| **Secret key** | XRPL `s` prefixed secret |
| **Family seed** | XRPL family seed format |
| **Private key hex** | Raw hexadecimal private key |
| **XUMM secret numbers** | 8 rows of 6-digit numbers (Xaman format) |

### Account Types

| Type | Description |
|------|-------------|
| **HD** | Derived from mnemonic via BIP-44 path |
| **Imported** | Imported via secret key, family seed, private key hex, or XUMM numbers |
| **Hardware** | Ledger device, keys never leave device |
| **Multi-sig** | Multi-signature account with signer list |

### Account Features

- **Account selector:** Rabby-style dropdown in header
- **Account labels:** User-defined names for each account
- **Account activation:** Display "Account not activated" state when balance < 1 XRP base reserve. Show guidance on how to fund. On testnet/devnet, show built-in faucet button.
- **Account deletion:** Support `AccountDelete` transaction for recovering reserves. Show clear warning about permanent address loss.
- **Regular keys:** Support both setting a regular key on-chain and signing with a regular key

### Multi-Signature

- Create and manage signer lists
- Produce partial signatures for the user to share manually
- Does NOT coordinate signature collection between signers (out of scope for v1)

### Address Book & Contacts

- Save addresses with user-defined labels
- Verified addresses indicated visually
- Recent addresses list (auto-populated from transaction history)
- Exchange address detection: warn and require destination tag

### Address Format

- **Classic addresses only** (r-addresses)
- No X-address support
- No PayString support

---

## XRPL Features

### XRP Operations

- View XRP balance with reserve breakdown (base reserve: 1 XRP, owner reserve: 0.2 XRP per object)
- Send XRP payments with pre-sign simulation
- Receive XRP with QR code generation
- Transaction history with filtering (source: `account_tx` RPC + indexer API)
- On-chain price display sourced from XRPL DEX order books

### Token Operations

- View issued currencies/tokens with metadata from [XRPL Meta](https://xrplmeta.org)
- Set trustlines with risk warnings (unknown issuer, no domain verification, etc.)
- Remove trustlines
- Send/receive tokens
- Token logo and metadata display

### NFT Operations (XLS-20)

- View NFTs (NFTokens) with metadata/media rendering
- Transfer NFTs
- Burn NFTs
- Create sell/buy offers
- Accept offers

### DEX Operations

- View order book
- Create offers (buy/sell)
- Cancel offers
- Path-finding for cross-currency payments
- AMM interaction (swap, deposit, withdraw)

### Advanced XRPL Features

- **Escrow:** Create, finish, cancel
- **Payment Channels:** Create, claim, close
- **Checks:** Create, cash, cancel
- **Tickets:** Create and use
- **Account settings:** Flags, domain, email hash, transfer rate

### URI Scheme

Support `xrpl:` URI scheme for payment requests:

```
xrpl:rDestinationAddress?amount=1000000&dt=12345
```

The wallet should register as a handler and parse amount, destination tag, and other parameters from the URI.

---

## Smart Contracts (XLS-101)

### Scope

Otsu supports **interacting with** deployed smart contracts. Contract deployment (ContractCreate) is out of scope for the wallet UI -- that is a developer tool concern.

### Supported Transaction Types

| Transaction | Wallet Support |
|-------------|---------------|
| **ContractCall** | Full support -- call functions with typed parameters |
| **ContractModify** | Not supported (developer tool) |
| **ContractCreate** | Not supported (developer tool) |
| **ContractDelete** | Not supported (developer tool) |
| **ContractUserDelete** | Full support -- reclaim reserves from contract data |
| **ContractClawback** | Display and sign if requested by dApp |

### Contract Explorer

Auto-generated interaction UI powered by on-chain ABI:

1. User enters or selects a contract address
2. Wallet calls `contract_info` RPC to fetch the contract's ABI (functions, parameter types)
3. Wallet renders a form for each function with type-appropriate inputs:
   - `STAmount` -> amount picker
   - `AccountID` -> address field with address book integration
   - `UInt32` / `UInt64` -> numeric input
   - Other STypes -> appropriate input widgets
4. User fills parameters, wallet builds `ContractCall` transaction
5. Transaction goes through standard signing flow (simulation + notification window)

### Contract Bookmarks

- Users can save/bookmark frequently used contracts
- Bookmarked contracts appear in a "Favorites" list in the Contract Explorer
- Show contract name (if available via URI metadata) and address

### Contract Verification

- Display whether a contract's source code is verifiable via the `URI` field on ContractSource
- Visual indicator: verified (source available) vs unverified (no source URI)
- Link to source code when URI is present

### Contract Event Feed

- Subscribe to `eventEmitted` WebSocket events for contracts the user has interacted with
- Display events in an in-wallet activity feed (no browser push notifications)
- Show event name, data, and link to triggering transaction
- Feed is per-contract, accessible from the contract's detail view

### Contract Reserve Management

- Dedicated view showing reserves locked per contract via ContractData objects
- Each entry shows: contract address, data size, reserve amount (0.2 XRP per ~256 bytes)
- One-click `ContractUserDelete` to reclaim reserves
- Does NOT show standard XRPL reserves (base, owner) -- only contract-specific

### Smart Escrows (XLS-100)

- Support for programmable escrow release conditions
- Display smart escrow status and conditions in escrow views
- Interaction via the standard contract interaction flow

---

## dApp Integration & Compatibility

### Provider Injection Strategy

Otsu aggressively claims the `window.xrpl` namespace, injecting **before** other wallet extensions load. It also injects compatibility layers for existing wallets:

| Namespace | Purpose |
|-----------|---------|
| `window.xrpl` | Otsu native API (primary) |
| `window.gemwallet` | Full GemWallet API emulation |
| `window.crossmark` | Full Crossmark API emulation |

When multiple XRPL wallets are installed, Otsu activates first.

### Native Provider API (`window.xrpl`)

```typescript
interface OtsuProvider {
  // Identity
  isOtsu: true;

  // Connection
  isConnected(): boolean;
  connect(): Promise<{ address: string }>;
  disconnect(): Promise<void>;

  // Account
  getAddress(): Promise<string>;
  getNetwork(): Promise<NetworkInfo>;
  getBalance(): Promise<string>;

  // Signing
  signTransaction(tx: Transaction): Promise<SignedTransaction>;
  signAndSubmit(tx: Transaction): Promise<TxResponse>;
  signMessage(message: string): Promise<string>;

  // Network
  switchNetwork(networkId: string): Promise<void>;

  // Events
  on(event: OtsuEvent, callback: Function): void;
  off(event: OtsuEvent, callback: Function): void;
}

type OtsuEvent = 'connect' | 'disconnect' | 'accountChanged' | 'networkChanged';
```

### GemWallet Compatibility Layer

Full emulation of the GemWallet API surface:

```typescript
// window.gemwallet exposes:
// - isInstalled()
// - getPublicKey()
// - getNetwork()
// - sendPayment(payload)
// - signMessage(payload)
// - signTransaction(payload)
// - submitTransaction(payload)
// - setTrustline(payload)
// - getAddress()
// - getNFTs()
// ... all GemWallet public methods
```

Requests to `window.gemwallet` are internally routed through the Otsu ProviderController and follow the same signing/permission flow.

### Crossmark Compatibility Layer

Full emulation of the Crossmark API surface. Requests to `window.crossmark` are internally routed through the Otsu ProviderController.

### dApp Connection Flow

1. dApp calls `connect()` on any provider namespace
2. Otsu opens notification window: "Allow [dApp name + favicon] to see your address?"
3. User approves or rejects
4. If approved, address is shared; permission is stored per origin
5. Subsequent calls use stored permission until revoked

### dApp-Initiated Network Switch

dApps can request a network switch via `switchNetwork()`. The wallet shows a confirmation prompt before switching.

### Permission System

```typescript
interface DAppPermission {
  origin: string;           // e.g., "https://example.com"
  favicon: string;          // Cached favicon URL
  name: string;             // dApp name from page title/meta
  accounts: string[];       // Allowed account addresses
  methods: string[];        // Allowed API methods
  grantedAt: number;        // Unix timestamp
  expiresAt?: number;       // Optional expiry
}
```

Permissions are managed in Settings > Connected dApps, where users can view, edit, and revoke.

### npm Package (`@otsu/api`)

Published npm package for dApp developers, shipped simultaneously with the extension:

```typescript
import { OtsuWallet } from '@otsu/api';

const wallet = new OtsuWallet();

if (wallet.isInstalled()) {
  const { address } = await wallet.connect();

  const result = await wallet.signAndSubmit({
    TransactionType: 'Payment',
    Destination: 'rDestination...',
    Amount: '1000000'
  });
}
```

---

## Transaction Signing Flow

### Notification Window

All dApp-initiated signing requests open a **separate browser window** (not the popup), following Rabby's pattern:

| Parameter | Value |
|-----------|-------|
| **Window size** | 360 x 600 px |
| **Timeout** | 1 minute (pending requests expire and return error to dApp) |
| **Queue behavior** | Each signing request opens a separate window |

### Signing Window Content

```
+-------------------------------------------------------+
|  [favicon] example-dapp.com                            |
+-------------------------------------------------------+
|                                                         |
|  Transaction Simulation                                 |
|                                                         |
|  Type: Payment                                          |
|                                                         |
|  Sending:                                               |
|    100 XRP -> rDestination...ABC                        |
|                                                         |
|  Balance impact:                                        |
|    Before: 1,000 XRP                                    |
|    After:  899.988 XRP                                  |
|    Fee:    0.012 XRP                                    |
|                                                         |
|  Warnings:                                              |
|    [!] First time sending to this address               |
|    [!] Large transaction (>10% of balance)              |
|                                                         |
|  +------------------+  +-------------------+            |
|  |     Reject       |  |     Confirm       |            |
|  +------------------+  +-------------------+            |
+-------------------------------------------------------+
```

### Simulation Method

Transactions are simulated using XRPL's `submit` RPC with `fail_hard: true` flag on a test submission. The wallet parses the response to determine:

- Balance changes (XRP and tokens)
- Objects created/deleted (trustlines, offers, etc.)
- Fee cost
- Any error conditions

If simulation fails or the transaction type is unrecognized:
- **Blind signing disabled (default):** Reject with error
- **Blind signing enabled:** Show raw transaction JSON with prominent warning

---

## UI/UX Design

### Design System

Standard Tailwind CSS styling for initial development. Brand design assets (logo, color palette, design system) will be applied later.

### Theme

- Dark mode and light mode supported
- User preference persisted in settings
- Follows system preference by default

### Accessibility

- WCAG AA compliance target
- Keyboard navigation support
- Screen reader compatible labels
- Sufficient color contrast ratios

### Key Screens

| Screen | View | Purpose |
|--------|------|---------|
| **Welcome** | Full Tab | Onboarding flow (create/import wallet) |
| **Dashboard** | Popup | Account overview, XRP balance with reserve breakdown, on-chain price, quick actions |
| **Send** | Popup | Send XRP/tokens with simulation preview |
| **Receive** | Popup | Address display + QR code generation |
| **History** | Popup | Transaction list with filtering, sourced from XRPL + indexer |
| **Tokens** | Popup | Token list, trustline management, metadata from XRPL Meta |
| **NFTs** | Popup | NFT gallery with media rendering |
| **DEX** | Full Tab | Order book trading, AMM interaction |
| **Contract Explorer** | Full Tab | Browse and interact with XLS-101 smart contracts |
| **Settings** | Popup / Full Tab | Networks, security, connected dApps, auto-lock, theme, analytics |
| **Signing** | Notification Window | Transaction simulation + approve/reject (360x600px) |
| **QR Scanner** | Full Tab | Camera-based QR code scanning for addresses |

### Account Selector

Rabby-style dropdown in the popup header:
- Shows active account label and truncated address
- Dropdown lists all accounts (up to 50 initially, "load more" for additional)
- Shows account type icon (HD, imported, hardware, multi-sig)
- Quick "Add Account" action at bottom

### Component Library

```
ui/components/
+-- common/
|   +-- Button.vue
|   +-- Input.vue
|   +-- Modal.vue
|   +-- Card.vue
|   +-- Tooltip.vue
|   +-- Toggle.vue
+-- wallet/
|   +-- AccountSelector.vue
|   +-- AddressDisplay.vue
|   +-- AmountInput.vue
|   +-- NetworkBadge.vue
|   +-- TransactionItem.vue
|   +-- ReserveBreakdown.vue
|   +-- FaucetButton.vue
+-- security/
|   +-- SimulationResult.vue
|   +-- RiskBadge.vue
|   +-- WarningBanner.vue
|   +-- BlindSignWarning.vue
+-- dapp/
|   +-- DAppInfo.vue
|   +-- PermissionRequest.vue
|   +-- ConnectionPrompt.vue
+-- contracts/
|   +-- ContractExplorer.vue
|   +-- ContractFunctionForm.vue
|   +-- ContractBookmarkList.vue
|   +-- ContractEventFeed.vue
|   +-- ContractReserveManager.vue
|   +-- ContractVerificationBadge.vue
```

---

## Network Support

### Built-in Networks

| Network | WebSocket URL | Type | Features |
|---------|---------------|------|----------|
| **Mainnet** | `wss://xrplcluster.com` | Production | Full wallet features |
| **Testnet** | `wss://s.altnet.rippletest.net:51233` | Test | Faucet button enabled |
| **Devnet** | `wss://s.devnet.rippletest.net:51233` | Development | Faucet button enabled |
| **AlphaNet** | `wss://alphanet.nerdnest.xyz` | Smart Contracts | Contract Explorer prominently featured |

### Excluded Networks

| Network | Reason |
|---------|--------|
| **Xahau** | Deprecated / out of scope |
| **XRPL EVM Sidechain** | Out of scope |

### Custom Networks

Users can add custom RPC endpoints:

```typescript
interface CustomNetwork {
  id: string;
  name: string;
  url: string;                // WebSocket URL
  explorer?: string;          // Block explorer base URL
  faucet?: string;            // Faucet API URL (enables faucet button)
  networkId?: number;         // XRPL network ID
}
```

### Testnet Faucet

Built-in "Request test XRP" button visible on testnet, devnet, and any custom network with a configured faucet URL. Calls the network's faucet API and funds the active account.

---

## Data & Storage

### Transaction History

Dual-source approach:
- **Primary:** XRPL `account_tx` RPC for authoritative on-chain data
- **Secondary:** Indexer API (Bithomp, XRPScan, or similar) for enriched metadata, faster queries, and search

### Token Metadata

- Source: [XRPL Meta](https://xrplmeta.org) API
- Includes: token name, symbol, logo, issuer info, domain verification
- Cached locally for offline access

### Price Data

- Source: XRPL DEX on-chain order books
- No external price oracle dependencies
- Display XRP and token values based on live DEX prices

### Offline Support

The following features work without network connectivity:
- View cached balances and token list (last known state)
- View cached transaction history
- Export private keys / mnemonic
- View address book and contacts
- Access settings

### Backup & Export

Users can export wallet data as a file:
- Contacts / address book
- Settings and preferences
- Transaction labels and notes
- **Never includes:** private keys, mnemonics, or encrypted vault data

### Analytics

- **Opt-in only** -- disabled by default, user must explicitly enable
- **Collected (when opted in):** feature usage counts, crash reports, extension version, OS/browser type
- **Never collected:** addresses, balances, transaction data, keys, mnemonics, browsing history, dApp URLs

---

## Project Structure

```
otsu/
+-- packages/
|   +-- extension/              # Browser extension (main app)
|   |   +-- src/
|   |   |   +-- background/     # Service worker
|   |   |   |   +-- controllers/
|   |   |   |   |   +-- wallet.ts
|   |   |   |   |   +-- provider.ts
|   |   |   |   |   +-- contract.ts
|   |   |   |   +-- services/
|   |   |   |   |   +-- simulator.ts
|   |   |   |   |   +-- risk-scanner.ts
|   |   |   |   +-- index.ts
|   |   |   +-- content/        # Content scripts
|   |   |   +-- ui/             # Vue components
|   |   |   |   +-- popup/      # Popup view (360px wide)
|   |   |   |   +-- notification/ # Signing window (360x600px)
|   |   |   |   +-- tab/        # Full-page view
|   |   |   |   +-- components/ # Shared component library
|   |   |   +-- provider/       # Page provider (injected)
|   |   |   |   +-- otsu.ts     # Native API (window.xrpl)
|   |   |   |   +-- gemwallet.ts  # GemWallet compat (window.gemwallet)
|   |   |   |   +-- crossmark.ts  # Crossmark compat (window.crossmark)
|   |   |   +-- manifest/       # Extension manifests (v3)
|   |   |       +-- chrome.json
|   |   |       +-- firefox.json
|   |   +-- vite.config.ts
|   |
|   +-- core/                   # Core wallet logic (framework-agnostic)
|   |   +-- src/
|   |   |   +-- keyring/        # Key management, HD derivation, passkey
|   |   |   +-- transaction/    # TX building, simulation, signing
|   |   |   +-- contract/       # XLS-101 contract interaction, ABI parsing
|   |   |   +-- network/        # XRPL WebSocket client wrapper
|   |   |   +-- storage/        # Encrypted IndexedDB storage
|   |   |   +-- risk/           # Risk scanning, scam DB, phishing list
|   |   +-- package.json
|   |
|   +-- api/                    # Published npm package for dApp developers (@otsu/api)
|   |   +-- src/
|   |   |   +-- provider/       # Provider interface
|   |   |   +-- types/          # API type definitions
|   |   +-- package.json
|   |
|   +-- constants/              # Shared constants
|   |   +-- src/
|   |   |   +-- networks.ts     # Network definitions
|   |   |   +-- tokens.ts       # Well-known tokens
|   |   |   +-- errors.ts       # Error codes
|   |   |   +-- reserves.ts     # Reserve amounts
|   |   +-- package.json
|   |
|   +-- types/                  # Shared TypeScript types
|   |   +-- src/
|   |   |   +-- wallet.ts
|   |   |   +-- transaction.ts
|   |   |   +-- contract.ts
|   |   |   +-- api.ts
|   |   +-- package.json
|   |
|   +-- eslint-config/          # Shared ESLint config
|       +-- package.json
|
+-- docs/                       # Developer documentation site
+-- pnpm-workspace.yaml
+-- tsconfig.base.json
+-- .eslintrc.cjs
+-- .prettierrc
+-- package.json
```

---

## Package Breakdown

### `@otsu/extension`

Main browser extension package.

**Key files:**
- `background/index.ts` -- Service worker entry point, WebSocket connection management
- `background/controllers/wallet.ts` -- WalletController (accounts, transactions, networks)
- `background/controllers/provider.ts` -- ProviderController (dApp requests, permissions, compatibility routing)
- `background/controllers/contract.ts` -- ContractManager (contract_info, event subscriptions)
- `background/services/simulator.ts` -- Transaction dry-run simulation
- `background/services/risk-scanner.ts` -- Address/domain risk assessment
- `ui/popup/App.vue` -- Popup main component
- `ui/notification/Sign.vue` -- Transaction signing window
- `ui/tab/App.vue` -- Full-tab view entry point
- `provider/otsu.ts` -- Native provider injected as `window.xrpl`
- `provider/gemwallet.ts` -- GemWallet compatibility shim
- `provider/crossmark.ts` -- Crossmark compatibility shim

### `@otsu/core`

Framework-agnostic wallet logic. Can be reused for mobile/desktop later.

**Modules:**
- `keyring/` -- HD derivation (BIP-44), passkey integration, encryption, hardware wallet abstraction
- `transaction/` -- Build, simulate (dry-run), and sign transactions
- `contract/` -- XLS-101 ABI parsing, ContractCall building, event subscription management
- `network/` -- XRPL WebSocket client management with reconnection
- `storage/` -- Encrypted IndexedDB storage via idb-keyval
- `risk/` -- Scam address database, phishing domain blocklist, pattern detection

### `@otsu/api`

Published npm package for dApp developers. Ships alongside the extension at launch.

```typescript
import { OtsuWallet } from '@otsu/api';

const wallet = new OtsuWallet();

// Check if installed
if (wallet.isInstalled()) {
  // Connect (triggers permission prompt)
  const { address } = await wallet.connect();

  // Sign and submit a payment
  const result = await wallet.signAndSubmit({
    TransactionType: 'Payment',
    Destination: 'rDestination...',
    Amount: '1000000'
  });

  // Call a smart contract
  const contractResult = await wallet.signAndSubmit({
    TransactionType: 'ContractCall',
    ContractAccount: 'rContractPseudoAccount...',
    FunctionName: 'transfer',
    Parameters: [/* typed parameters */]
  });

  // Listen for account changes
  wallet.on('accountChanged', (newAddress) => {
    console.log('Switched to:', newAddress);
  });
}
```

### `@otsu/constants`

Shared constants across all packages.

```typescript
// networks.ts
export const NETWORKS = {
  mainnet: {
    id: 'mainnet',
    name: 'Mainnet',
    url: 'wss://xrplcluster.com',
    explorer: 'https://livenet.xrpl.org'
  },
  testnet: {
    id: 'testnet',
    name: 'Testnet',
    url: 'wss://s.altnet.rippletest.net:51233',
    faucet: 'https://faucet.altnet.rippletest.net/accounts'
  },
  devnet: {
    id: 'devnet',
    name: 'Devnet',
    url: 'wss://s.devnet.rippletest.net:51233',
    faucet: 'https://faucet.devnet.rippletest.net/accounts'
  },
  alphanet: {
    id: 'alphanet',
    name: 'AlphaNet',
    url: 'wss://alphanet.nerdnest.xyz',
    features: ['smart-contracts']
  }
} as const;

// reserves.ts
export const RESERVES = {
  BASE_RESERVE: 1_000_000,        // 1 XRP in drops
  OWNER_RESERVE: 200_000,         // 0.2 XRP in drops per object
  CONTRACT_DATA_UNIT: 256,        // bytes per reserve unit for ContractData
} as const;
```

### `@otsu/types`

Shared TypeScript interfaces.

```typescript
// wallet.ts
export interface Account {
  address: string;
  label: string;
  type: 'hd' | 'imported' | 'hardware' | 'multisig';
  derivationPath?: string;
  publicKey: string;
}

export interface WalletState {
  accounts: Account[];
  activeAccount: string | null;
  network: NetworkId;
  locked: boolean;
}

// contract.ts
export interface ContractBookmark {
  address: string;
  name?: string;
  sourceVerified: boolean;
  addedAt: number;
}

export interface ContractFunction {
  name: string;
  parameters: ContractParameter[];
}

export interface ContractParameter {
  flags: number;
  type: string;           // XRPL SType name
  label?: string;
}
```

---

## Milestones

### Phase 1: Foundation

Core infrastructure and basic wallet functionality.

- [ ] Project scaffolding (monorepo, tooling, pnpm workspace)
- [ ] Chrome and Firefox Manifest V3 configuration
- [ ] Core package: keyring (BIP-44 HD derivation, 24-word mnemonic)
- [ ] Core package: encrypted storage (IndexedDB + AES-GCM)
- [ ] Core package: XRPL WebSocket client with reconnection
- [ ] Extension infrastructure: background service worker, content script, page provider
- [ ] Passkey (WebAuthn) authentication as default flow
- [ ] Password fallback authentication
- [ ] Auto-lock (1 hour default, configurable)
- [ ] Basic UI: onboarding (create wallet, display/verify mnemonic, set up passkey)
- [ ] Basic UI: dashboard (XRP balance with reserve breakdown)
- [ ] Basic UI: send XRP with basic validation
- [ ] Basic UI: receive XRP (address display + QR code)
- [ ] Account activation state ("Account not activated" when < 1 XRP)
- [ ] Testnet/devnet faucet button
- [ ] Dark mode / light mode (system preference default)

### Phase 2: Core Features

Full wallet functionality for daily use.

- [ ] HD wallet with multiple accounts (50 shown, load more)
- [ ] Account selector dropdown (Rabby-style)
- [ ] Account labeling
- [ ] Import wallet (mnemonic, secret key, family seed, private key hex, XUMM secret numbers)
- [ ] Transaction history (dual-source: `account_tx` + indexer API)
- [ ] Token support: view tokens with XRPL Meta metadata
- [ ] Token support: set/remove trustlines with risk warnings
- [ ] Token support: send/receive tokens
- [ ] On-chain price display from XRPL DEX
- [ ] Reserve breakdown display (base + owner reserves)
- [ ] Offline support (cached balances, token list, history)

### Phase 3: Security & dApp Integration

Pre-sign simulation, risk scanning, and dApp connectivity.

- [ ] Transaction simulation via dry-run (`submit` with `fail_hard`)
- [ ] Notification window for signing (360x600px, separate window)
- [ ] Signing request timeout (1 minute)
- [ ] Simulation result display (balance changes, fee, warnings)
- [ ] Risk scanning: address reputation, scam database
- [ ] Risk scanning: phishing domain blocklist (updatable)
- [ ] Risk scanning: unusual pattern detection
- [ ] Risk scanning: destination tag validation for exchanges
- [ ] Risk scanning: domain verification
- [ ] Blind signing toggle (user setting, default off)
- [ ] dApp provider API (`window.xrpl`)
- [ ] GemWallet compatibility layer (`window.gemwallet`) -- full API emulation
- [ ] Crossmark compatibility layer (`window.crossmark`) -- full API emulation
- [ ] Aggressive provider namespace claiming (first to activate)
- [ ] dApp connection prompt (favicon, name, origin)
- [ ] dApp permission management (grant, view, revoke)
- [ ] dApp-initiated network switching
- [ ] Domain binding (show dApp info in signing window)
- [ ] `@otsu/api` npm package published
- [ ] `xrpl:` URI scheme handler

### Phase 4: Advanced XRPL Features

Full XRPL transaction type coverage.

- [ ] NFT support: view NFTs with media rendering
- [ ] NFT support: transfer, burn
- [ ] NFT support: create/accept buy/sell offers
- [ ] DEX: view order book (full-tab view)
- [ ] DEX: create/cancel offers
- [ ] DEX: path-finding for cross-currency payments
- [ ] AMM: swap, deposit, withdraw
- [ ] Address book: save/edit/delete contacts with labels
- [ ] Address book: verified addresses, recent list, exchange detection
- [ ] Hardware wallet: Ledger device detection (WebUSB)
- [ ] Hardware wallet: sign on device, address verification
- [ ] Multi-signature: create/manage signer lists
- [ ] Multi-signature: produce partial signatures
- [ ] Account deletion (AccountDelete with reserve recovery)
- [ ] Regular key management (set and sign with)
- [ ] Escrow: create, finish, cancel
- [ ] Payment Channels: create, claim, close
- [ ] Checks: create, cash, cancel
- [ ] Tickets: create and use
- [ ] Account settings: flags, domain, email hash

### Phase 5: Smart Contracts (XLS-101)

Native smart contract interaction.

- [ ] Contract Explorer (full-tab view)
- [ ] ABI auto-discovery via `contract_info` RPC
- [ ] Auto-generated function call forms with typed inputs
- [ ] ContractCall transaction building and signing
- [ ] ContractUserDelete for reserve reclamation
- [ ] Contract bookmarks (favorites list)
- [ ] Contract verification indicator (source URI check)
- [ ] Contract event feed (eventEmitted WebSocket subscriptions)
- [ ] Contract reserve management dashboard
- [ ] Smart Escrows (XLS-100) support
- [ ] AlphaNet prominently featured for contract developers

### Phase 6: Polish & Launch

Quality, documentation, and distribution.

- [ ] Backup/export (contacts, settings, transaction labels)
- [ ] QR code scanning (camera, full-tab view)
- [ ] WCAG AA accessibility audit and fixes
- [ ] Opt-in analytics (feature usage, crash reports)
- [ ] E2E testing (Playwright)
- [ ] Security audit
- [ ] Chrome Web Store submission
- [ ] Firefox Add-ons submission
- [ ] Developer documentation site
- [ ] Auto-update mechanism
- [ ] Landing page

---

## Distribution & Licensing

### License

Source-available initially. Will transition to open source after an initial period.

### Browser Support

| Browser | Manifest | Launch |
|---------|----------|--------|
| **Chrome** | V3 | Simultaneous |
| **Firefox** | V3 | Simultaneous |

### Distribution

- Chrome Web Store (auto-update enabled)
- Firefox Add-ons (auto-update enabled)
- Auto-update is a configurable parameter in settings

### Developer Resources

- `@otsu/api` npm package (published at extension launch)
- Developer documentation site (API reference, integration guides, examples)

---

## References

- [Rabby Wallet](https://github.com/RabbyHub/Rabby) -- Architecture, UX, and provider strategy inspiration
- [GemWallet](https://github.com/GemWallet/gemwallet-extension) -- XRPL integration patterns, API shape for compatibility
- [Crossmark](https://docs.crossmark.io/) -- API shape for compatibility
- [XRPL Documentation](https://xrpl.org/docs) -- Ledger features reference
- [xrpl.js](https://github.com/XRPLF/xrpl.js) -- JavaScript/TypeScript library
- [XLS-101: XRPL Smart Contracts](https://github.com/XRPLF/XRPL-Standards/discussions/271) -- Smart contract specification
- [XLS-100: Smart Escrows](https://github.com/XRPLF/XRPL-Standards/discussions/270) -- Programmable escrow specification
- [XRPL Meta](https://xrplmeta.org) -- Token metadata source
- [XRPL Reserves](https://xrpl.org/docs/concepts/accounts/reserves) -- Current reserve requirements (1 XRP base, 0.2 XRP owner)
