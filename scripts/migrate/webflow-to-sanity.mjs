#!/usr/bin/env node
// Converts the Webflow export into a Sanity NDJSON dataset.
//
//   node scripts/migrate/webflow-to-sanity.mjs
//
// Inputs (all committed under migration/):
//   webflow-cms/*.json        CMS items exported through the Webflow API
//   seo-baseline.json         live crawl: the exact titles/descriptions/H1s Google sees
//   live-snapshots/*.html     published HTML of the static pages
// Output:
//   sanity-import/production.ndjson  import with:
//     npx sanity dataset import migration/sanity-import/production.ndjson production --replace
//   sanity-import/id-map.json        stable document IDs across re-runs
//
// Images are emitted as `_sanityAsset: "image@<webflow url>"`, which the Sanity
// importer downloads and re-hosts, so nothing depends on Webflow's CDN afterwards.
// Before import, the site renders these URLs directly (local dataset mode).

import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {randomUUID} from 'node:crypto'
import {JSDOM} from 'jsdom'
import {Schema} from '@sanity/schema'
import {htmlToBlocks} from '@portabletext/block-tools'
import * as cheerio from 'cheerio'

const ROOT = new URL('../../', import.meta.url)
const p = (rel) => new URL(rel, ROOT)
const readJson = async (rel) => JSON.parse(await readFile(p(rel), 'utf8'))
const items = (data) => (Array.isArray(data) ? data : data.items)

// MIGRATE_OUT_DIR lets a trial run write somewhere else; IDs always come from the committed map.
const OUT_DIR = process.env.MIGRATE_OUT_DIR ? `${process.env.MIGRATE_OUT_DIR.replace(/\/$/, '')}/` : 'migration/sanity-import/'
const ID_MAP_PATH = 'migration/sanity-import/id-map.json'
const SITE = 'https://www.thewireguyelectric.com'

// ---------------------------------------------------------------------------
// Stable IDs: random UUIDs, persisted so re-running the import replaces the same docs.

const idMap = existsSync(p(ID_MAP_PATH)) ? await readJson(ID_MAP_PATH) : {}
const idFor = (key) => (idMap[key] ??= randomUUID())
const ref = (key) => ({_type: 'reference', _ref: idFor(key)})

// ---------------------------------------------------------------------------
// Live SEO baseline: keep every title, description and H1 exactly as indexed today.

const baseline = (await readJson('migration/seo-baseline.json')).pages
const live = (path) => {
  const page = baseline[path]
  return page?.status === 200 ? page : undefined
}

/** Store the live title/description as an SEO override only when the template wouldn't reproduce it. */
function seoFor(path, templateTitle, templateDescription) {
  const page = live(path)
  if (!page) return undefined
  const seo = {_type: 'seo'}
  if (page.title && page.title !== templateTitle) seo.title = page.title
  if (page.metaDescription && page.metaDescription !== templateDescription) seo.description = page.metaDescription
  if (/noindex/i.test(page.metaRobots ?? '')) seo.noIndex = true
  return Object.keys(seo).length > 1 ? seo : undefined
}

// ---------------------------------------------------------------------------
// HTML → Portable Text

