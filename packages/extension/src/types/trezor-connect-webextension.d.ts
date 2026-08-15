declare module '@trezor/connect-webextension' {
  const TrezorConnect: typeof import('@trezor/connect-webextension/lib/index').default
  export default TrezorConnect
  export * from '@trezor/connect-webextension/lib/index'
}
