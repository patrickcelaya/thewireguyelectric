#!/usr/bin/env node
// Maps every Webflow image URL the migration meets to the Sanity asset the import made
// from it, so neither the site nor the dataset depends on Webflow's CDN.
//
//   node scripts/migrate/legacy-image-map.mjs
//
// The converter stores an image it reads from the Webflow export as
// `_sanityAsset: "image@<webflow url>"`. The Sanity import uploaded each of them and kept
// the file name as the asset's `originalFilename`, so the URL's last path segment finds
// the asset. This script reads the public production dataset (read-only, no token) and
// writes:
//
//   web/src/data/legacy-images.json          {<webflow url>: {asset, width, height}}
//   migration/sanity-import/legacy-assets.json  {<asset id>: <its sanity.imageAsset document>}
//
// webflow-to-sanity.mjs uses both to turn every image@<webflow url> into a reference to
// that asset and to add the asset's document to the NDJSON, so the dataset can be imported
// again (into a fresh dataset, after Webflow is cancelled) without downloading anything
// from Webflow. web/src/lib/image.ts reads the first file for any image still stored as a
// URL. The script fails if a URL has no Sanity asset: nothing is ever served from Webflow.
//
// The URLs come from the map itself and from the dataset (any image@ value still in it).
// Re-run it after a dataset import that adds images.

import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DATASET = path.join(ROOT, 'migration/sanity-import/production.ndjson')
const OUT = path.join(ROOT, 'web/src/data/legacy-images.json')
const ASSETS_OUT = path.join(ROOT, 'migration/sanity-import/legacy-assets.json')
const PROJECT_ID = 'qhi2uf0l'
const DATASET_NAME = 'production'

const text = await readFile(DATASET, 'utf8')
const known = JSON.parse(await readFile(OUT, 'utf8').catch(() => '{}'))
const urls = [...new Set([...Object.keys(known), ...[...text.matchAll(/"image@(https?:\/\/[^"]+)"/g)].map((m) => m[1])])].sort()

const query = async (groq) => {
  const res = await fetch(`https://${PROJECT_ID}.apicdn.sanity.io/v2026-10-01/data/query/${DATASET_NAME}?query=${encodeURIComponent(groq)}&perspective=published`)
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`)
  return (await res.json()).result
}
const assets = await query('*[_type == "sanity.imageAsset"]{_id, originalFilename, "width": metadata.dimensions.width, "height": metadata.dimensions.height}')

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

// The asset documents, as the dataset import expects them (no revision fields).
const ids = [...new Set(Object.values(out).map((a) => a.asset))].sort()
const docs = await query(`*[_type == "sanity.imageAsset" && _id in ${JSON.stringify(ids)}]`)
const assetDocs = Object.fromEntries(
  docs
    .map(({_rev, _updatedAt, ...doc}) => doc)
    .sort((a, b) => (a._id < b._id ? -1 : 1))
    .map((doc) => [doc._id, doc]),
)
if (Object.keys(assetDocs).length !== ids.length) missing.push(...ids.filter((id) => !assetDocs[id]).map((id) => `asset document ${id}`))

await writeFile(OUT, JSON.stringify(out, null, 2) + '\n')
await writeFile(ASSETS_OUT, JSON.stringify(assetDocs, null, 1) + '\n')
console.log(`legacy images: ${urls.length} URLs, ${Object.keys(out).length} mapped to ${ids.length} Sanity assets`)
if (missing.length) {
  console.error(`No Sanity asset for:\n  ${missing.join('\n  ')}`)
  process.exit(1)
}
