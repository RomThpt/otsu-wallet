# API Reference

Complete reference for the `@otsu/api` package.

## OtsuWallet

### Static Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `isInstalled()` | `boolean` | Whether the Otsu extension is detected |

### Instance Methods

#### Connection

| Method | Returns | Description |
|--------|---------|-------------|
| `connect(params?)` | `Promise<AddressInfo>` | Connect to the wallet. Optional `{ scopes?: string[] }` |
| `disconnect()` | `Promise<void>` | Disconnect from the wallet |
| `isConnected()` | `boolean` | Current connection status |

#### Account

| Method | Returns | Description |
|--------|---------|-------------|
| `getAddress()` | `Promise<AddressInfo>` | Get the active account address |
| `getBalance()` | `Promise<BalanceInfo>` | Get account balance |
| `getNetwork()` | `Promise<NetworkInfo>` | Get current network |
| `switchNetwork(networkId)` | `Promise<NetworkInfo>` | Switch to a different network |

#### Transactions

| Method | Returns | Description |
|--------|---------|-------------|
| `signTransaction(tx)` | `Promise<SignedTransaction>` | Sign a transaction without submitting |
| `signAndSubmit(tx)` | `Promise<SignedTransaction>` | Sign and submit a transaction |
| `getTransactionStatus(hash)` | `Promise<TransactionStatus>` | Query transaction status |
| `signMessage(message)` | `Promise<SignedMessage>` | Sign an arbitrary message |

#### Assets

| Method | Returns | Description |
|--------|---------|-------------|
| `getNFTs()` | `Promise<NFTRecord[]>` | Get all NFTs owned by the account |
| `getAccountOffers()` | `Promise<DexOffer[]>` | Get open DEX offers |

#### Smart Contracts

| Method | Returns | Description |
|--------|---------|-------------|
| `getContractInfo(address)` | `Promise<ContractInfo>` | Get contract metadata and functions |
| `contractCall(params)` | `Promise<SignedTransaction>` | Execute a contract function call |

#### Events

| Method | Returns | Description |
|--------|---------|-------------|
| `on(event, callback)` | `void` | Register an event listener |
| `off(event, callback)` | `void` | Remove an event listener |

## Types

### AddressInfo

```typescript
interface AddressInfo {
  address: string
}
```

### BalanceInfo

```typescript
interface BalanceInfo {
  available: string
  total: string
  reserved: string
}
```

### NetworkInfo

```typescript
interface NetworkInfo {
  network: string
}
```

### SignedTransaction

```typescript
interface SignedTransaction {
  tx_blob: string
  hash: string
}
```

### SignedMessage

```typescript
interface SignedMessage {
  signature: string
}
```

### TransactionStatus

```typescript
interface TransactionStatus {
  hash: string
  validated: boolean
  result: string
  ledgerIndex: number
}
```

### NFTRecord

```typescript
interface NFTRecord {
  tokenID: string
  uri?: string
  flags: number
  transferFee: number
  issuer: string
  taxon: number
  serial: number
}
```

### DexOffer

```typescript
interface DexOffer {
  seq: number
  takerGets: string | { currency: string; issuer: string; value: string }
  takerPays: string | { currency: string; issuer: string; value: string }
  flags: number
}
```

### ContractInfo

```typescript
interface ContractInfo {
  address: string
  functions: Array<{
    name: string
    parameters: Array<{
      flags: number
      sType: string
      label?: string
    }>
  }>
  owner?: string
  sourceUri?: string
}
```

### ContractCallParams

```typescript
interface ContractCallParams {
  contractAddress: string
  functionName: string
  parameters?: Array<{ sType: string; value: string; flags: number }>
  fee?: string
}
```

### Event Types

```typescript
type OtsuEventType =
  | 'accountChanged'
  | 'networkChanged'
  | 'connected'
  | 'disconnected'

type OtsuEventCallback = (data: unknown) => void
```
