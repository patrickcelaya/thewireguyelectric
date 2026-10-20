#!/usr/bin/env node
// Checks the structured data and share tags of every page in a build, so a content or
// template change can't quietly bring back a defect the SEO review removed.
//
//   node scripts/seo/check-structured-data.mjs [--dir web/.vercel/output/static] [--cards web/node_modules/.cache/og-cards/specs] [--out report.json]
//
// Fails (exit 1) when a page breaks any of these:
//   parse        every JSON-LD block parses, and the page has exactly one, a single @graph
//   required     each top-level node has the properties its type needs (Google's required
//                fields for BlogPosting, JobPosting, FAQPage, BreadcrumbList; the business's NAP)
//   refs         every {"@id": …}-only reference resolves to a node in the same graph, or to an
//                entity another page defines (/services/*#service, /blog-posts/*#article,
//                /our-team#*, /locations/*#business|#service, /blog#blog)
//   images       og:image, and the image of the page's Service, BlogPosting and primary image, is a
//                photo the page shows (an <img>/<source>/background on it) or the default share image.
//                og:image is the page's share card (/og/….jpg, src/config/og-cards.mjs): the photo in the
//                card is what has to be shown (the card specs the build leaves, --cards)
//   og           og:image carries its 1200×630 size, and a share card's file is in the build
//   prices       service pages show no price (no "$<digit>" in their text or markup, no offers)
//   alt          no alt text is Webflow's "__wf_reserved_inherit" placeholder
//   sameAs       no sameAs is a link shortener (share.google, goo.gl, bit.ly)
//   areaServed   the business serves Mesa (its home city) first, and every served city is named
//                with its Wikipedia/Wikidata pages
//   faqOnce      no FAQ question is marked up on two indexable pages (Google: mark up one instance
//                of a Q&A shown on several pages; shared questions are marked up on /faq only).
//                On a build where every page is noindex (a preview), every page counts
//
// The default share image is the one /estimate (a page with no image of its own) uses: the photo in its card.

import {access, readFile, readdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import * as cheerio from 'cheerio'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const dir = path.resolve(args.dir ?? 'web/.vercel/output/static')
const cardsDir = path.resolve(args.cards ?? 'web/node_modules/.cache/og-cards/specs')
const SITE = 'https://www.thewireguyelectric.com'

async function htmlFiles(d) {
  const out = []
  for (const entry of await readdir(d, {withFileTypes: true})) {
    const full = path.join(d, entry.name)
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)))
    else if (entry.name.endsWith('.html')) out.push(full)
  }
  return out
}

/** "/services/panels" for services/panels/index.html, "/" for index.html. */
const pagePath = (file) => {
  const rel = path.relative(dir, file).split(path.sep).join('/')
  return rel === 'index.html' ? '/' : `/${rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`
}

/** A Sanity CDN image's asset key (<hash>-<w>x<h>), or the URL itself for any other image. */
const assetKey = (url) => url.match(/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([0-9a-f]+-\d+x\d+)\./)?.[1] ?? url.split('?')[0]

