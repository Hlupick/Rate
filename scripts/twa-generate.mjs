// Regenerates the Android Studio project from twa-manifest.json without prompts.
// Run from the wrapper directory (C:\Users\Stasg\monah-twa), where @bubblewrap/core
// is installed. Used by scripts/build-apk.ps1 before `bubblewrap build`.
import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { createRequire } from 'node:module'

const dir = process.cwd()
const manifestFile = path.join(dir, 'twa-manifest.json')
if (!fs.existsSync(manifestFile)) throw new Error(`twa-manifest.json not found in ${dir}`)

const requireFromHere = createRequire(path.join(dir, 'package.json'))
const { TwaGenerator, TwaManifest } = requireFromHere('@bubblewrap/core')

const manifest = await TwaManifest.fromFile(manifestFile)
const generator = new TwaGenerator()

console.log('Generating Android project...')
await generator.createTwaProject(dir, manifest)

// Bubblewrap compares this checksum to decide whether the project is stale.
const checksum = crypto.createHash('sha1').update(fs.readFileSync(manifestFile)).digest('hex')
fs.writeFileSync(path.join(dir, 'manifest-checksum.txt'), checksum)
console.log('Project ready, manifest checksum written')
