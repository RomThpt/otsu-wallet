import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

const root = resolve(__dirname)

export default defineConfig({
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
    },
  },
})
