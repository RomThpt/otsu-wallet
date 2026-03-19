---
description: A secure, open-source browser extension wallet for XRPL and XRPL EVM Sidechain.
---

# Introduction to Otsu Wallet

<DownloadLLMsFullDoc />

Otsu is a secure, open-source browser extension wallet for the **XRP Ledger** and **XRPL EVM Sidechain**. It supports multi-chain account management, token & NFT tracking, and dApp integration.

## What is Otsu?

Otsu provides a complete wallet experience as a browser extension for Chrome and Firefox. It includes:

- **Multi-Chain Support** - XRP Ledger (Mainnet & Testnet) and XRPL EVM Sidechain (Mainnet & Testnet)
- **Account Management** - Create or import accounts using mnemonic phrases or seeds
- **Token & NFT Tracking** - View balances, trustlines, and NFTs across chains
- **Transaction History** - Full history with memo support
- **dApp Integration** - XRPL provider API and EIP-1193 compatible EVM provider
- **Cross-Chain Bridge** - Transfer assets between XRPL and EVM via Axelar

## Key Features

### Secure by Design

All sensitive data is encrypted locally using AES-GCM with PBKDF2 key derivation. Your keys never leave your device and no data is collected or sent to external servers.

### Multi-Chain

Manage XRPL and EVM accounts from a single wallet. Switch between networks seamlessly and bridge assets cross-chain.

### Developer Friendly

Otsu exposes a provider API for dApps to interact with, supporting both XRPL transactions and EIP-1193 for EVM chains.

### Open Source

Otsu is fully open source under the MIT license. Anyone can audit the code, contribute, or fork it.

## Supported Networks

| Network | Type | Chain ID |
|---------|------|----------|
| XRPL Mainnet | XRPL | - |
| XRPL Testnet | XRPL | - |
| XRPL EVM Sidechain | EVM | 1440002 |
| XRPL EVM Devnet | EVM | 1449000 |

## Next Steps

1. **[Installation](/guide/installation)** - Install Otsu on your browser
2. **[Getting Started](/guide/getting-started)** - Create your first wallet
3. **[Managing Accounts](/guide/accounts)** - Add and manage accounts
4. **[Tokens & NFTs](/guide/tokens)** - Track your assets
5. **[Transactions](/guide/transactions)** - Send and receive
6. **[dApp Integration](/guide/dapp-integration)** - Build with Otsu
7. **[Contributing](/guide/contributing)** - Help improve Otsu

## Community & Support

- **GitHub** - [RomThpt/otsu-wallet](https://github.com/RomThpt/otsu-wallet)
- **Issues** - Report bugs or request features on GitHub
- **XRPL Commons** - [xrpl-commons.org](https://www.xrpl-commons.org)

## License

MIT License - See the [LICENSE](https://github.com/RomThpt/otsu-wallet/blob/main/LICENSE) file for details.
