#!/usr/bin/env node
// Compares a crawl of the new site against the live-site baseline and fails on
// anything that could cost rankings.
//
//   node scripts/seo/parity.mjs --baseline migration/seo-baseline.json --candidate migration/seo-candidate.json [--allow-noindex] [--allow file] [--out report.json]
//
// ERRORS (exit 1): an indexable URL that no longer returns 200 or a 301 to a
// sensible page; a changed <title>, meta description or H1 (unless it changed to
// the value approved in migration/seo-intentional-changes.json); an approved
// change that is missing, or that shipped before its planned date; a missing or
// wrong canonical; noindex on a page that's indexable today; lost JSON-LD types
// that weren't deliberately removed.
// WARNINGS: big word-count drops, fewer internal links, more images without alt,
// approved changes held back on purpose (notDeployed).

import {readFile, writeFile} from 'node:fs/promises'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') || all[i + 1] === undefined ? true : all[i + 1]]] : acc), []),
)
const baseline = JSON.parse(await readFile(args.baseline ?? 'migration/seo-baseline.json', 'utf8'))
const candidate = JSON.parse(await readFile(args.candidate ?? 'migration/seo-candidate.json', 'utf8'))
const SITE = 'https://www.thewireguyelectric.com'
const allowNoindex = Boolean(args['allow-noindex'])

// Approved title / meta description / H1 changes. Each entry is the exact new value (compared after
// norm()), so the page may change only to that value: any other difference is still an error.
//   {"changes": {"/locations/gilbert": {"title": "...", "meta": "...", "h1": "..."}}}
const ALLOW_FILE = args.allow ?? 'migration/seo-intentional-changes.json'
const allowFile = await readFile(ALLOW_FILE, 'utf8').then((t) => JSON.parse(t), (e) => {
  if (e.code === 'ENOENT' && !args.allow) return {}
  throw e
})
const allow = allowFile.changes ?? {}
// Tier 1 pages (most of today's clicks): their title and H1 can never be approved for a change.
const FROZEN = new Set(allowFile.frozenTitleAndH1 ?? [])
// Approved changes held back on purpose ({path: when and why}, e.g. the wave 2 city titles): pending until
// then, and an error if one ships early. Every other approved change must be live.
const NOT_DEPLOYED = allowFile.notDeployed ?? {}
const FIELDS = {title: 'title', meta: 'description', h1: 'h1'}

// Schema types removed on purpose (see docs/SEO_STRATEGY.md).
const INTENTIONALLY_REMOVED_TYPES = new Set(['AggregateRating'])
// Old URLs that are meant to stop existing (they 404 on purpose).
const INTENTIONALLY_GONE = new Set(['/checkout', '/paypal-checkout', '/order-confirmation', '/search', '/401', '/templates/style-guide', '/templates/coming-soon'])

const norm = (s) => (s ?? '').replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim()
const canonicalFor = (path) => (path === '/' ? `${SITE}/` : `${SITE}${path}`)

const rows = []
const add = (level, path, check, detail) => rows.push({level, path, check, detail})

