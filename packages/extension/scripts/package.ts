import { readFileSync, createWriteStream, readdirSync, statSync } from 'fs'
import { resolve, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'

const __dirname = dirname(fileURLToPath(import.meta.url))
const extDir = resolve(__dirname, '..')
const distDir = resolve(extDir, 'dist')

const browser = process.argv[2]
if (!browser || !['chrome', 'firefox'].includes(browser)) {
  console.error('Usage: tsx scripts/package.ts <chrome|firefox>')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(resolve(distDir, 'manifest.json'), 'utf-8'))
const version = manifest.version as string
const zipName = `otsu-wallet-${version}-${browser}.zip`
const outPath = resolve(extDir, zipName)

async function createZip(sourceDir: string, outputPath: string): Promise<void> {
  // Use tar + gzip as a cross-platform zip alternative
  // In CI we'll use a proper zip command
  const { execSync } = await import('child_process')

  try {
    // Try system zip first (available on macOS and most Linux)
    execSync(`cd "${sourceDir}" && zip -r "${outputPath}" .`, { stdio: 'pipe' })
  } catch {
    // Fallback: create a tar.gz instead
    const tarName = outputPath.replace('.zip', '.tar.gz')
    execSync(`tar -czf "${tarName}" -C "${sourceDir}" .`, { stdio: 'pipe' })
    console.log(`Created ${tarName} (zip unavailable, used tar.gz)`)
    return
  }

  console.log(`Created ${outputPath}`)
}

await createZip(distDir, outPath)

// For Firefox, also zip source (required by Mozilla for review)
if (browser === 'firefox') {
  const sourceZipName = `otsu-wallet-${version}-firefox-source.zip`
  const sourceOutPath = resolve(extDir, sourceZipName)
  const rootDir = resolve(extDir, '../..')

  const { execSync } = await import('child_process')
  try {
    execSync(
      `cd "${rootDir}" && zip -r "${sourceOutPath}" . -x "node_modules/*" "*/node_modules/*" "*/dist/*" ".git/*"`,
      { stdio: 'pipe' },
    )
    console.log(`Created ${sourceOutPath}`)
  } catch {
    console.log('Source zip skipped (zip unavailable)')
  }
}
