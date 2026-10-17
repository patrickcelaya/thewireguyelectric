#!/usr/bin/env node
// Checks that the page-builder sections carry every piece of live copy.
//
//   node scripts/migrate/verify-content.mjs [path/to/production.ndjson] [--verbose]
//
// Reads the generated dataset (default migration/sanity-import/production.ndjson)
// and migration/page-content/<page>.json (the live copy, 2026-10-13). For each of
// the 9 static pages it resolves page.sections the way web/src/lib/queries.ts does
// (FAQ, service, team, review, post, city and job references; shared lists and the
// CTA band from Site settings; automatic lists) and checks that:
//
//   - every copy string appears: headings, buttons, links and questions as a whole
//     field; paragraphs and answers inside a field. Comparison ignores whitespace,
//     quote style (curly/straight), emoji and the quotation marks around a quote;
//   - every link keeps its anchor text and target (relative, no trailing slash,
//     redirected paths mapped); phone, email and address links are checked against
//     Site settings;
//   - page.heading is the live H1 and no section repeats it as a heading;
//   - every section has a unique _key, every image has alt text and an asset.
//
// Anything deliberately left out must be listed, with its reason, in
// migration/page-content/_omissions.json. Exits 1 on any other miss. --verbose
// also lists every omitted string.

import {readFile, readdir} from 'node:fs/promises'

