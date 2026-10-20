// Titles, meta descriptions and H1s from the SEO review (2026-10-17), from
// migration/content-data/titles-meta.json (README.md section 10 there).
//
// Each row names a page, the field Google reads (title, meta or h1), the document and the
// field that sets it (seo.title, seo.description, a service's heading, a post's title),
// the value Google shows today (old) and the approved value (new). A title or meta written
// here is an explicit seo.* value, so a later edit to a hero lede, card text or name never
// moves it. Rows with `hold` are approved but held back (the wave 2 cities): checked, not set.
//
// The module stops when:
//   - a document or its field is missing, or `old` is not what the live page shows
//     (migration/seo-baseline.json);
//   - the field already holds something other than `old` (a stored value being replaced
//     must be the live one; a new override must find the field empty);
//   - a row and migration/seo-intentional-changes.json, the parity gate's allowlist,
//     disagree in either direction (a value, a missing row, a held row the allowlist
//     doesn't hold back), so the site and the gate can't drift apart;
//   - a row would change the title or H1 of a Tier 1 page.
//
// Rows with `added` are pages new to the site (migration/content-data/new-services.json): their
// old value is null, the path must not be live in the baseline, and the allowlist holds the value
// under `added` (with a title, meta and H1 for every added page) instead of `changes`.
//
// Runs last, after the copy edits (whose guard forbids exactly these fields).

const DATA = 'migration/content-data/titles-meta.json'
const ALLOWLIST = 'migration/seo-intentional-changes.json'
const LIVE = {title: (page) => page.title, meta: (page) => page.metaDescription, h1: (page) => page.h1?.[0]}
// where each kind of document keeps each field (also what the templates read)
const SETS = {
  location: {title: 'seo.title', meta: 'seo.description'},
  service: {title: 'seo.title', meta: 'seo.description', h1: 'heading'},
  post: {title: 'seo.title', meta: 'seo.description', h1: 'title'},
  page: {meta: 'seo.description'},
  serviceCategory: {title: 'seo.title', meta: 'seo.description'},
}
const norm = (s) => (s ?? '').replace(/\s+/g, ' ').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim()

export default async function titlesMeta(ctx) {
  const {docs, readJson, live, report} = ctx
  const [{changes}, allowlist] = await Promise.all([readJson(DATA), readJson(ALLOWLIST)])
  const fail = (row, msg) => {
    throw new Error(`${DATA} ${row.path} ${row.field}: ${msg}`)
  }
  const frozen = new Set(allowlist.frozenTitleAndH1 ?? [])
  const held = allowlist.notDeployed ?? {}

  const seen = new Set()
  const applied = []
  for (const row of changes) {
    const key = `${row.path} ${row.field}`
    if (seen.has(key)) fail(row, 'listed twice')
    seen.add(key)
    const [type, slug] = row.doc.split(':')
    const doc = docs.find((d) => d._type === type && d.slug?.current === slug) ?? fail(row, `no ${type} "${slug}"`)
    if (SETS[type]?.[row.field] !== row.sets) fail(row, `a ${type}'s ${row.field} is set by ${SETS[type]?.[row.field] ?? 'nothing'}, not ${row.sets}`)
    if (row.field !== 'meta' && frozen.has(row.path)) fail(row, 'the title and H1 of a Tier 1 page never change')
    if (row.added) {
      // a page new to the site (new-services.json): nothing live to replace, and the allowlist's `added` holds it
      if (live(row.path)) fail(row, 'marked added, but it is a live page in migration/seo-baseline.json')
      if (row.old !== null) fail(row, 'a new page has no old value (null)')
      if (row.hold) fail(row, 'a new page ships with its title, meta and H1')
    } else {
      const page = live(row.path) ?? fail(row, 'not a live page in migration/seo-baseline.json')
      if (norm(LIVE[row.field](page)) !== norm(row.old)) fail(row, `old is not the live value "${LIVE[row.field](page)}"`)
    }

    const approved = (row.added ? allowlist.added : allowlist.changes)?.[row.path]?.[row.field]
    if (approved !== row.new) fail(row, `new differs from ${ALLOWLIST} ${row.added ? 'added' : 'changes'} ("${approved ?? 'nothing approved'}")`)
    if (Boolean(row.hold) !== Boolean(held[row.path])) fail(row, row.hold ? `held back here but not in ${ALLOWLIST} notDeployed` : `held back in ${ALLOWLIST} notDeployed but not here`)
    if (row.hold) continue

    const [head, leaf] = row.sets.split('.')
    const holder = leaf ? (doc[head] ??= {_type: 'seo'}) : doc
    const field = leaf ?? head
    if (holder[field] !== undefined && norm(holder[field]) !== norm(row.old)) fail(row, `${row.sets} holds "${holder[field]}", not the live value`)
    holder[field] = row.new
    applied.push(key)
  }
  for (const [path, fields] of [...Object.entries(allowlist.changes ?? {}), ...Object.entries(allowlist.added ?? {})]) {
    for (const field of Object.keys(fields).filter((f) => LIVE[f])) if (!seen.has(`${path} ${field}`)) throw new Error(`${ALLOWLIST}: ${path} ${field} is approved but ${DATA} has no row for it`)
  }
  for (const [path, fields] of Object.entries(allowlist.added ?? {})) {
    for (const field of Object.keys(LIVE)) if (fields[field] === undefined) throw new Error(`${ALLOWLIST}: added page ${path} needs an approved ${field}`)
    if (allowlist.changes?.[path]) throw new Error(`${ALLOWLIST}: ${path} is both added and changed`)
  }

  report.titlesMeta = {source: DATA, applied: applied.length, added: changes.filter((r) => r.added).length, held: changes.filter((r) => r.hold).map((r) => `${r.path} ${r.field}`)}
}
