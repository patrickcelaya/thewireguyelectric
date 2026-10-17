#!/usr/bin/env node
// Content dates: the `updatedAt` of pages, services, cities, service categories and posts,
// which the sitemap's <lastmod>, a post's dateModified / article:modified_time and its
// visible "Updated" line read. It moves only on a material change (docs/CONTENT_MODEL.md,
// docs/SEO_STRATEGY.md "honest updatedAt"); a light touch keeps the old date.
//
// Material means, against the content the document's current date describes:
//   - at least 5% of its words replaced: the word counts that differ, summed, halved, over
//     the baseline's word count (a word swapped for another counts once, not twice);
//   - or a heading changed (an h2–h4 block, or a section heading);
//   - or its FAQs changed.
// Titles, H1s, names, slugs, SEO fields, links and image alts are not content here.
//
// The baseline is migration/sanity-import/content-dates.json, {<_id>: {updatedAt?, words,
// heads, faqs}}, the content each document had when it was last dated. Each run compares
// with it, not with the previous run, so small edits add up until they are material; only
// a material change resets it. A post that has never changed materially has no updatedAt
// (its publish date stands). Never seed dates from Webflow's "Updated On" or the live
// sitemap: those are bulk-publish timestamps.
//
//   node scripts/migrate/content-dates.mjs --seed <dataset.ndjson>
//
// writes the baseline from a dataset (the one imported to Sanity), keeping its dates;
// webflow-to-sanity.mjs calls stampContentDates() on every run.

import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'

export const DATED_TYPES = new Set(['page', 'service', 'location', 'serviceCategory', 'post'])
export const BASELINE_PATH = 'migration/sanity-import/content-dates.json'
const SHARE = 0.05

// Keys that hold no visible content: identity, SEO, links, images, layout choices.
const SKIP = new Set([
  '_id', '_type', '_key', '_ref', '_rev', '_weak', '_createdAt', '_updatedAt', '_sanityAsset',
  'slug', 'seo', 'updatedAt', 'publishedAt', 'webflowId', 'href', 'url', 'asset', 'alt', 'crop', 'hotspot',
  'markDefs', 'marks', 'style', 'listItem', 'level', 'icon', 'layout', 'variant', 'tone',
])
// What names the document rather than being its content (the title, H1, card name).
const IDENTITY = new Set(['title', 'heading', 'name', 'cityNameForSeo'])
const WORD = /[\p{L}\p{N}][\p{L}\p{N}'-]*/gu

const blockText = (b) => (b.children ?? []).map((c) => c.text ?? '').join('')
const words = (text) => (text.toLowerCase().replace(/[‘’]/g, "'").match(WORD) ?? [])

/** The content of a document that its date describes: word counts, headings and an FAQ fingerprint. */
export function contentOf(doc) {
  const counts = new Map()
  const heads = []
  const add = (text) => words(text).forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1))
  const walk = (node, key, depth) => {
    if (typeof node === 'string') {
      // a section's heading (the document's own heading, its H1, is identity)
      if (key === 'heading') heads.push(node.trim())
      add(node)
    } else if (Array.isArray(node)) {
      node.forEach((n) => walk(n, key, depth + 1))
    } else if (node && typeof node === 'object') {
      if (node._type === 'block') {
        const text = blockText(node)
        if (/^h[2-4]$/.test(node.style ?? '')) heads.push(text.trim())
        return add(text)
      }
      for (const [k, v] of Object.entries(node)) {
        if (SKIP.has(k) || (depth === 0 && (IDENTITY.has(k) || k === 'faqs'))) continue
        walk(v, k, depth + 1)
      }
    }
  }
  walk(doc, '', 0)
  const faqs = (doc.faqs ?? []).map((f) => [f.question ?? f._ref ?? '', (Array.isArray(f.answer) ? f.answer.map(blockText) : [])].flat().join('\n'))
  return {
    words: [...counts].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([w, n]) => `${w}:${n}`).join(' '),
    heads,
    faqs: faqs.length ? createHash('sha1').update(faqs.join('\n\n')).digest('hex') : '',
  }
}

const parseWords = (s) => new Map((s ? s.split(' ') : []).map((pair) => [pair.slice(0, pair.lastIndexOf(':')), Number(pair.slice(pair.lastIndexOf(':') + 1))]))

/** The share of the baseline's words that were replaced. */
export function replacedShare(before, after) {
  const a = parseWords(before)
  const b = parseWords(after)
  let total = 0
  let diff = 0
  for (const [w, n] of a) {
    total += n
    diff += Math.abs(n - (b.get(w) ?? 0))
  }
  for (const [w, n] of b) if (!a.has(w)) diff += n
  return total ? diff / 2 / total : diff ? 1 : 0
}

/**
 * The date a material change gets: today in Arizona (the business's day; Arizona keeps no
 * daylight saving time), at noon there, so the date reads the same in UTC (sitemap, schema)
 * and on the page (shown in Arizona time). CONTENT_DATE=YYYY-MM-DD pins the day.
 */
export function contentDate(env = process.env, now = new Date()) {
  const day = env.CONTENT_DATE ?? new Date(now.getTime() - 7 * 3600e3).toISOString().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`CONTENT_DATE "${day}" is not YYYY-MM-DD`)
  return `${day}T19:00:00Z`
}

/**
 * Sets updatedAt on every dated document from the baseline, and returns the next baseline and
 * what changed. A document the baseline doesn't know is new: dated today (a post: by its
 * publish date, so no updatedAt).
 */
export function stampContentDates(docs, baseline, today = contentDate()) {
  const next = {}
  const dated = []
  for (const doc of docs.filter((d) => DATED_TYPES.has(d._type))) {
    const now = contentOf(doc)
    const before = baseline[doc._id]
    let updatedAt
    if (!before) {
      updatedAt = doc._type === 'post' ? undefined : today
      next[doc._id] = {...(updatedAt ? {updatedAt} : {}), ...now}
    } else {
      const share = replacedShare(before.words, now.words)
      const material = share >= SHARE || JSON.stringify(before.heads) !== JSON.stringify(now.heads) || before.faqs !== now.faqs
      if (material) {
        updatedAt = today
        next[doc._id] = {updatedAt, ...now}
        if (before.updatedAt !== today) dated.push({id: doc._id, type: doc._type, slug: doc.slug?.current, share: Math.round(share * 1000) / 10})
      } else {
        updatedAt = before.updatedAt
        next[doc._id] = before
      }
    }
    delete doc.updatedAt
    if (updatedAt) doc.updatedAt = updatedAt
  }
  return {baseline: next, dated}
}

// CLI: seed the baseline from a dataset, keeping each document's date.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const at = process.argv.indexOf('--seed')
  const file = at > 0 ? process.argv[at + 1] : undefined
  if (!file) {
    console.error('usage: node scripts/migrate/content-dates.mjs --seed <dataset.ndjson>')
    process.exit(2)
  }
  const docs = (await readFile(file, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l))
  const baseline = Object.fromEntries(
    docs
      .filter((d) => DATED_TYPES.has(d._type))
      .sort((a, b) => (a._id < b._id ? -1 : 1))
      .map((d) => [d._id, {...(d.updatedAt ? {updatedAt: d.updatedAt} : {}), ...contentOf(d)}]),
  )
  const out = new URL(`../../${BASELINE_PATH}`, import.meta.url)
  await writeFile(out, JSON.stringify(baseline, null, 1) + '\n')
  console.log(`content dates: baseline of ${Object.keys(baseline).length} documents from ${file}`)
}
