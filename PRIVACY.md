# Privacy Policy

**Otsu Wallet** -- XRPL Browser Extension

_Last updated: March 10, 2026_

## Overview

Otsu Wallet is a browser extension for interacting with the XRP Ledger (XRPL) and XRPL EVM Sidechain. This privacy policy explains how the extension handles your data.

## Data Collection

**Otsu Wallet does not collect, store, or transmit any personal data to external servers.**

- No analytics or telemetry
- No crash reporting
- No user tracking
- No cookies or fingerprinting
- No third-party data sharing

## Data Storage

All data is stored **locally on your device** using the browser's built-in storage APIs (`chrome.storage.local` / `browser.storage.local`):

- **Encrypted private keys and mnemonics** -- encrypted with your password using PBKDF2 (600,000 iterations) and AES-GCM
- **Wallet addresses and account metadata** -- stored locally for display purposes
- **User preferences and settings** -- theme, network selection, trusted dApps

No data is ever sent to Otsu servers. There are no Otsu servers.

## Network Communication

The extension communicates **only** with the following types of external services, strictly to fulfill wallet functionality:

| Service | Purpose | Data Sent |
|---|---|---|
| XRPL nodes (WebSocket RPC) | Submit transactions, query balances and history | Account addresses, signed transactions |
| XRPL EVM Sidechain nodes (JSON-RPC) | EVM transaction submission, balance queries | Account addresses, signed transactions |
| XRPL Meta API | Token metadata and icons | Token currency codes |
| Axelar network | Cross-chain bridge fee estimation and status | Bridge transaction hashes |

All network requests are made directly from your browser to these public blockchain infrastructure endpoints. No data passes through any intermediary server operated by Otsu Wallet.

## Permissions

The extension requests the following browser permissions:

- **storage** -- To save encrypted wallet data locally
- **alarms** -- To schedule periodic balance refreshes
- **tabs** -- To open full-page views (import wallet, settings)

No broad host permissions are requested. The extension does not read or modify web page content except when a dApp explicitly requests wallet interaction through the provider API.

## dApp Permissions

When a dApp requests access to your wallet, you are prompted to approve or deny the connection. You can revoke dApp permissions at any time from the extension settings. Permission scopes are granular: read, sign, submit, and network switching are independently controllable.

## Security

- Private keys never leave the extension's local storage in unencrypted form
- All cryptographic operations happen locally in the browser
- The extension uses Manifest V3 with a minimal permission footprint
- No remote code execution or external script loading

## Children's Privacy

Otsu Wallet is not directed at children under 13 and does not knowingly collect data from children.

## Changes to This Policy

Updates to this policy will be posted in the extension's repository. The "Last updated" date at the top will reflect any changes.

## Contact

For privacy-related questions or concerns, open an issue at:
https://github.com/RomThpt/otsu-wallet/issues

## Open Source

Otsu Wallet is open-source software licensed under the MIT License. You can review the complete source code to verify these privacy claims.
