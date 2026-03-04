// 1. Inject provider script (same as before)
const script = document.createElement('script')
script.src = chrome.runtime.getURL('provider/inject.js')
script.type = 'module'
;(document.head || document.documentElement).appendChild(script)
script.onload = () => script.remove()

// 2. Listen for provider requests from page context
// Page sends: window.postMessage({ type: 'OTSU_PROVIDER_REQUEST', request }, '*')
// Content script enriches with trusted origin/favicon/title, forwards to background
window.addEventListener('message', async (event) => {
  // Only accept messages from the same frame
  if (event.source !== window) return
  if (event.data?.type !== 'OTSU_PROVIDER_REQUEST') return

  const request = event.data.request
  if (!request?.id || !request?.method) return

  // Attach trusted origin info (content script is trusted, page is not)
  request.origin = window.location.origin
  request.favicon = getFavicon()
  request.title = document.title

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PROVIDER_REQUEST',
      payload: { request },
    })

    window.postMessage(
      {
        type: 'OTSU_PROVIDER_RESPONSE',
        id: request.id,
        result: response?.data,
        error: response?.error,
      },
      '*',
    )
  } catch (error) {
    window.postMessage(
      {
        type: 'OTSU_PROVIDER_RESPONSE',
        id: request.id,
        error: (error as Error).message,
      },
      '*',
    )
  }
})

// 3. Listen for events from background -> forward to page
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'PROVIDER_EVENT') {
    window.postMessage(
      {
        type: 'OTSU_PROVIDER_EVENT',
        event: message.payload?.event,
      },
      '*',
    )
  }
})

function getFavicon(): string | undefined {
  const link = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"]',
  )
  return link?.href ?? undefined
}