for (const [path, before] of Object.entries(baseline.pages)) {
  const after = candidate.pages[path]
  const wasIndexable = before.status === 200 && !/noindex/i.test(before.metaRobots ?? '')

  if (before.status !== 200) {
    if (after?.redirectChain?.length) {
      // A new redirect must land on a live page in one hop.
      if (after.status !== 200) add('error', path, 'redirect-target', `redirects to ${after.finalUrl}, which returns ${after.status}`)
      else if (after.redirectChain.length > 1) add('error', path, 'redirect-chain', after.redirectChain.map((h) => `${h.status} ${h.from} -> ${h.to}`).join(' | '))
      else add('info', path, 'status', `was ${before.status}, now redirects to ${new URL(after.finalUrl).pathname}`)
    } else if (after?.status === 200) add('info', path, 'status', `was ${before.status}, now 200`)
    continue
  }
  if (!after) {
    add('error', path, 'missing', 'not crawled on the new site')
    continue
  }
  if (after.redirectChain?.length) {
    const hops = after.redirectChain.length
    const target = new URL(after.finalUrl).pathname
    if (INTENTIONALLY_GONE.has(path)) add('info', path, 'status', `redirects to ${target}`)
    else if (wasIndexable) add('error', path, 'status', `indexable page now redirects (${hops} hop) to ${target}`)
    else add('info', path, 'status', `non-indexable page now redirects to ${target}`)
    if (hops > 1) add('error', path, 'redirect-chain', after.redirectChain.map((h) => `${h.status} ${h.from} -> ${h.to}`).join(' | '))
    continue
  }
  if (after.status !== 200) {
    if (INTENTIONALLY_GONE.has(path) && [404, 410].includes(after.status)) add('info', path, 'status', `intentionally ${after.status}`)
    else add(wasIndexable ? 'error' : 'warn', path, 'status', `was 200, now ${after.status}`)
    continue
  }
  if (!wasIndexable) continue

  const approved = allow[path] ?? {}
  const compare = (field, was, now, levelIfChanged) => {
    const check = FIELDS[field]
    if (approved[field] !== undefined) {
      const held = NOT_DEPLOYED[path]
      if (norm(now) === norm(approved[field])) {
        if (held) add('error', path, `${check}-early`, `approved for later (${held}), but already live: "${now ?? ''}"`)
        else add('info', path, check, `approved change: "${was ?? ''}" -> "${now ?? ''}"`)
      } else if (norm(now) === norm(was)) {
        if (held) add('warn', path, `${check}-pending`, `approved change not deployed yet (${held}): still "${was ?? ''}"`)
        else add('error', path, `${check}-not-deployed`, `approved change missing: still "${was ?? ''}" (approved "${approved[field]}")`)
      } else add('error', path, check, `changed, but not to the approved value: "${now ?? ''}" (approved "${approved[field]}")`)
      return
    }
    if (norm(was) !== norm(now)) add(levelIfChanged, path, check, `"${was ?? ''}" -> "${now ?? ''}"`)
  }
  compare('title', before.title, after.title, 'error')
  compare('meta', before.metaDescription, after.metaDescription, before.metaDescription ? 'error' : 'info')
  compare('h1', before.h1?.[0], after.h1?.[0], 'error')
  if ((after.h1?.length ?? 0) !== 1) add('warn', path, 'h1-count', `${after.h1?.length ?? 0} H1s`)
  if (after.canonical !== canonicalFor(path)) add('error', path, 'canonical', `expected ${canonicalFor(path)}, got ${after.canonical ?? 'none'}`)
  if (/noindex/i.test(after.metaRobots ?? '') || /noindex/i.test(after.xRobotsTag ?? '')) add(allowNoindex ? 'info' : 'error', path, 'robots', `noindex on an indexable page (${after.metaRobots ?? after.xRobotsTag})`)

  const lost = (before.jsonLdTypes ?? []).filter((t) => !after.jsonLdTypes?.includes(t) && !INTENTIONALLY_REMOVED_TYPES.has(t))
  if (lost.length) add('error', path, 'schema', `lost JSON-LD types: ${lost.join(', ')}`)
  const gained = (after.jsonLdTypes ?? []).filter((t) => !before.jsonLdTypes?.includes(t))
  if (gained.length) add('info', path, 'schema', `new JSON-LD types: ${gained.join(', ')}`)

  if (before.wordCount > 150 && after.wordCount < before.wordCount * 0.8)
    add('warn', path, 'content', `word count ${before.wordCount} -> ${after.wordCount} (${Math.round((after.wordCount / before.wordCount - 1) * 100)}%)`)
  const linksBefore = before.internalLinks?.length ?? 0
  const linksAfter = after.internalLinks?.length ?? 0
  if (linksAfter < linksBefore * 0.8) add('warn', path, 'internal-links', `${linksBefore} -> ${linksAfter}`)
  const brokenTargets = (after.internalLinks ?? []).filter((l) => candidate.pages[l] && candidate.pages[l].status >= 400)
  if (brokenTargets.length) add('error', path, 'broken-links', brokenTargets.join(', '))
}

// An approval for a URL the baseline does not hold as an indexable 200 is stale or mistyped.
for (const [path, fields] of Object.entries(allow)) {
  const b = baseline.pages[path]
  if (!b || b.status !== 200 || /noindex/i.test(b.metaRobots ?? '')) add('error', path, 'allowlist', `approved ${Object.keys(fields).join(', ')} for a URL that is not an indexable page in the baseline`)
  for (const f of Object.keys(fields)) if (!FIELDS[f]) add('error', path, 'allowlist', `unknown field "${f}" (use title, meta or h1)`)
  for (const f of ['title', 'h1']) if (fields[f] !== undefined && FROZEN.has(path)) add('error', path, 'allowlist', `${f} of a Tier 1 page is frozen and cannot be approved`)
}
for (const path of Object.keys(NOT_DEPLOYED)) if (!allow[path]) add('error', path, 'allowlist', 'held back in notDeployed, but no change is approved for it')

// New URLs (not on the live site) are fine but worth listing.
for (const path of Object.keys(candidate.pages)) {
  if (!baseline.pages[path] && candidate.pages[path].status === 200) add('info', path, 'new-url', 'not on the live site')
}

const summary = rows.reduce((acc, r) => ((acc[r.level] = (acc[r.level] ?? 0) + 1), acc), {})
const byCheck = rows.filter((r) => r.level !== 'info').reduce((acc, r) => ((acc[`${r.level}:${r.check}`] = (acc[`${r.level}:${r.check}`] ?? 0) + 1), acc), {})

if (args.out) await writeFile(args.out, JSON.stringify({summary, byCheck, rows}, null, 2))
for (const level of ['error', 'warn']) {
  const list = rows.filter((r) => r.level === level)
  if (!list.length) continue
  console.log(`\n${level.toUpperCase()}S (${list.length})`)
  for (const r of list) console.log(`  ${r.path}  [${r.check}]  ${r.detail}`)
}
console.log('\nSummary:', JSON.stringify(summary), '\nBy check:', JSON.stringify(byCheck))
process.exit(summary.error ? 1 : 0)
