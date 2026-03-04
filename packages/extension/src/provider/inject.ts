Object.defineProperty(window, 'xrpl', {
  value: {
    isOtsu: true,
    isConnected: () => false,
  },
  writable: false,
  configurable: false,
})
