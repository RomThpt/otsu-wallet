import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const srcDir = resolve(__dirname, '../src')

const manifest = JSON.parse(readFileSync(resolve(srcDir, 'manifest.json'), 'utf-8'))

// Replace service_worker with scripts array for Firefox
if (manifest.background?.service_worker) {
  manifest.background = {
    scripts: [manifest.background.service_worker],
    type: manifest.background.type,
  }
}

// Add Firefox-specific settings
manifest.browser_specific_settings = {
  gecko: {
    id: 'otsu-wallet@otsu.dev',
    strict_min_version: '109.0',
  },
}

// Remove protocol_handlers (not supported in Firefox MV3 the same way)
delete manifest.protocol_handlers

writeFileSync(resolve(srcDir, 'manifest.firefox.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log('Firefox manifest written to src/manifest.firefox.json')
