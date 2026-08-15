import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

interface GeneratedManifest {
  icons?: Record<string, string>
  action?: { default_icon?: Record<string, string>; default_popup?: string }
  background?: { service_worker?: string; scripts?: string[] }
  content_scripts?: Array<{ js?: string[]; css?: string[] }>
  web_accessible_resources?: Array<{ resources?: string[] }>
  protocol_handlers?: Array<{ url?: string }>
  options_ui?: { page?: string }
  side_panel?: { default_path?: string }
  devtools_page?: string
  chrome_url_overrides?: Record<string, string>
}

const distDir = resolve(import.meta.dirname, '../dist')
const manifestPath = resolve(distDir, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as GeneratedManifest

const referencedPaths = new Set<string>()

function addPath(path: string | undefined): void {
  if (!path || /^(?:[a-z]+:|\/\/)/i.test(path) || path.includes('*')) return
  const localPath = path.split(/[?#]/, 1)[0]
  if (localPath) referencedPaths.add(localPath)
}

Object.values(manifest.icons ?? {}).forEach(addPath)
Object.values(manifest.action?.default_icon ?? {}).forEach(addPath)
addPath(manifest.action?.default_popup)
addPath(manifest.background?.service_worker)
manifest.background?.scripts?.forEach(addPath)
manifest.content_scripts?.forEach((entry) => {
  entry.js?.forEach(addPath)
  entry.css?.forEach(addPath)
})
manifest.web_accessible_resources?.forEach((entry) => entry.resources?.forEach(addPath))
manifest.protocol_handlers?.forEach((entry) => addPath(entry.url))
addPath(manifest.options_ui?.page)
addPath(manifest.side_panel?.default_path)
addPath(manifest.devtools_page)
Object.values(manifest.chrome_url_overrides ?? {}).forEach(addPath)

const missingPaths = [...referencedPaths].filter((path) => !existsSync(resolve(distDir, path)))
if (missingPaths.length > 0) {
  throw new Error(`Generated manifest references missing files:\n${missingPaths.join('\n')}`)
}

console.warn(`Validated ${referencedPaths.size} generated manifest resources.`)