const compiled = Schema.compile({
  name: 'import',
  types: [
    // "figure" is an image in the Studio schema; an object is enough for conversion.
    {name: 'figure', type: 'object', fields: [{name: 'alt', type: 'string'}, {name: 'caption', type: 'string'}]},
    {
      name: 'table',
      type: 'object',
      fields: [
        {name: 'caption', type: 'string'},
        {name: 'hasHeaderRow', type: 'boolean'},
        {name: 'rows', type: 'array', of: [{type: 'object', name: 'tableRow', fields: [{name: 'cells', type: 'array', of: [{type: 'string'}]}]}]},
      ],
    },
    {name: 'videoEmbed', type: 'object', fields: [{name: 'url', type: 'url'}, {name: 'title', type: 'string'}]},
    {
      name: 'holder',
      type: 'object',
      fields: [
        {
          name: 'body',
          type: 'array',
          of: [
            {
              type: 'block',
              styles: ['normal', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote'].map((value) => ({title: value, value})),
              lists: [{title: 'Bullet', value: 'bullet'}, {title: 'Numbered', value: 'number'}],
              marks: {
                decorators: ['strong', 'em', 'sup', 'sub', 'underline'].map((value) => ({title: value, value})),
                annotations: [{name: 'link', type: 'object', fields: [{name: 'href', type: 'string'}, {name: 'openInNewTab', type: 'boolean'}]}],
              },
            },
            {type: 'figure'},
            {type: 'table'},
            {type: 'videoEmbed'},
          ],
        },
      ],
    },
  ],
})
const blockContentType = compiled.get('holder').fields.find((f) => f.name === 'body').type

// Known-broken internal links on the live site, fixed at the source (redirects
// also exist, but a direct link avoids a hop). /estimate is a real page now (the
// Free Estimate page every estimate link goes to), so links to it are kept.
const LINK_FIXES = {
  '/locations/mesa': '/',
  '/services/electrical-panels': '/services/panels',
}

const report = {fixedLinks: [], droppedScripts: [], demotedH1: [], externalImages: []}

function normalizeHref(href, docPath) {
  if (!href) return href
  let out = href.trim()
  // Absolute links to this site (www or apex, http or https) become relative.
  out = out.replace(/^https?:\/\/(www\.)?thewireguyelectric\.com/i, '') || '/'
  if (out.startsWith('/')) {
    const [path, hash = ''] = out.split('#')
    let clean = path.length > 1 ? path.replace(/\/+$/, '') : path
    if (clean.startsWith('/blog/')) clean = clean.replace('/blog/', '/blog-posts/')
    if (LINK_FIXES[clean]) clean = LINK_FIXES[clean]
    const fixed = clean + (hash ? `#${hash}` : '')
    if (fixed !== href) report.fixedLinks.push({doc: docPath, from: href, to: fixed})
    return fixed
  }
  return out
}

// Owner rule: every "Free Estimate" link goes to the Free Estimate page. The live copy links "Get a free estimate",
// "request a free estimate", "free estimates" … to /contact-us; those become /estimate (the same phrase test as
// ctaHref in web/src/lib/site.ts, plural included). Other links to /contact-us ("Contact us") stay.
const ESTIMATE_TEXT = /\bfree\b(?:\s+\w+){0,3}?\s+estimates?\b/i
function estimateHref(href, text, docPath) {
  const words = (text ?? '').replace(/\s+/g, ' ').trim()
  if (!ESTIMATE_TEXT.test(words) || !/^\/contact-us(?:[#?]|$)/.test(href ?? '')) return href
  report.fixedLinks.push({doc: docPath, from: href, to: '/estimate', text: words})
  return '/estimate'
}

function youtubeUrl(src) {
  const id = src?.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/)?.[1]
  return id ? `https://www.youtube.com/watch?v=${id}` : src
}

function cleanHtml(html, docPath) {
  const dom = new JSDOM(`<body>${html}</body>`)
  const doc = dom.window.document
  doc.querySelectorAll('script').forEach((el) => {
    report.droppedScripts.push({doc: docPath, src: el.getAttribute('src')})
    el.remove()
  })
  // A second H1 inside the body competes with the page title; demote it.
  doc.querySelectorAll('h1').forEach((el) => {
    report.demotedH1.push({doc: docPath, text: el.textContent.trim()})
    const h2 = doc.createElement('h2')
    h2.innerHTML = el.innerHTML
    el.replaceWith(h2)
  })
  return doc.body.innerHTML.replace(/‍/g, '')
}

function toPortableText(html, docPath) {
  if (!html) return undefined
  let n = 0
  const keyGenerator = () => `k${(n++).toString(36).padStart(3, '0')}`
  const blocks = htmlToBlocks(cleanHtml(html, docPath), blockContentType, {
    parseHtml: (h) => new JSDOM(h).window.document,
    keyGenerator,
    rules: [
      {
        deserialize(el, next, block) {
          const tag = el.tagName?.toLowerCase()
          if (tag === 'figure') {
            const iframe = el.querySelector('iframe')
            if (iframe) return block({_type: 'videoEmbed', url: youtubeUrl(iframe.getAttribute('src'))})
            const img = el.querySelector('img')
            if (img?.getAttribute('src')) {
              const src = img.getAttribute('src')
              if (!/website-files\.com|webflow\.com/.test(src)) report.externalImages.push({doc: docPath, src})
              const caption = el.querySelector('figcaption')?.textContent.trim()
              return block({_type: 'figure', _sanityAsset: `image@${src}`, alt: img.getAttribute('alt') || undefined, caption: caption || undefined})
            }
            return undefined
          }
          if (tag === 'iframe') return block({_type: 'videoEmbed', url: youtubeUrl(el.getAttribute('src'))})
          if (tag === 'img' && el.getAttribute('src')) {
            const src = el.getAttribute('src')
            if (!/website-files\.com|webflow\.com/.test(src)) report.externalImages.push({doc: docPath, src})
            return block({_type: 'figure', _sanityAsset: `image@${src}`, alt: el.getAttribute('alt') || undefined})
          }
          if (tag === 'table') {
            const rows = [...el.querySelectorAll('tr')].map((tr) => ({
              _type: 'tableRow',
              _key: keyGenerator(),
              cells: [...tr.querySelectorAll('th, td')].map((c) => c.textContent.replace(/\s+/g, ' ').trim()),
            }))
            return block({_type: 'table', hasHeaderRow: Boolean(el.querySelector('thead, th')), rows})
          }
          if (tag === 'a') {
            const href = el.getAttribute('href')
            if (!href) return undefined
            return {
              _type: '__annotation',
              markDef: {_key: keyGenerator(), _type: 'link', href: estimateHref(normalizeHref(href, docPath), el.textContent, docPath), openInNewTab: el.getAttribute('target') === '_blank' || undefined},
              children: next(el.childNodes),
            }
          }
          if (tag === 'sup' || tag === 'sub') {
            return {_type: '__decorator', name: tag, children: next(el.childNodes)}
          }
          return undefined
        },
      },
    ],
  })
  // Drop spacer paragraphs Webflow leaves behind (<p>‍</p>, <p><br></p>).
  return blocks.filter((b) => b._type !== 'block' || b.children?.some((c) => c.text?.replace(/[\s‍]/g, '')))
}

const image = (field, alt) =>
  field?.url ? {_type: 'image', _sanityAsset: `image@${field.url}`, ...(alt || field.alt ? {alt: alt || field.alt} : {})} : undefined

const slug = (current) => ({_type: 'slug', current})
const plainBlocks = (text) =>
  text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((para, i) => ({_type: 'block', _key: `p${i}`, style: 'normal', markDefs: [], children: [{_type: 'span', _key: `s${i}`, text: para, marks: []}]}))

// ---------------------------------------------------------------------------
// Build documents

const docs = []
const push = (doc) => docs.push(JSON.parse(JSON.stringify(doc)))

// Service and blog categories
for (const c of items(await readJson('migration/webflow-cms/services-categories.json'))) {
  const s = c.fieldData.slug
  const path = `/services-categories/${s}`
  push({
    _id: idFor(`serviceCategory:${c.id}`),
    _type: 'serviceCategory',
    name: c.fieldData.name,
    slug: slug(s),
    heading: live(path)?.h1?.[0] !== c.fieldData.name ? live(path)?.h1?.[0] : undefined,
    seo: seoFor(
      path,
      `${c.fieldData.name} Electrician in Mesa, AZ | The Wire Guy Electric`,
      `Top-rated ${c.fieldData.name} electrician services in the Phoenix valley. Licensed, insured, flat-rate pricing. Serving Mesa, Scottsdale, Chandler, and more.`,
    ),
    webflowId: c.id,
  })
}

for (const c of items(await readJson('migration/webflow-cms/posts-categories.json'))) {
  const s = c.fieldData.slug
  push({
    _id: idFor(`postCategory:${c.id}`),
    _type: 'postCategory',
    name: c.fieldData.name,
    slug: slug(s),
    seo: seoFor(
      `/posts-categories/${s}`,
      `${c.fieldData.name} Electrical Tips | The Wire Guy Electric Blog`,
      `Browse our ${c.fieldData.name} electrical articles, tips, and cost guides from licensed Phoenix valley electricians.`,
    ),
    webflowId: c.id,
  })
}

// Services, in the order the live /services page lists them (Residential tab,
// then Commercial, then the rest of "All").
const servicesPage = cheerio.load(await readFile(p('migration/live-snapshots/services.html'), 'utf8'))
const tabOrder = (tab) =>
  servicesPage(`.w-tab-pane[data-w-tab="${tab}"] .w-dyn-item a.services-title`)
    .map((_, a) => servicesPage(a).attr('href').split('/').pop())
    .get()
const serviceOrder = [...new Set([...tabOrder('Residential'), ...tabOrder('Commercial'), ...tabOrder('All')])]
for (const it of items(await readJson('migration/webflow-cms/services.json'))) {
  if (it.isArchived) continue
  const f = it.fieldData
  const path = `/services/${f.slug}`
  // Keep a service only if it's live today, so we don't publish drafts by accident.
  if (!live(path) && (it.isDraft || !it.lastPublished)) continue
  push({
    _id: idFor(`service:${it.id}`),
    _type: 'service',
    name: f.name,
    slug: slug(f.slug),
    category: f.category ? ref(`serviceCategory:${f.category}`) : undefined,
    heading: live(path)?.h1?.[0] && live(path).h1[0] !== f.name ? live(path).h1[0] : undefined,
    shortDescription: f['short-description'],
    mainImage: image(f['main-image']),
    body: toPortableText(f['post-body-2'], path),
    seo: seoFor(path, `${f.name} in Mesa, AZ | The Wire Guy`, f['short-description']),
    order: serviceOrder.includes(f.slug) ? serviceOrder.indexOf(f.slug) : 100,
    webflowId: it.id,
  })
}

// Locations
const locationKeys = []
for (const it of items(await readJson('migration/webflow-cms/locations.json'))) {
  if (it.isArchived || it.isDraft) continue
  const f = it.fieldData
  const path = `/locations/${f.slug}`
  locationKeys.push(`location:${it.id}`)
  const seo = seoFor(path, `Electrician in ${f['city-name-for-seo']} | The Wire Guy Electric`, undefined) ?? {_type: 'seo'}
  if (f['meta-description'] && !seo.description) seo.description = f['meta-description']
  push({
    _id: idFor(`location:${it.id}`),
    _type: 'location',
    name: f.name,
    slug: slug(f.slug),
    cityNameForSeo: f['city-name-for-seo'],
    heading: live(path)?.h1?.[0],
    description: f.description,
    body: toPortableText(f['rich-text-for-city'], path),
    county: f.slug === 'san-tan-valley' || f.slug === 'apache-junction' ? 'Pinal County' : 'Maricopa County',
    seo,
    webflowId: it.id,
  })
}

// Blog posts (archived posts were never live; they get redirects instead)
for (const it of items(await readJson('migration/webflow-cms/blog-posts.json'))) {
  if (it.isArchived || it.isDraft) continue
  const f = it.fieldData
  const path = `/blog-posts/${f.slug}`
  push({
    _id: idFor(`post:${it.id}`),
    _type: 'post',
    title: f.name,
    slug: slug(f.slug),
    excerpt: f['post-summary'],
    mainImage: image(f['main-image-2']),
    body: toPortableText(f['rich-text'], path),
    category: f.category ? ref(`postCategory:${f.category}`) : undefined,
    // author: left empty on purpose. Assign the real author/reviewer in Studio;
    // a named licensed electrician is a strong trust signal only if it's true.
    publishedAt: it.createdOn,
    featured: Boolean(f.featured),
    seo: seoFor(path, `${f.name} | The Wire Guy Electric`, f['post-summary']),
    webflowId: it.id,
  })
}

// Team (from the published /our-team page)
const team$ = cheerio.load(await readFile(p('migration/live-snapshots/our-team.html'), 'utf8'))
const seen = new Set()
let order = 0
team$('img').each((_, el) => {
  const src = team$(el).attr('src') ?? ''
  if (!/Team/i.test(src)) return
  const card = team$(el).closest('div').parent()
  const texts = card
    .find('*')
    .contents()
    .filter((_, n) => n.type === 'text')
    .map((_, n) => team$(n).text().replace(/‍/g, '').trim())
    .get()
    .filter(Boolean)
  const [name, role, ...bio] = texts
  if (!name || seen.has(name)) return
  seen.add(name)
  const key = `team:${name.toLowerCase().replace(/[^a-z]+/g, '-')}`
  push({
    _id: idFor(key),
    _type: 'teamMember',
    name,
    slug: slug(name.toLowerCase().replace(/[^a-z]+/g, '-')),
    role,
    photo: {_type: 'image', _sanityAsset: `image@${src}`, alt: `${name}, ${role} at The Wire Guy Electric`},
    bio: bio.length ? plainBlocks(bio.join(' ')) : undefined,
    showOnTeamPage: true,
    order: order++,
  })
})

// FAQs (from the live /faq FAQPage markup)
const faqLd = live('/faq')?.jsonLd?.find((n) => n['@type'] === 'FAQPage')
faqLd?.mainEntity?.forEach((q, i) => {
  push({
    _id: idFor(`faq:${i}:${q.name}`),
    _type: 'faq',
    question: q.name,
    answer: plainBlocks(q.acceptedAnswer?.text ?? ''),
    order: i,
  })
})

// Job openings (from the live /careers JobPosting markup)
const jobLd = live('/careers')?.jsonLd?.find((n) => n['@type'] === 'JobPosting')
if (jobLd) {
  push({
    _id: idFor(`job:${jobLd.title}`),
    _type: 'jobOpening',
    title: jobLd.title,
    description: plainBlocks([jobLd.description, jobLd.qualifications].filter(Boolean).join('\n\n')),
    employmentType: jobLd.employmentType,
    datePosted: jobLd.datePosted,
    validThrough: jobLd.validThrough,
    isOpen: true,
  })
}

// Static pages: SEO and H1 frozen from the live site; body sections get built in Sanity.
const PAGES = [
  ['index', '/', 'Home'],
  ['about-us', '/about-us', 'About Us'],
  ['our-team', '/our-team', 'Our Team'],
  ['careers', '/careers', 'Careers'],
  ['faq', '/faq', 'FAQ'],
  ['contact-us', '/contact-us', 'Contact Us'],
  ['services', '/services', 'Services'],
  ['blog', '/blog', 'Blog'],
  ['commercial-electrician', '/commercial-electrician', 'Commercial'],
]
for (const [s, path, title] of PAGES) {
  const page = live(path)
  push({
    _id: idFor(`page:${s}`),
    _type: 'page',
    title,
    slug: slug(s),
    heading: page?.h1?.[0],
    seo: {_type: 'seo', title: page?.title, description: page?.metaDescription ?? undefined},
  })
}

// Site settings (NAP from the live LocalBusiness markup; verify against GBP)
const biz = live('/')?.jsonLd?.find((n) => n['@type'] === 'Electrician') ?? {}
push({
  _id: 'siteSettings',
  _type: 'siteSettings',
  businessName: biz.name ?? 'The Wire Guy Electric',
  legalName: 'The Wire Guy Electric LLC',
  description: biz.description,
  phone: '(602) 769-7892',
  phoneE164: biz.telephone ?? '+16027697892',
  email: biz.email,
  addresses: (biz.address ?? []).map((a, i) => {
    // Scottsdale has its own Google Business Profile (appointment-only office);
    // it's modeled as a branch whose entity lives on /locations/scottsdale.
    const isScottsdale = a.addressLocality === 'Scottsdale'
    const scottsdale = isScottsdale ? locationKeys.find((k) => docs.some((d) => d._id === idFor(k) && d.slug?.current === 'scottsdale')) : undefined
    return {
      _type: 'postalAddress',
      _key: `addr${i}`,
      label: `${a.addressLocality} office`,
      streetAddress: a.streetAddress,
      addressLocality: a.addressLocality,
      addressRegion: a.addressRegion,
      postalCode: a.postalCode,
      // The Mesa address is the owners' home: keep it in the footer and schema for NAP
      // consistency, but don't advertise it anywhere else (owner, 2026-10-13).
      ...(scottsdale ? {gbpName: 'The Wire Guy Electric of Scottsdale', locationPage: ref(scottsdale), appointmentOnly: true} : {footerOnly: true}),
    }
  }),
  openingHours: [{_type: 'openingHours', _key: 'weekdays', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '17:00'}],
  priceRange: biz.priceRange ?? '$$',
  foundingDate: biz.foundingDate ?? '2017',
  founders: [{...ref('team:steven-taylor'), _key: 'founder0'}],
  rocLicense: biz.identifier?.value ?? '365306',
  reviewSummary: biz.aggregateRating
    ? {ratingValue: Number(biz.aggregateRating.ratingValue), reviewCount: Number(biz.aggregateRating.reviewCount), source: 'Google'}
    : undefined,
  sameAs: biz.sameAs,
  serviceAreas: locationKeys.map((k, i) => ({...ref(k), _key: `area${i}`})),
  sisterCompanies: [
    {_type: 'linkItem', _key: 'cooling', label: 'The Cooling Guy HVAC', href: 'https://www.thecoolingguyhvac.com'},
    {_type: 'linkItem', _key: 'water', label: 'The Water Guy Plumbing', href: 'https://www.thewaterguyplumbing.com'},
  ],
  primaryCta: {_type: 'linkItem', label: 'Free Estimate', href: '/contact-us'},
  titleSuffix: 'The Wire Guy Electric',
  ga4MeasurementId: 'G-4ZYV7JMRJH',
  googleSiteVerification: live('/')?.googleSiteVerification ?? undefined,
})

// Content added on top of the Webflow export: page-builder sections for the static
// pages, data fixes, real reviews and sourced local facts. Each module receives the
// document list and helpers and edits or adds documents in place.
const ctx = {docs, push, idFor, ref, slug, image, plainBlocks, toPortableText, live, readJson, p, SITE, report}
for (const name of ['fixes', 'reviews', 'local-facts', 'page-sections']) {
  await (await import(`./content/${name}.mjs`)).default(ctx)
}

// Referential integrity: every reference must point at a document in this file.
const ids = new Set(docs.map((d) => d._id))
const dangling = []
const walk = (node, from) => {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach((n) => walk(n, from))
  if (node._type === 'reference' && !ids.has(node._ref)) dangling.push({from, ref: node._ref})
  Object.values(node).forEach((v) => walk(v, from))
}
docs.forEach((d) => walk(d, d._id))
if (dangling.length) {
  console.error('Dangling references:', dangling)
  process.exit(1)
}

await mkdir(p(OUT_DIR), {recursive: true})
await writeFile(p(`${OUT_DIR}production.ndjson`), docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
await writeFile(p(`${OUT_DIR}id-map.json`), JSON.stringify(idMap, null, 2) + '\n')
await writeFile(p(`${OUT_DIR}report.json`), JSON.stringify(report, null, 2) + '\n')

const counts = docs.reduce((acc, d) => ((acc[d._type] = (acc[d._type] ?? 0) + 1), acc), {})
console.log('Wrote', docs.length, 'documents', counts)
console.log(`Links rewritten: ${report.fixedLinks.length}, scripts dropped: ${report.droppedScripts.length}, H1s demoted: ${report.demotedH1.length}, non-Webflow images: ${report.externalImages.length}`)
