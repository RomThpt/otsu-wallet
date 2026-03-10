import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const extDir = resolve(__dirname, '..')

const pkg = JSON.parse(readFileSync(resolve(extDir, 'package.json'), 'utf-8'))
const manifestPath = resolve(extDir, 'src/manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

if (manifest.version !== pkg.version) {
  manifest.version = pkg.version
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Synced manifest version to ${pkg.version}`)
} else {
  console.log(`Version already in sync: ${pkg.version}`)
}
