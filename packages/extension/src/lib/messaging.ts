import browser from 'webextension-polyfill'
import type { ExtensionMessage, ExtensionResponse } from '@otsu/types'

const MESSAGE_TIMEOUT_MS = 10_000

export async function sendMessage<T = unknown>(
  message: ExtensionMessage,
): Promise<ExtensionResponse<T>> {
  const response = await Promise.race([
    browser.runtime.sendMessage(message),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Message timeout: ${message.type}`)), MESSAGE_TIMEOUT_MS),
    ),
  ])
  return response as ExtensionResponse<T>
}
