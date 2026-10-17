#!/usr/bin/env node
// Maps every Webflow image URL still referenced by the generated dataset to the
// Sanity asset the import made from it, so the site never loads an image from
// Webflow's CDN, even when it builds from the local dataset.
//
//   node scripts/migrate/legacy-image-map.mjs
//
// The local dataset (migration/sanity-import/production.ndjson) stores
// not-yet-imported images as `_sanityAsset: "image@<webflow url>"`. The Sanity
// import uploads each of them and keeps the file name as the asset's
// `originalFilename`, so the URL's last path segment finds the asset. This script
// reads the public production dataset (read-only, no token) and writes
// web/src/data/legacy-images.json: {<webflow url>: {asset, width, height}}.
// web/src/lib/image.ts then renders those images through Sanity's image CDN
// (sized, AVIF/WebP). The script fails if a URL has no Sanity asset: nothing is
// ever served from Webflow's CDN.
//
// Re-run it after a dataset import that adds images.

import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DATASET = path.join(ROOT, 'migration/sanity-import/production.ndjson')
const OUT = path.join(ROOT, 'web/src/data/legacy-images.json')
const PROJECT_ID = 'qhi2uf0l'
const DATASET_NAME = 'production'

const text = await readFile(DATASET, 'utf8')
const urls = [...new Set([...text.matchAll(/"image@(https?:\/\/[^"]+)"/g)].map((m) => m[1]))].sort()

const query = encodeURIComponent('*[_type == "sanity.imageAsset"]{_id, originalFilename, "width": metadata.dimensions.width, "height": metadata.dimensions.height}')
const res = await fetch(`https://${PROJECT_ID}.apicdn.sanity.io/v2026-10-01/data/query/${DATASET_NAME}?query=${query}&perspective=published`)
if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`)
const assets = (await res.json()).result

const decode = (s) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}
const byName = new Map()
for (const a of assets) {
  if (!a.originalFilename) continue
  byName.set(a.originalFilename, a)
  byName.set(decode(a.originalFilename), a)
}

const out = {}
const missing = []
for (const url of urls) {
  const name = url.split('/').pop()
  const asset = byName.get(name) ?? byName.get(decode(name))
  if (asset) out[url] = {asset: asset._id, width: asset.width, height: asset.height}
  else missing.push(url)
}

await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`legacy images: ${urls.length} in the dataset, ${Object.keys(out).length} mapped to Sanity assets`)
if (missing.length) {
  console.error(`No Sanity asset for:\n  ${missing.join('\n  ')}`)
  process.exit(1)
}
