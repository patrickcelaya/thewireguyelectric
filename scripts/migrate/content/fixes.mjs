// Data fixes and enrichment on top of the Webflow export.
//
// Reads the data files in migration/content-data/ (each one cites where its
// values come from; README.md there explains every decision) and edits the
// documents built earlier in this run:
//
//   city-relations.json   location.name -> the bare city ("Gilbert"), cardBlurb,
//                         featuredServices, nearbyLocations; siteSettings.homeCity blurb
//   faqs.json             every faq doc rewritten to the visible /faq copy (question,
//                         answer with its links, topic, order, services); missing ones created
//   service-relations.json  service.priceRange (only figures the live site publishes),
//                         relatedServices, relatedPosts
//   post-services.json    post.relatedServices (hub-and-spoke map)
//   site-settings.json    heroQuotes, valueProps, capabilities, ctaBand, availabilityNote,
//                         Google Business Profile / reviews / ROC / office map links
//
// Data files name documents by slug; this module resolves them to references and
// fails on anything it cannot resolve, so a typo never becomes a dangling or
// silently missing reference. Titles, H1s, meta descriptions and slugs are never
// touched, and the module checks that before returning.

import {readFile} from 'node:fs/promises'

const DIR = 'migration/content-data/'
const FIELDS_TS = 'studio/schemaTypes/shared/fields.ts'

