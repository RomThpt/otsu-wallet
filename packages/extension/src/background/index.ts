import { Buffer } from 'buffer'
globalThis.Buffer = Buffer

import browser from 'webextension-polyfill'
import type { ExtensionMessage } from '@otsu/types'
import {
  handleMessage,
  controller,
  providerController,
  identityController,
} from './message-handler'
import { setupAutoLock, resetAutoLock, clearAutoLock } from './alarm-manager'

// Initialize controller state on worker wake.
// handleMessage() already calls controller.initialize() per request (idempotent),
// but we also kick it off eagerly so state is ready before the first message arrives.
const initPromise = Promise.all([
  controller.initialize().catch((e) => console.error('Controller init failed:', e)),
  providerController.initialize().catch((e) => console.error('Provider init failed:', e)),
  identityController.initialize().catch((e) => console.error('Identity init failed:', e)),
])

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    browser.tabs.create({ url: browser.runtime.getURL('tab.html') })
  }
})

setupAutoLock(() => {
  handleMessage({ type: 'LOCK' })
})

browser.runtime.onMessage.addListener((message: unknown) => {
  const msg = message as ExtensionMessage

  if (msg.type === 'UNLOCK') {
    resetAutoLock()
  } else if (msg.type === 'LOCK') {
    clearAutoLock()
  }

  // Wait for init before handling any message
  const handle = initPromise.then(() => {
    // Notify provider controller of account/network changes
    if (msg.type === 'SET_ACTIVE_ACCOUNT') {
      const payload = msg.payload as { address: string }
      return handleMessage(msg).then((result) => {
        providerController.notifyAccountChanged(payload.address)
        return result
      })
    }

    if (msg.type === 'SWITCH_NETWORK') {
      const payload = msg.payload as { networkId: string }
      return handleMessage(msg).then((result) => {
        providerController.notifyNetworkChanged(payload.networkId)
        return result
      })
    }

    return handleMessage(msg)
  })

  return handle
})
