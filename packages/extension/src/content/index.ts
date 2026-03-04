const script = document.createElement('script')
script.src = chrome.runtime.getURL('provider/inject.js')
script.type = 'module'
;(document.head || document.documentElement).appendChild(script)
script.onload = () => script.remove()