export default async function fixes(ctx) {
  const {docs, push, idFor, readJson, toPortableText, p, report} = ctx
  const [cityData, faqData, serviceData, postData, settingsData] = await Promise.all(
    ['city-relations', 'faqs', 'service-relations', 'post-services', 'site-settings'].map((f) => readJson(`${DIR}${f}.json`)),
  )
  const {faqTopics, iconTokens} = await schemaLists(await readFile(p(FIELDS_TS), 'utf8'))

  const fail = (file, msg) => {
    throw new Error(`${DIR}${file}.json: ${msg}`)
  }
  const ofType = (type) => docs.filter((d) => d._type === type)
  const bySlug = (type, s) => docs.find((d) => d._type === type && d.slug?.current === s)
  const refTo = (type, s, file, where) => {
    const doc = bySlug(type, s)
    if (!doc) fail(file, `${where}: no ${type} document with slug "${s}"`)
    return {_type: 'reference', _ref: doc._id}
  }
  // Reference arrays need a _key per item; the target slug is stable and unique.
  const refList = (type, slugs, file, where) => {
    if (new Set(slugs).size !== slugs.length) fail(file, `${where}: duplicate slug in ${JSON.stringify(slugs)}`)
    return slugs.map((s) => ({...refTo(type, s, file, where), _key: s}))
  }
  const setOrDrop = (doc, field, value) => {
    if (value === undefined || (Array.isArray(value) && value.length === 0)) delete doc[field]
    else doc[field] = value
  }

  // SEO parity guard: snapshot every field that feeds a title, H1, meta description or URL.
  const seoSnapshot = () =>
    JSON.stringify(
      docs
        .filter((d) => ['location', 'service', 'post', 'page', 'serviceCategory', 'postCategory'].includes(d._type))
        .map((d) => [d._id, d.slug?.current, d.heading, d.title, d.cityNameForSeo, d.description, d.shortDescription, d.excerpt, d.seo]),
    )
  const before = seoSnapshot()
  const out = {}

  // -------------------------------------------------------------------------
  // 1. Cities: bare name, card blurb, featured services, nearby cities.
  {
    const file = 'city-relations'
    const locations = ofType('location')
    for (const slug of Object.keys(cityData.cities)) {
      if (!bySlug('location', slug)) fail(file, `city "${slug}" has no location document`)
    }
    for (const loc of locations) {
      const s = loc.slug.current
      const c = cityData.cities[s]
      if (!c) fail(file, `no entry for location "${s}"`)
      // The H1 and title come from heading and cityNameForSeo; the old full-H1 name was
      // only a fallback for them, so both must be present before name changes.
      if (!loc.heading || !loc.cityNameForSeo) fail(file, `${s}: heading or cityNameForSeo is empty, so changing name would change the H1/title`)
      const derived = loc.cityNameForSeo.replace(/,\s*AZ$/i, '').trim()
      if (c.name !== derived) fail(file, `${s}: name "${c.name}" does not match cityNameForSeo "${loc.cityNameForSeo}"`)
      loc.name = c.name
      setOrDrop(loc, 'cardBlurb', c.cardBlurb)
      const n = c.featuredServices?.length ?? 0
      if (n < 6 || n > 8) fail(file, `${s}: featuredServices must list 6-8 services, has ${n}`)
      loc.featuredServices = refList('service', c.featuredServices, file, `${s}.featuredServices`)
      if (c.nearbyLocations.includes(s)) fail(file, `${s}: nearbyLocations includes itself`)
      loc.nearbyLocations = refList('location', c.nearbyLocations, file, `${s}.nearbyLocations`)
    }
    out.locations = locations.map((l) => ({slug: l.slug.current, name: l.name, cardBlurb: Boolean(l.cardBlurb), featured: l.featuredServices.length, nearby: l.nearbyLocations.length}))
  }

  // -------------------------------------------------------------------------
  // 2. FAQs: the visible /faq copy is the truth (the old JSON-LD had older prices).
  {
    const file = 'faqs'
    const norm = (s) => s.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase()
    const existing = ofType('faq')
    const claimed = new Set()
    const created = []
    const renamed = []
    const orders = new Set()
    for (const f of faqData.faqs) {
      if (!faqTopics.includes(f.topic)) fail(file, `"${f.question}": topic "${f.topic}" is not in FAQ_TOPICS (${FIELDS_TS})`)
      if (orders.has(f.order)) fail(file, `duplicate order ${f.order}`)
      orders.add(f.order)
      const names = [f.question, f.legacyQuestion].filter(Boolean).map(norm)
      let doc = existing.find((d) => !claimed.has(d._id) && names.includes(norm(d.question ?? '')))
      if (!doc) {
        doc = {_id: idFor(`faq:visible:${f.question}`), _type: 'faq'}
        created.push(f.question)
      } else {
        claimed.add(doc._id)
        if (doc.question !== f.question) renamed.push({from: doc.question, to: f.question})
      }
      doc.question = f.question
      doc.answer = answerBlocks(f, toPortableText, (msg) => fail(file, `"${f.question}": ${msg}`))
      doc.topic = f.topic
      setOrDrop(doc, 'services', f.services.length ? refList('service', f.services, file, `"${f.question}".services`) : undefined)
      doc.order = f.order
      if (created.includes(f.question)) push(doc)
    }
    const unmatched = existing.filter((d) => !claimed.has(d._id)).map((d) => d.question)
    if (unmatched.length) console.warn(`fixes: ${unmatched.length} faq document(s) match no visible question and were left as they are`, unmatched)
    out.faqs = {visible: faqData.faqs.length, updated: claimed.size, created, renamed, unmatched}
  }

  // -------------------------------------------------------------------------
  // 3. Services: published price ranges, related services and posts.
  {
    const file = 'service-relations'
    const {services, priceAsOf} = serviceData
    if (!/^\d{4}-\d{2}-\d{2}$/.test(priceAsOf ?? '')) fail(file, `priceAsOf "${priceAsOf}" is not a date`)
    for (const s of Object.keys(services)) if (!bySlug('service', s)) fail(file, `"${s}" has no service document`)
    for (const svc of ofType('service')) {
      const s = svc.slug.current
      const d = services[s]
      if (!d) fail(file, `no entry for service "${s}"`)
      if (d.priceRange) {
        const {low, high, note, source} = d.priceRange
        if (!Number.isFinite(low) || !Number.isFinite(high) || high < low) fail(file, `${s}: priceRange needs numeric low <= high`)
        if (!note || !source?.length) fail(file, `${s}: priceRange needs a note and the published source it quotes`)
        svc.priceRange = {low, high, note, asOf: priceAsOf}
      } else {
        delete svc.priceRange
      }
      if (d.relatedServices.includes(s)) fail(file, `${s}: relatedServices includes itself`)
      if (d.relatedServices.length < 3 || d.relatedServices.length > 4) fail(file, `${s}: relatedServices should list 3-4 services`)
      if (d.relatedPosts.length > 5) fail(file, `${s}: relatedPosts lists more than 5 posts`)
      svc.relatedServices = refList('service', d.relatedServices, file, `${s}.relatedServices`)
      setOrDrop(svc, 'relatedPosts', d.relatedPosts.length ? refList('post', d.relatedPosts, file, `${s}.relatedPosts`) : undefined)
    }
    out.services = {
      priced: ofType('service').filter((d) => d.priceRange).map((d) => `${d.slug.current} ${d.priceRange.low}-${d.priceRange.high}`),
      withRelatedPosts: ofType('service').filter((d) => d.relatedPosts).length,
    }
  }

  // -------------------------------------------------------------------------
  // 4. Posts: the hub service(s) each post supports; the first is the primary.
  {
    const file = 'post-services'
    for (const s of Object.keys(postData.posts)) if (!bySlug('post', s)) fail(file, `"${s}" has no post document`)
    const unmapped = []
    for (const post of ofType('post')) {
      const list = postData.posts[post.slug.current]
      if (!list?.length) {
        unmapped.push(post.slug.current)
        continue
      }
      post.relatedServices = refList('service', list, file, `${post.slug.current}`)
    }
    if (unmapped.length) console.warn(`fixes: ${unmapped.length} post(s) have no hub service in ${DIR}post-services.json`, unmapped)
    out.posts = {mapped: ofType('post').length - unmapped.length, unmapped}
  }

  // -------------------------------------------------------------------------
  // 5. Site settings: shared copy and profile links, all verbatim from the live site.
  {
    const file = 'site-settings'
    const settings = docs.find((d) => d._id === 'siteSettings')
    if (!settings) fail(file, 'no siteSettings document')
    const icon = (i, where) => {
      if (i !== undefined && !iconTokens.includes(i)) fail(file, `${where}: icon "${i}" is not an ICON_OPTIONS token`)
      return i
    }
    const linkItem = (l) => (l ? {_type: 'linkItem', label: l.label, href: l.href} : undefined)
    const featureItems = (items, prefix) =>
      items.map((it, i) => {
        const item = {_type: 'featureItem', _key: `${prefix}${i}`, title: it.title}
        if (it.text) item.text = it.text
        if (it.icon) item.icon = icon(it.icon, `${prefix}.${it.title}`)
        if (it.service) item.service = refTo('service', it.service, file, `${prefix}.${it.title}`)
        if (it.link) item.link = linkItem(it.link)
        return item
      })

    settings.heroQuotes = settingsData.heroQuotes.items.map((q, i) => {
      if (/^["“”]|["“”]$/.test(q.text)) fail(file, `heroQuotes[${i}]: store the quote without quotation marks`)
      if (q.text.length > 140) fail(file, `heroQuotes[${i}]: over 140 characters`)
      return {_type: 'reviewSnippet', _key: `quote${i}`, text: q.text, ...(q.rating ? {rating: q.rating} : {})}
    })
    settings.valueProps = featureItems(settingsData.valueProps.items, 'value')
    settings.capabilities = featureItems(settingsData.capabilities.items, 'capability')
    settings.ctaBand = {_type: 'callToAction', ...settingsData.ctaBand.value}

    const note = settingsData.availabilityNote.value
    if (/24\s*\/\s*7|24 hours|around the clock|emergency service/i.test(note)) fail(file, 'availabilityNote must not claim 24/7 or emergency service')
    settings.availabilityNote = note

    settings.googleBusinessProfileUrl = settingsData.googleBusinessProfileUrl.value
    settings.reviewSummary = {...settings.reviewSummary, reviewsUrl: settingsData.reviewsUrl.value}
    settings.rocLicenseUrl = settingsData.rocLicenseUrl.value
    for (const [city, url] of Object.entries(settingsData.addressMapsUrls.byCity)) {
      const address = settings.addresses?.find((a) => a.addressLocality === city)
      if (!address) fail(file, `addressMapsUrls: no ${city} address in siteSettings.addresses`)
      address.googleMapsUrl = url
    }

    // Mesa is the homepage, not a location document; its tile blurb lives here. Merge,
    // so a later module that adds local facts (neighborhoods, utilities) keeps it.
    settings.homeCity = {...settings.homeCity, name: settings.homeCity?.name ?? cityData.homeCity.name, cardBlurb: settings.homeCity?.cardBlurb ?? cityData.homeCity.cardBlurb}
    out.siteSettings = ['heroQuotes', 'valueProps', 'capabilities', 'ctaBand', 'availabilityNote', 'googleBusinessProfileUrl', 'reviewSummary.reviewsUrl', 'rocLicenseUrl', 'addresses[].googleMapsUrl', 'homeCity.cardBlurb']
  }

  if (seoSnapshot() !== before) throw new Error('fixes: a title, H1, meta description or slug changed; that must never happen here')
  report.fixes = out
}