const SHORTENER = /^https?:\/\/(?:[^/]*\.)?(?:share\.google|goo\.gl|bit\.ly)(?:\/|$)/i
const CROSS_PAGE = [/\/services\/[^/#]+#service$/, /\/blog-posts\/[^/#]+#article$/, /\/our-team#.+$/, /\/locations\/[^/#]+#(?:business|service)$/, /\/blog#blog$/]
const has = (node, key) => node[key] !== undefined && node[key] !== null && node[key] !== '' && !(Array.isArray(node[key]) && !node[key].length)
const types = (node) => (Array.isArray(node['@type']) ? node['@type'] : [node['@type']]).filter(Boolean)
const PAGE_TYPES = new Set(['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage', 'FAQPage', 'ItemPage'])

/** The properties each top-level node needs, by type. */
function requiredFor(node) {
  const t = types(node)
  const id = node['@id'] ?? ''
  if (t.includes('Electrician')) return ['name', 'url', 'telephone', 'address', ...(id === `${SITE}/#business` ? ['areaServed', 'logo'] : [])]
  if (t.includes('WebSite')) return ['name', 'url', 'publisher']
  if (t.includes('BlogPosting')) return ['headline', 'datePublished', 'dateModified', 'image', 'author', 'publisher', 'mainEntityOfPage']
  if (t.includes('JobPosting')) return ['title', 'description', 'datePosted', 'hiringOrganization', 'jobLocation', 'identifier']
  if (t.includes('FAQPage') && !id.endsWith('#webpage')) return ['mainEntity']
  if (t.includes('BreadcrumbList')) return ['itemListElement']
  if (t.includes('Service')) return ['name', 'provider', 'areaServed', 'url']
  if (t.includes('Blog')) return ['name', 'url', 'publisher']
  if (t.includes('Person')) return ['name']
  if (t.includes('State')) return ['name', 'sameAs']
  if (t.some((x) => PAGE_TYPES.has(x))) return ['name', 'url', 'isPartOf']
  return []
}

const rows = []
const fail = (page, check, detail) => rows.push({page, check, detail})

const files = (await htmlFiles(dir)).sort()
const pages = new Map()
for (const file of files) pages.set(pagePath(file), cheerio.load(await readFile(file, 'utf8')))
// the share cards: /og/….jpg → the photo in it, as an asset key (none for the typographic card)
const cards = new Map()
for (const f of await readdir(cardsDir).catch(() => [])) {
  const spec = JSON.parse(await readFile(path.join(cardsDir, f), 'utf8'))
  cards.set(`${SITE}${spec.file}`, spec.photo ? spec.photo.ref.replace(/^image-/, '').replace(/-[a-z0-9]+$/, '') : null)
}
/** The image a share image shows: a card's photo (null for the typographic card), else the URL's own asset. */
const shareImage = (url) => (cards.has(url) ? cards.get(url) : url)
const estimateOg = pages.get('/estimate')?.('meta[property="og:image"]').attr('content')
const defaultOg = estimateOg && shareImage(estimateOg)
if (!estimateOg) fail('/estimate', 'images', 'no og:image on /estimate to take the default share image from')

/** Each page's top-level nodes, for the checks across pages. */
const graphsOf = new Map()
for (const [page, $] of pages) {
  // ---- parse: exactly one JSON-LD block, a single @graph
  const blocks = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).contents().text())
    .get()
  const graphs = []
  for (const raw of blocks) {
    try {
      graphs.push(JSON.parse(raw))
    } catch (e) {
      fail(page, 'parse', `JSON-LD does not parse: ${e.message}`)
    }
  }
  if (blocks.length !== 1) fail(page, 'parse', `${blocks.length} JSON-LD blocks (expected one @graph)`)
  const nodes = graphs.flatMap((g) => (Array.isArray(g['@graph']) ? g['@graph'] : [g]))
  graphsOf.set(page, nodes)
  if (graphs.length && !graphs.every((g) => Array.isArray(g['@graph']))) fail(page, 'parse', 'a JSON-LD block is not an @graph')

  // every object in the graph, and the ids defined in it (an object with an @id and anything else)
  const all = []
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk)
    if (!v || typeof v !== 'object') return
    all.push(v)
    Object.values(v).forEach(walk)
  }
  nodes.forEach(walk)
  const defined = new Set(all.filter((o) => o['@id'] && Object.keys(o).length > 1).map((o) => o['@id']))

  // ---- required properties of each top-level node
  for (const node of nodes) {
    const missing = requiredFor(node).filter((k) => !has(node, k))
    if (missing.length) fail(page, 'required', `${types(node).join('/')} ${node['@id'] ?? ''} lacks ${missing.join(', ')}`)
    if (types(node).includes('FAQPage') && Array.isArray(node.mainEntity)) {
      const bad = node.mainEntity.filter((q) => !q.name || !q.acceptedAnswer?.text)
      if (bad.length) fail(page, 'required', `${bad.length} FAQ questions without a name or an answer`)
    }
    if (types(node).includes('BreadcrumbList') && Array.isArray(node.itemListElement)) {
      const bad = node.itemListElement.filter((li) => !li.name || !li.item || !li.position)
      if (bad.length) fail(page, 'required', `${bad.length} breadcrumb items without name, item or position`)
    }
  }

  // ---- references
  for (const o of all) {
    const keys = Object.keys(o)
    if (keys.length !== 1 || keys[0] !== '@id') continue
    const id = o['@id']
    if (!defined.has(id) && !CROSS_PAGE.some((re) => re.test(id))) fail(page, 'refs', `unresolved @id ${id}`)
  }

  // ---- images: shown on the page, or the default share image
  const shown = new Set()
  const addSrcset = (s) => (s ?? '').split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean).forEach((u) => shown.add(assetKey(u)))
  $('img').each((_, el) => {
    if ($(el).attr('src')) shown.add(assetKey($(el).attr('src')))
    addSrcset($(el).attr('srcset'))
  })
  $('source').each((_, el) => addSrcset($(el).attr('srcset')))
  $('[style*="url("]').each((_, el) => [...($(el).attr('style') ?? '').matchAll(/url\(([^)]+)\)/g)].forEach((m) => shown.add(assetKey(m[1].replace(/['"]/g, '')))))
  const isShown = (url) => shown.has(assetKey(url)) || (defaultOg && assetKey(url) === assetKey(defaultOg))
  const og = $('meta[property="og:image"]').attr('content')
  if (!og) fail(page, 'og', 'no og:image')
  else if (og.startsWith(`${SITE}/og/`)) {
    if (!cards.has(og)) fail(page, 'og', `og:image is a share card the build has no spec for: ${og}`)
    else if (cards.get(og) && !isShown(cards.get(og))) fail(page, 'images', `the share card's photo is not shown on the page: ${cards.get(og)}`)
    if (!(await access(path.join(dir, new URL(og).pathname)).then(() => true, () => false))) fail(page, 'og', `the share card is not in the build: ${new URL(og).pathname}`)
  } else if (!isShown(og)) fail(page, 'images', `og:image is not shown on the page: ${assetKey(og)}`)
  if (og && ($('meta[property="og:image:width"]').attr('content') !== '1200' || $('meta[property="og:image:height"]').attr('content') !== '630')) fail(page, 'og', 'og:image without its 1200×630 size')
  const imageUrls = (img) => (Array.isArray(img) ? img : [img]).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean)
  for (const node of nodes) {
    const t = types(node)
    const own = t.includes('Service') || t.includes('BlogPosting') ? imageUrls(node.image) : []
    const primary = imageUrls(node.primaryImageOfPage)
    for (const url of [...own, ...primary]) if (!url.startsWith(`${SITE}/`) && !isShown(url)) fail(page, 'images', `${t.join('/')} image is not shown on the page: ${assetKey(url)}`)
  }

  // ---- prices on service pages
  if (page.startsWith('/services/')) {
    if (all.some((o) => 'offers' in o)) fail(page, 'prices', 'JSON-LD has offers')
    const ld = blocks.join(' ')
    if (/\$\s?\d/.test(ld)) fail(page, 'prices', `JSON-LD states a price: ${ld.match(/.{0,60}\$\s?\d.{0,30}/)?.[0]}`)
    const $c = cheerio.load($.html())
    $c('script, style, template, noscript').remove()
    const text = $c('body').text().replace(/\s+/g, ' ')
    if (/\$\s?\d/.test(text)) fail(page, 'prices', `the page shows a price: …${text.match(/.{0,60}\$\s?\d.{0,30}/)?.[0]}…`)
  }

  // ---- alt placeholders
  $('img[alt^="__wf_"]').each((_, el) => fail(page, 'alt', `alt is a Webflow placeholder: ${$(el).attr('src')?.slice(0, 90)}`))

  // ---- sameAs
  for (const o of all) for (const u of [].concat(o.sameAs ?? [])) if (SHORTENER.test(u)) fail(page, 'sameAs', `sameAs is a link shortener: ${u}`)

  // ---- the business's area
  const business = nodes.find((n) => n['@id'] === `${SITE}/#business`)
  if (!business) fail(page, 'areaServed', 'no #business node')
  else {
    const area = [].concat(business.areaServed ?? [])
    if (area[0]?.name !== 'Mesa') fail(page, 'areaServed', `the business's areaServed does not start with Mesa (${area.map((a) => a.name).join(', ')})`)
    const unnamed = area.filter((a) => ![].concat(a.sameAs ?? []).some((u) => /wikidata\.org/.test(u)))
    if (unnamed.length) fail(page, 'areaServed', `served cities without Wikipedia/Wikidata: ${unnamed.map((a) => a.name).join(', ')}`)
  }
}

// ---- each FAQ question marked up on one indexable page
const indexable = (p) => !/noindex/i.test(pages.get(p)('meta[name="robots"]').attr('content') ?? '')
const counted = [...pages.keys()].some(indexable) ? [...pages.keys()].filter(indexable) : [...pages.keys()]
const markedUp = new Map()
for (const page of counted) {
  for (const n of graphsOf.get(page) ?? []) {
    if (!types(n).includes('FAQPage') || !Array.isArray(n.mainEntity)) continue
    for (const q of n.mainEntity) if (q.name) markedUp.set(q.name, [...(markedUp.get(q.name) ?? []), page])
  }
}
for (const [question, where] of markedUp) if (where.length > 1) fail(where[0], 'faqOnce', `"${question}" is marked up on ${where.length} pages: ${where.join(' ')}`)

const byCheck = rows.reduce((acc, r) => ((acc[r.check] = (acc[r.check] ?? 0) + 1), acc), {})
if (args.out) await writeFile(args.out, JSON.stringify({pages: pages.size, byCheck, rows}, null, 2))
for (const r of rows) console.log(`  ${r.page}  [${r.check}]  ${r.detail}`)
console.log(`\n${pages.size} pages checked; ${rows.length ? `${rows.length} failures: ${JSON.stringify(byCheck)}` : 'no failures'}`)
process.exit(rows.length ? 1 : 0)
