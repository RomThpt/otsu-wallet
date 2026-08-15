import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const root = resolve(__dirname)

export default defineConfig({
  define: { __LEDGER_SUPPORTED__: true },
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    root,
    include: ['src/**/*.test.ts'],
    setupFiles: [resolve(__dirname, '../../test-setup.ts')],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@ledger': resolve(__dirname, 'src/lib/ledger-loader.ts'),
    },
  },
})
