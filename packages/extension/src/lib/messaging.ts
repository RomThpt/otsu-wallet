import browser from 'webextension-polyfill'
import type { ExtensionMessage, ExtensionResponse } from '@otsu/types'

export async function sendMessage<T = unknown>(
  message: ExtensionMessage,
): Promise<ExtensionResponse<T>> {
  const response = await browser.runtime.sendMessage(message)
  return response as ExtensionResponse<T>
}
