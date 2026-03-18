# Installation

Otsu Wallet is built from source and loaded as an unpacked extension in your browser.

## Requirements

- **Node.js** 20+
- **pnpm** 10+
- **Chrome** 120+ or **Firefox** 115+

## Build

```bash
# Clone the repository
git clone https://github.com/RomThpt/otsu-wallet.git
cd otsu-wallet

# Install dependencies
pnpm install
```

## Chrome

```bash
# Build the Chrome extension
pnpm --filter @otsu/extension build
```

The built extension will be in `packages/extension/dist/`. To load it:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `packages/extension/dist/` directory

## Firefox

```bash
# Build the Firefox extension
pnpm --filter @otsu/extension build:firefox
```

The built extension will be in `packages/extension/dist-firefox/`. To load it:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select any file inside the `packages/extension/dist-firefox/` directory