/**
 * The FAQ answer as Portable Text, from the visible HTML. Internal links are
 * normalized by toPortableText (relative, no trailing slash) and open in the same
 * tab; the visible text and link count must survive the conversion exactly.
 */
function answerBlocks(f, toPortableText, fail) {
  const isInternal = (attrs) => /href="(\/|https?:\/\/(www\.)?thewireguyelectric\.com)/i.test(attrs)
  const html = f.answerHtml.replace(/<a\s([^>]*)>/g, (tag, attrs) => (isInternal(attrs) ? `<a ${attrs.replace(/\s*target="[^"]*"/g, '')}>` : tag))
  const blocks = toPortableText(`<p>${html}</p>`, '/faq')
  const plain = (s) => s.replace(/\s+/g, ' ').trim()
  const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
  const expected = plain(decode(html.replace(/<[^>]+>/g, '')))
  const got = plain(blocks.map((b) => (b.children ?? []).map((c) => c.text).join('')).join(' '))
  if (got !== expected) fail(`answer text changed in conversion:\n  expected: ${expected}\n  got:      ${got}`)
  const linksIn = (html.match(/<a\s/g) ?? []).length
  const linksOut = blocks.reduce((n, b) => n + (b.markDefs ?? []).filter((m) => m._type === 'link').length, 0)
  if (linksIn !== linksOut) fail(`answer has ${linksIn} links but ${linksOut} survived conversion`)
  return blocks
}

/** FAQ_TOPICS and the ICON_OPTIONS tokens, read from the Studio schema so they never drift. */
async function schemaLists(source) {
  const block = (name) => source.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\n\\]`))?.[1]
  const topics = block('FAQ_TOPICS')
  const icons = block('ICON_OPTIONS')
  if (!topics || !icons) throw new Error(`fixes: could not read FAQ_TOPICS / ICON_OPTIONS from ${FIELDS_TS}`)
  return {
    faqTopics: [...topics.matchAll(/'([^']+)'/g)].map((m) => m[1]),
    iconTokens: [...icons.matchAll(/value: '([^']+)'/g)].map((m) => m[1]),
  }
}
