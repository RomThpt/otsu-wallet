import { OtsuProvider } from './otsu'
import { createGemWalletShim } from './gemwallet'
import { createCrossmarkShim } from './crossmark'

const provider = new OtsuProvider()

Object.defineProperty(window, 'xrpl', {
  value: provider,
  writable: false,
  configurable: false,
})

// GemWallet compatibility
Object.defineProperty(window, 'gemwallet', {
  value: createGemWalletShim(provider),
  writable: false,
  configurable: false,
})

// Crossmark compatibility
Object.defineProperty(window, 'crossmark', {
  value: createCrossmarkShim(provider),
  writable: false,
  configurable: false,
})
