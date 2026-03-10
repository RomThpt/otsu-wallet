import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import webExtension from 'vite-plugin-web-extension'
import { resolve } from 'path'
import { readdir, rename, mkdir, copyFile } from 'fs/promises'

function renameUnderscoreFiles(): Plugin {
  return {
    name: 'rename-underscore-files',
    apply: 'build',
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const distDir = resolve(__dirname, 'dist')
        try {
          const files = await readdir(distDir)
          for (const file of files) {
            if (file.startsWith('_')) {
              const newName = file.replace(/^_/, 'x')
              await rename(resolve(distDir, file), resolve(distDir, newName))
              // Update references in all JS/HTML files
              for (const f of await readdir(distDir)) {
                if (f.endsWith('.js') || f.endsWith('.html')) {
                  const { readFile, writeFile } = await import('fs/promises')
                  const content = await readFile(resolve(distDir, f), 'utf-8')
                  if (content.includes(file)) {
                    await writeFile(resolve(distDir, f), content.replaceAll(file, newName))
                  }
                }
              }
            }
          }
          // Copy icon assets to dist
          const srcAssets = resolve(__dirname, 'src/assets')
          const distAssets = resolve(distDir, 'assets')
          try {
            await mkdir(distAssets, { recursive: true })
            const assets = await readdir(srcAssets)
            for (const asset of assets) {
              await copyFile(resolve(srcAssets, asset), resolve(distAssets, asset))
            }
          } catch {
            // assets may not exist
          }
        } catch {
          // dist may not exist yet
        }
      },
    },
  }
}

const manifestFile =
  process.env.BROWSER === 'firefox' ? 'manifest.firefox.json' : 'manifest.json'

export default defineConfig({
  root: resolve(__dirname, 'src'),
  plugins: [
    vue(),
    webExtension({
      manifest: resolve(__dirname, 'src', manifestFile),
      additionalInputs: [
        'tab.html',
        'notification.html',
        'provider/inject.ts',
        'provider/evm-inject.ts',
      ],
      htmlViteConfig: {
        build: {
          rollupOptions: {
            output: {
              manualChunks(id) {
                if (
                  id.includes('node_modules/xrpl') ||
                  id.includes('node_modules/ripple') ||
                  id.includes('node_modules/bip39') ||
                  id.includes('node_modules/@scure')
                ) {
                  return 'vendor-xrpl'
                }
                if (id.includes('node_modules/ethers')) {
                  return 'vendor-ethers'
                }
                if (id.includes('node_modules/@axelar-network')) {
                  return 'vendor-axelar'
                }
              },
            },
          },
        },
      },
    }),
    renameUnderscoreFiles(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
})
