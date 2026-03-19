# dApp Integration

Otsu provides a JavaScript SDK (`@otsu/api`) for dApps to interact with the wallet. The SDK wraps the `window.xrpl` provider injected by the extension.

## Installation

```bash
npm install @otsu/api
```

## Quick Start

```typescript
import { OtsuWallet } from '@otsu/api'

// Check if the extension is installed
if (!OtsuWallet.isInstalled()) {
  console.log('Please install Otsu Wallet')
}

// Create an instance and connect
const wallet = new OtsuWallet()
const { address } = await wallet.connect()
console.log('Connected:', address)
```

## Connection

### Check Installation

```typescript
if (OtsuWallet.isInstalled()) {
  // Extension is available
}
```

`isInstalled()` checks for the presence of `window.xrpl.isOtsu`.

### Connect

```typescript
const wallet = new OtsuWallet()

// Basic connection
const { address } = await wallet.connect()

// With scopes
const { address } = await wallet.connect({ scopes: ['sign'] })
```

### Disconnect

```typescript
await wallet.disconnect()
```

### Check Connection Status

```typescript
const connected = wallet.isConnected()
```

## Account Information

### Get Address

```typescript
const { address } = await wallet.getAddress()
```

### Get Balance

```typescript
const { available, total, reserved } = await wallet.getBalance()
```

All balance values are strings to preserve precision.

### Get Network

```typescript
const { network } = await wallet.getNetwork()
```

### Switch Network

```typescript
const { network } = await wallet.switchNetwork('testnet')
```

## Transactions

### Sign a Transaction

Sign without submitting:

```typescript
const { tx_blob, hash } = await wallet.signTransaction({
  TransactionType: 'Payment',
  Destination: 'rDestination...',
  Amount: '1000000', // drops
})
```

### Sign and Submit

Sign and submit in one step:

```typescript
const { tx_blob, hash } = await wallet.signAndSubmit({
  TransactionType: 'Payment',
  Destination: 'rDestination...',
  Amount: '1000000',
})
```

### Check Transaction Status

```typescript
const status = await wallet.getTransactionStatus(hash)
// { hash, validated, result, ledgerIndex }
```

## Message Signing

```typescript
const { signature } = await wallet.signMessage('Hello from my dApp')
```

## NFTs

```typescript
const nfts = await wallet.getNFTs()
// Array of { tokenID, uri, flags, transferFee, issuer, taxon, serial }
```

## DEX

```typescript
const offers = await wallet.getAccountOffers()
// Array of { seq, takerGets, takerPays, flags }
```

`takerGets` and `takerPays` are either a string (XRP in drops) or an object `{ currency, issuer, value }` for tokens.

## Smart Contracts

### Get Contract Info

```typescript
const info = await wallet.getContractInfo('rContractAddress...')
// { address, functions, owner, sourceUri }
```

### Call a Contract

```typescript
const { tx_blob, hash } = await wallet.contractCall({
  contractAddress: 'rContractAddress...',
  functionName: 'transfer',
  parameters: [
    { sType: 'address', value: 'rRecipient...', flags: 0 },
    { sType: 'uint64', value: '1000', flags: 0 },
  ],
  fee: '12', // optional
})
```

## Events

Listen for wallet state changes:

```typescript
wallet.on('accountChanged', (data) => {
  console.log('Account changed:', data)
})

wallet.on('networkChanged', (data) => {
  console.log('Network changed:', data)
})

wallet.on('connected', (data) => {
  console.log('Wallet connected')
})

wallet.on('disconnected', (data) => {
  console.log('Wallet disconnected')
})
```

Remove a listener:

```typescript
wallet.off('accountChanged', myCallback)
```
