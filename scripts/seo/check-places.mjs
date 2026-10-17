#!/usr/bin/env node
// Checks that every city the site serves is named in structured data with its
// Wikipedia and Wikidata pages (web/src/data/places.json, read by web/src/lib/places.ts),
// and that those entries agree with the sourced local facts.
//
//   node scripts/seo/check-places.mjs [--home web/.vercel/output/static/index.html]
//
// The served cities are read from a build's homepage (the business's areaServed:
// #area-<slug>), else from the local dataset (Site settings → service areas, plus Mesa).
// Fails (exit 1) when a served city has no entry in places.json, or when an entry's
// GNIS id differs from migration/local-facts (compared only where both have one:
// Ahwatukee has no GNIS id on Wikidata).

import {existsSync} from 'node:fs'
import {readFile} from 'node:fs/promises'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const home = args.home ?? 'web/.vercel/output/static/index.html'
const json = async (file) => JSON.parse(await readFile(file, 'utf8'))

const places = await json('web/src/data/places.json')
const facts = {...(await json('migration/local-facts/locations.json')).locations, mesa: (await json('migration/local-facts/mesa.json')).mesa}

async function servedSlugs() {
  if (existsSync(home)) {
    const html = await readFile(home, 'utf8')
    const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '{}')
    const business = (ld['@graph'] ?? []).find((n) => String(n['@id']).endsWith('/#business'))
    const slugs = [].concat(business?.areaServed ?? []).map((a) => String(a['@id'] ?? '').match(/#area-(.+)$/)?.[1]).filter(Boolean)
    if (slugs.length) return {from: home, slugs}
  }
  const docs = (await readFile('migration/sanity-import/production.ndjson', 'utf8')).trim().split('\n').map((l) => JSON.parse(l))
  const byId = new Map(docs.map((d) => [d._id, d]))
  const settings = byId.get('siteSettings')
  const slugs = (settings?.serviceAreas ?? []).map((r) => byId.get(r._ref)?.slug?.current).filter(Boolean)
  return {from: 'migration/sanity-import/production.ndjson', slugs: ['mesa', ...slugs.filter((s) => s !== 'mesa')]}
}

const {from, slugs} = await servedSlugs()
const problems = []
if (!slugs.includes('mesa')) problems.push('Mesa (the home city) is not among the served cities')
for (const slug of slugs) {
  const entry = places.cities[slug]
  if (!entry) {
    problems.push(`${slug}: no entry in web/src/data/places.json (add its Wikidata id and Wikipedia article, checked both ways)`)
    continue
  }
  if (!/^Q\d+$/.test(entry.wikidata ?? '') || !/^https:\/\/en\.wikipedia\.org\/wiki\/./.test(entry.wikipedia ?? '')) problems.push(`${slug}: malformed wikidata or wikipedia`)
  const gnis = facts[slug]?.geo?.gnisFeatureId
  if (entry.gnis !== undefined && gnis !== undefined && entry.gnis !== gnis) problems.push(`${slug}: GNIS ${entry.gnis} in places.json, ${gnis} in migration/local-facts`)
  if (entry.within && !places.cities[entry.within]) problems.push(`${slug}: lies within "${entry.within}", which has no entry`)
}

for (const p of problems) console.log(`  ${p}`)
console.log(`${slugs.length} served cities (from ${from}): ${problems.length ? `${problems.length} problems` : 'all named with Wikipedia and Wikidata'}`)
process.exit(problems.length ? 1 : 0)
