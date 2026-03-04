import browser from 'webextension-polyfill'
import type { ExtensionMessage } from '@otsu/types'
import { handleMessage, controller } from './message-handler'
import { setupAutoLock, resetAutoLock, clearAutoLock } from './alarm-manager'

// Initialize controller state on worker wake
controller.initialize()

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

  return handleMessage(msg)
})
