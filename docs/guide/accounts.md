# Managing Accounts

Otsu supports both XRPL and EVM accounts, all derived from a single mnemonic phrase.

## Account Types

### XRPL Accounts

Standard XRP Ledger accounts used for XRP, tokens (trustlines), and NFTs. These accounts use the secp256k1 curve and the XRPL derivation path.

### EVM Accounts

Ethereum-compatible accounts for the XRPL EVM Sidechain. These use standard EVM derivation paths and are compatible with EIP-1193.

## Adding Accounts

You can add multiple accounts from your mnemonic:

1. Open the **Accounts** section
2. Click **Add Account**
3. Choose the account type (XRPL or EVM)
4. The next available derivation index is used automatically

## Account Activation (XRPL)

XRPL accounts must be activated with a minimum reserve (currently 1 XRP). Until activated, the account cannot hold tokens or submit transactions.

On testnet, you can use the built-in faucet to fund your account.

## Exporting Keys

::: danger
Exporting your private key exposes it. Only do this if you understand the risks.
:::

1. Open **Settings**
2. Select the account to export
3. Enter your wallet password
4. Your private key or seed will be displayed
