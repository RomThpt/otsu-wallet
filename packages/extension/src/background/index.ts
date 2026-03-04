import browser from 'webextension-polyfill'
import type { ExtensionMessage } from '@otsu/types'
import { handleMessage, controller, providerController } from './message-handler'
import { setupAutoLock, resetAutoLock, clearAutoLock } from './alarm-manager'

// Initialize controller state on worker wake
controller.initialize()
providerController.initialize()

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

  // Notify provider controller of account/network changes
  if (msg.type === 'SET_ACTIVE_ACCOUNT') {
    const payload = msg.payload as { address: string }
    handleMessage(msg).then(() => {
      providerController.notifyAccountChanged(payload.address)
    })
    return handleMessage(msg)
  }

  if (msg.type === 'SWITCH_NETWORK') {
    const payload = msg.payload as { networkId: string }
    handleMessage(msg).then(() => {
      providerController.notifyNetworkChanged(payload.networkId)
    })
    return handleMessage(msg)
  }

  return handleMessage(msg)
})