const ROOT = new URL('../../', import.meta.url)
const CONTENT_DIR = new URL('migration/page-content/', ROOT)
const [datasetArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const datasetPath = datasetArg ? new URL(datasetArg, `file://${process.cwd()}/`) : new URL('migration/sanity-import/production.ndjson', ROOT)

const docs = (await readFile(datasetPath, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l))
const byId = new Map(docs.map((d) => [d._id, d]))
const ofType = (t) => docs.filter((d) => d._type === t)
const settings = byId.get('siteSettings') ?? {}
const omissions = JSON.parse(await readFile(new URL('_omissions.json', CONTENT_DIR), 'utf8'))

// ---------------------------------------------------------------------------
// Normalization

const norm = (s) => {
  let t = String(s ?? '')
    .normalize('NFKC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/\p{Extended_Pictographic}️?/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  // A quote stored without its quotation marks (the design adds them).
  if (/^".*"$/.test(t) && t.length > 2) t = t.slice(1, -1).trim()
  return t
}

const LINK_FIXES = {'/locations/mesa': '/', '/services/electrical-panels': '/services/panels'}
const normHref = (href) => {
  let h = String(href ?? '').trim()
  h = h.replace(/^https?:\/\/(www\.)?thewireguyelectric\.com/i, '') || '/'
  if (h.startsWith('/')) {
    let [path, hash] = h.split('#')
    path = path.length > 1 ? path.replace(/\/+$/, '') : path
    if (path.startsWith('/blog/')) path = path.replace('/blog/', '/blog-posts/')
    path = LINK_FIXES[path] ?? path
    return hash ? `${path}#${hash}` : path
  }
  return h.replace(/\/+$/, '')
}
// A live "free estimate" link to /contact-us (or the old homepage form, /#contact) goes to the Free Estimate page
// now (owner rule; the migration's estimateHref in webflow-to-sanity.mjs).
const ESTIMATE_TEXT = /\bfree\b(?:\s+\w+){0,3}?\s+estimates?\b/i
const CONTACT_FORM = /^(?:\/contact-us(?:[#?]|$)|\/#contact$)/
const liveHref = (text, href) => {
  const h = normHref(href)
  return ESTIMATE_TEXT.test(String(text ?? '')) && CONTACT_FORM.test(h) ? '/estimate' : h
}
const digits = (s) => String(s ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')

// ---------------------------------------------------------------------------
// Resolving sections (mirrors web/src/lib/queries.ts SECTIONS + normalizeSections)

const deref = (r) => (r?._ref ? byId.get(r._ref) : undefined)
const cityName = (loc) => (loc.cityNameForSeo ? loc.cityNameForSeo.split(',')[0].trim() : loc.name)
// Ties break by _id, as every order() in queries.ts does (Sanity's own tie order is not documented).
const sortBy = (list, ...keys) =>
  [...list].sort((a, b) => {
    for (const k of keys) {
      const d = k(a, b)
      if (d) return d
    }
    return a._id < b._id ? -1 : a._id > b._id ? 1 : 0
  })
const byOrder = (a, b) => (a.order ?? 999) - (b.order ?? 999)
const byName = (a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''))

function faqsFor({faqs, topic}) {
  if (faqs?.length) return faqs.map(deref).filter(Boolean)
  if (topic) return sortBy(ofType('faq').filter((f) => f.topic === topic), byOrder)
  return []
}

/** Collector for one page: strings that render, links (anchor + target), contact details shown. */
function collector() {
  const fields = []
  const links = []
  const details = new Set()
  const text = (v) => {
    if (typeof v === 'string' && v.trim()) fields.push(norm(v))
  }
  const linkTo = (label, href) => {
    if (href) links.push({text: norm(label), href: normHref(href)})
  }
  const linkItem = (l) => {
    if (!l) return
    text(l.label)
    linkTo(l.label, l.href)
  }
  /** Portable Text: each block's text, the whole field's text, and link/mention marks. */
  const portable = (blocks) => {
    if (!Array.isArray(blocks)) return
    const all = []
    for (const b of blocks) {
      if (b._type !== 'block') {
        if (b._type === 'table') b.rows?.forEach((r) => r.cells?.forEach(text))
        if (b._type === 'callToAction') {
          text(b.heading)
          text(b.text)
          linkItem({label: b.label, href: b.href})
        }
        continue
      }
      const blockText = (b.children ?? []).map((c) => c.text ?? '').join('')
      text(blockText)
      all.push(blockText)
      // Join adjacent spans that share a link/mention mark (decorators can split them).
      const defs = new Map((b.markDefs ?? []).map((m) => [m._key, m]))
      let run = null
      const flush = () => {
        if (!run) return
        const def = defs.get(run.key)
        if (def._type === 'link') linkTo(run.text, def.href)
        if (def._type === 'teamMemberMention') {
          linkTo(run.text, '/our-team')
          const person = deref(def.member)
          if (person) text(person.name)
        }
        run = null
      }
      for (const c of b.children ?? []) {
        const key = (c.marks ?? []).find((m) => defs.has(m))
        if (key && run?.key === key) run.text += c.text ?? ''
        else {
          flush()
          if (key) run = {key, text: c.text ?? ''}
        }
      }
      flush()
    }
    text(all.join(' '))
  }
  return {fields, links, details, text, linkTo, linkItem, portable}
}

const serviceFields = (c, svc, title, blurb) => {
  if (!svc) return
  c.text(svc.name)
  c.text(title ?? svc.name)
  c.text(blurb ?? svc.shortDescription)
  c.linkTo(svc.name, `/services/${svc.slug?.current}`)
  if (title) c.linkTo(title, `/services/${svc.slug?.current}`)
}

function resolveSection(c, s) {
  // Fields most sections share.
  for (const k of ['eyebrow', 'heading', 'subheading', 'intro', 'text', 'trustLine', 'detailsHeading', 'formHeading', 'submitLabel', 'successMessage', 'quote', 'asideHeading', 'disclaimer']) c.text(s[k])
  if (s.cta && s._type !== 'ctaSection') c.linkItem(s.cta)

  switch (s._type) {
    case 'heroSection':
      c.linkItem(s.primaryCta)
      c.linkItem(s.secondaryCta)
      s.ctaNotes?.forEach(c.text)
      for (const q of s.reviewSnippets ?? []) {
        c.text(q.text)
        const review = deref(q.review)
        if (review) c.text(review.text)
      }
      if (s.showPhone) c.details.add('phone')
      break
    case 'richTextSection':
    case 'mediaTextSection':
      c.portable(s.body)
      break
    case 'servicesSection': {
      let cards
      if (s.services?.length) {
        cards = s.services.map((item) => (item._type === 'serviceCard' ? {svc: deref(item.service), title: item.title, text: item.text} : {svc: deref(item)}))
      } else {
        const list = ofType('service').filter((d) => d.slug?.current && (!s.category || d.category?._ref === s.category._ref))
        cards = sortBy(list, byOrder, byName).map((svc) => ({svc}))
      }
      for (const {svc, title, text} of cards) serviceFields(c, svc, title, text)
      if (s.layout === 'grouped') {
        const seen = new Set()
        for (const {svc} of cards) {
          const cat = deref(svc?.category)
          if (!cat || seen.has(cat._id)) continue
          seen.add(cat._id)
          c.text(cat.heading ?? cat.name)
          c.text(cat.name)
          c.linkTo(cat.name, `/services-categories/${cat.slug?.current}`)
          c.portable(cat.description)
        }
      }
      break
    }
    case 'locationsSection': {
      const locs = s.locations?.length ? s.locations.map(deref).filter(Boolean) : sortBy(ofType('location'), byName)
      for (const loc of locs) {
        const href = `/locations/${loc.slug?.current}`
        c.text(cityName(loc))
        c.text(loc.cityNameForSeo)
        c.text(loc.cardBlurb)
        c.linkTo(cityName(loc), href)
        c.linkTo(loc.cityNameForSeo, href)
        loc.neighborhoods?.forEach(c.text)
      }
      if (s.includeHomeCity !== false && settings.homeCity) {
        c.text(settings.homeCity.name)
        c.text(settings.homeCity.cardBlurb)
        c.linkTo(settings.homeCity.name, '/')
      }
      break
    }
    case 'reviewsSection': {
      let reviews
      if (s.reviews?.length) reviews = s.reviews.map(deref).filter(Boolean)
      else {
        const list = ofType('review').filter((r) => (!s.location || r.location?._ref === s.location._ref) && (!s.service || r.service?._ref === s.service._ref))
        reviews = sortBy(list, (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)), (a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
        const n = s.limit ?? 6
        if (n > 0) reviews = reviews.slice(0, n)
      }
      for (const r of reviews) {
        c.text(r.authorName)
        c.text(r.text)
      }
      c.reviewCount = reviews.length
      break
    }
    case 'faqSection': {
      const faqLists = [faqsFor(s), ...(s.groups ?? []).map((g) => (c.text(g.heading), faqsFor(g)))]
      for (const f of faqLists.flat()) {
        c.text(f.question)
        c.portable(f.answer)
      }
      c.faqCount = (c.faqCount ?? 0) + faqLists.flat().length
      break
    }
    case 'teamSection': {
      const members = s.members?.length
        ? s.members.map(deref).filter(Boolean)
        : sortBy(ofType('teamMember').filter((m) => m.showOnTeamPage !== false), byOrder, byName)
      for (const m of members) {
        c.text(m.name)
        c.text(m.role)
        if (s.showBios !== false) c.portable(m.bio)
      }
      break
    }
    case 'postsSection': {
      let posts
      // a picked post is a reference, or a postCard (the post plus its own cover)
      if (s.posts?.length) posts = s.posts.map((item) => deref(item._type === 'postCard' ? item.post : item)).filter(Boolean)
      else {
        const list = ofType('post').filter((p) => p.slug?.current && p.publishedAt && (!s.category || p.category?._ref === s.category._ref))
        posts = sortBy(
          list,
          (a, b) => (s.featuredFirst ? Number(Boolean(b.featured)) - Number(Boolean(a.featured)) : 0),
          (a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)),
        )
        const n = s.limit ?? 3
        if (n > 0) posts = posts.slice(0, n)
      }
      for (const p of posts) {
        c.text(p.title)
        c.text(p.excerpt)
        c.linkTo(p.title, `/blog-posts/${p.slug.current}`)
      }
      break
    }
    case 'jobsSection':
      for (const j of ofType('jobOpening').filter((j) => j.isOpen !== false)) {
        c.text(j.title)
        c.portable(j.description)
      }
      break
    case 'contactSection':
      for (const d of s.contactDetails ?? []) c.details.add(d)
      break
    case 'officeLocationsSection':
      c.details.add('offices')
      break
    case 'ctaSection': {
      const cta = s.cta?.heading ? s.cta : settings.ctaBand
      if (cta) {
        c.text(cta.heading)
        c.text(cta.text)
        c.text(cta.statusText)
        c.linkItem({label: cta.label, href: cta.href})
      }
      break
    }
    case 'trustBarSection':
      for (const t of s.items ?? []) {
        c.text(t.value)
        c.text(t.label)
        c.text([t.value, t.label].filter(Boolean).join(' '))
        if (t.fact === 'license' && settings.rocLicense) c.linkTo(`ROC #${settings.rocLicense}`, settings.rocLicenseUrl)
      }
      break
    case 'featureGridSection': {
      const items = s.siteList ? settings[s.siteList] ?? [] : s.items ?? []
      for (const i of items) {
        c.text(i.title)
        c.text(i.text)
        c.linkItem(i.link)
        const svc = deref(i.service)
        if (svc) c.linkTo(i.title, `/services/${svc.slug?.current}`)
      }
      break
    }
    case 'teamIntroSection':
      c.portable(s.body)
      c.linkItem(s.secondaryCta)
      c.text(s.image?.caption)
      for (const p of (s.people ?? []).map(deref).filter(Boolean)) c.text(p.name)
      break
    case 'quoteSection': {
      const person = deref(s.person)
      if (person) {
        c.text(person.name)
        c.text(person.role)
      }
      const review = deref(s.review)
      if (review) c.text(review.authorName)
      break
    }
    case 'gallerySection':
      for (const img of s.images ?? []) {
        c.text(img.alt)
        c.text(img.caption)
      }
      for (const p of (s.projects ?? []).map(deref).filter(Boolean)) c.text(p.title)
      break
    case 'processStepsSection':
      for (const st of s.steps ?? []) {
        c.text(st.title)
        c.text(st.text)
      }
      break
    case 'priceGuideSection':
      for (const r of s.rows ?? []) {
        c.text(r.label)
        c.text(r.note)
        const svc = deref(r.service)
        if (svc) c.linkTo(svc.name, `/services/${svc.slug?.current}`)
        const guide = deref(r.guide)
        if (guide) c.linkTo(guide.title, `/blog-posts/${guide.slug?.current}`)
      }
      break
    case 'highlightsSection':
      for (const h of s.checklist ?? []) {
        c.text(h.lead)
        c.text(h.text)
      }
      c.portable(s.asideBody)
      break
  }
}

// ---------------------------------------------------------------------------
// Structural checks

const SECTION_TYPES = new Set([
  'heroSection', 'richTextSection', 'mediaTextSection', 'servicesSection', 'locationsSection', 'reviewsSection', 'faqSection', 'teamSection',
  'postsSection', 'jobsSection', 'contactSection', 'ctaSection', 'trustBarSection', 'featureGridSection', 'teamIntroSection', 'quoteSection',
  'gallerySection', 'officeLocationsSection', 'processStepsSection', 'priceGuideSection', 'highlightsSection',
])

function structuralProblems(page) {
  const problems = []
  const sections = page.sections ?? []
  if (!sections.length) problems.push('page has no sections')
  const keys = sections.map((s) => s._key)
  if (new Set(keys).size !== keys.length || keys.some((k) => !k)) problems.push('section _key missing or repeated')
  sections.forEach((s, i) => {
    if (!SECTION_TYPES.has(s._type)) problems.push(`section ${i}: unknown _type ${s._type}`)
  })
  if (sections.filter((s) => s._type === 'heroSection').length > 1) problems.push('more than one hero')
  // No section repeats the H1.
  const h1 = norm(page.heading)
  const walk = (node, path) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) {
      const k = node.filter((n) => n && typeof n === 'object' && !n._ref).map((n) => n._key)
      if (k.length && (k.some((x) => !x) || new Set(k).size !== k.length)) problems.push(`${path}: array item _key missing or repeated`)
      return node.forEach((n, i) => walk(n, `${path}[${i}]`))
    }
    for (const key of ['heading', 'subheading', 'asideHeading']) {
      if (typeof node[key] === 'string' && norm(node[key]) === h1) problems.push(`${path}.${key} repeats the H1`)
    }
    const isImage = node._type === 'image' || node._type === 'galleryImage'
    if (isImage) {
      if (!node.alt?.trim()) problems.push(`${path}: image without alt`)
      const ref = node.asset?._ref
      if (!ref && !node._sanityAsset) problems.push(`${path}: image without asset`)
      if (ref && byId.get(ref)?._type !== 'sanity.imageAsset') problems.push(`${path}: asset ${ref} is not in the dataset`)
    }
    if (node._type === 'reference' && !byId.has(node._ref)) problems.push(`${path}: dangling reference ${node._ref}`)
    for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`)
  }
  walk(sections, 'sections')
  return problems
}

// ---------------------------------------------------------------------------
// Copy units from the live page

const TAG_EXACT = /^(h[2-6]|button|link|icon-link|img-alt|form-submit|faq-q.*)$/

const stripTags = (html) =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')

/** One copy-deck entry → the strings it is made of (split at <br>; a bold lead and its text). */
function unitsOf(item) {
  const html = item.html
  if (item.tag === 'li' && html) {
    const m = html.match(/^<strong>(.*?)<\/strong>\s*[—–-]\s*(.*)$/s)
    if (m) return [{text: stripTags(m[1]), exact: true}, {text: stripTags(m[2]), exact: false}]
  }
  const exact = TAG_EXACT.test(item.tag)
  if (html && /<br\s*\/?>/i.test(html)) {
    return html
      .split(/<br\s*\/?>/i)
      .map((part) => stripTags(part).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .map((text) => ({text, exact}))
  }
  return [{text: item.text ?? '', exact}]
}

const matchesOmission = (entry, page, item, text) =>
  (entry.page === '*' || entry.page === page) &&
  (!entry.tag || entry.tag === item.tag) &&
  (entry.text === undefined || norm(entry.text) === norm(text) || norm(entry.text) === norm(item.text))

// ---------------------------------------------------------------------------
// Run

const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()
const usedOmissions = new Set()
let failures = 0
const rows = []

for (const file of files) {
  const content = JSON.parse(await readFile(new URL(file, CONTENT_DIR), 'utf8'))
  const slug = content.page
  const page = ofType('page').find((p) => p.slug?.current === slug)
  const misses = []
  const omitted = []
  let copyOmitted = 0
  let linkOmitted = 0
  if (!page) {
    console.log(`\n${slug}: no page document`)
    failures++
    continue
  }

  const c = collector()
  for (const s of page.sections ?? []) resolveSection(c, s)
  const fieldSet = new Set(c.fields)
  const targets = new Set(c.links.map((l) => l.href))
  // (a stored button href may still read /contact-us: ctaHref sends it to /estimate when it renders)
  const hasLink = (text, href) => c.links.some((l) => liveHref(l.text, l.href) === liveHref(text, href) && l.text === norm(text))

  const problems = structuralProblems(page)

  // Phone, email and address links in contact blocks render from Site settings.
  const addressText = (a) => `${a.streetAddress}, ${a.addressLocality}, ${a.addressRegion} ${a.postalCode}`
  const napKind = (item) => {
    if (item.tag !== 'link') return null
    if (/^tel:/i.test(item.href ?? '')) return 'phone'
    if (/^mailto:/i.test(item.href ?? '')) return 'email'
    // Footer-only addresses (a home address) never render in contact blocks.
    if ((settings.addresses ?? []).some((a) => !a.footerOnly && norm(addressText(a)) === norm(item.text))) return 'offices'
    return null
  }
  const napOk = (kind, item) => {
    if (!c.details.has(kind)) return false
    if (kind === 'phone') return digits(item.text) === digits(settings.phoneE164)
    if (kind === 'email') return norm(item.text).toLowerCase() === norm(settings.email).toLowerCase()
    return true
  }

  // Copy strings
  let total = 0
  let found = 0
  for (const item of content.copy) {
    if (item.tag === 'h1') {
      total++
      if (norm(item.text) === norm(page.heading)) found++
      else misses.push(`H1 differs: page.heading "${page.heading}" vs live "${item.text}"`)
      continue
    }
    const nap = napKind(item)
    for (const unit of unitsOf(item)) {
      total++
      const t = norm(unit.text)
      let ok
      if (nap) ok = napOk(nap, item)
      else if (!t) ok = false
      else ok = unit.exact ? fieldSet.has(t) : c.fields.some((f) => f.includes(t))
      if (ok) {
        found++
        continue
      }
      const entry = omissions.copy.findIndex((e) => matchesOmission(e, slug, item, unit.text))
      if (entry >= 0) {
        usedOmissions.add(`copy:${entry}`)
        const e = omissions.copy[entry]
        if (e.genericLabel && item.href && !targets.has(normHref(item.href))) misses.push(`[${item.tag}] "${unit.text}": target ${item.href} is not linked`)
        else {
          copyOmitted++
          omitted.push(`[${item.tag}] "${unit.text}"`)
        }
        continue
      }
      misses.push(`[${item.tag}] "${unit.text}"${nap ? ` (${nap} not shown from Site settings)` : ''}`)
    }
  }

  // Links (anchor text + target)
  let linkTotal = 0
  let linkFound = 0
  for (const l of content.links) {
    const item = {tag: l.kind === 'link' ? 'link' : l.kind, text: l.text, href: l.href}
    if (napKind(item)) continue // checked with the copy above
    if (!l.text && l.kind === 'cardLink') continue // image link inside a card; the card's own link is checked
    linkTotal++
    if (hasLink(l.text, l.href)) {
      linkFound++
      continue
    }
    const genericCopy = omissions.copy.find((e) => e.genericLabel && matchesOmission(e, slug, {tag: 'button', text: l.text}, l.text))
    if (genericCopy && targets.has(normHref(l.href))) {
      linkFound++
      continue
    }
    const entry = omissions.links.findIndex((e) => (e.page === '*' || e.page === slug) && norm(e.text) === norm(l.text) && normHref(e.href) === normHref(l.href))
    if (entry >= 0) {
      usedOmissions.add(`links:${entry}`)
      const e = omissions.links[entry]
      if (e.requireTarget && !targets.has(normHref(l.href))) misses.push(`link "${l.text}" → ${l.href}: target is not linked at all`)
      else {
        linkOmitted++
        omitted.push(`link "${l.text}" → ${l.href}`)
      }
      continue
    }
    misses.push(`link "${l.text}" → ${l.href}${targets.has(normHref(l.href)) ? ' (target linked with other text)' : ''}`)
  }

  const bad = misses.length + problems.length
  failures += bad
  rows.push({slug, total, found, omitted: copyOmitted, linkTotal, linkFound, linkOmitted, misses, problems, omittedList: omitted, sections: (page.sections ?? []).length})
}

// ---------------------------------------------------------------------------
// Report

const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : 'n/a')
console.log('Copy coverage of page.sections (live copy captured 2026-10-13)\n')
console.log('page                     sections   copy: found + omitted / total   coverage   links: found + omitted / total')
for (const r of rows) {
  const copy = `${r.found} + ${r.omitted} / ${r.total}`
  const links = `${r.linkFound} + ${r.linkOmitted} / ${r.linkTotal}`
  console.log(`${r.slug.padEnd(24)} ${String(r.sections).padStart(8)}   ${copy.padStart(29)}   ${pct(r.found + r.omitted, r.total).padStart(8)}   ${links.padStart(30)}`)
}
for (const r of rows) {
  if (!r.misses.length && !r.problems.length && !process.argv.includes('--verbose')) continue
  console.log(`\n${r.slug}`)
  for (const p of r.problems) console.log(`  PROBLEM ${p}`)
  for (const m of r.misses) console.log(`  MISSING ${m}`)
  if (process.argv.includes('--verbose')) for (const o of r.omittedList) console.log(`  omitted ${o}`)
}
const unused = [
  ...omissions.copy.map((e, i) => [`copy:${i}`, e]),
  ...omissions.links.map((e, i) => [`links:${i}`, e]),
].filter(([k]) => !usedOmissions.has(k))
if (unused.length) {
  console.log('\nOmission entries that matched nothing (stale?):')
  for (const [, e] of unused) console.log(`  ${e.page} ${e.tag ?? 'link'} ${JSON.stringify(e.text ?? e.href ?? '')}`)
}
console.log(`\n${failures ? `FAIL: ${failures} miss(es) or problem(s)` : 'OK: every live string and link is in the sections (or listed in _omissions.json with a reason)'}`)
process.exit(failures ? 1 : 0)
