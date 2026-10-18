// Content the CMS templates (city, service and post pages) show, from
// migration/content-data/cms-templates.json:
//
//   featuredPosts   post.featured on the most-read guides (Search Console), so guide
//                   lists on city and service pages lead with them
//   serviceImages   a service's main image replaced by the crew's own photo of that work
//                   where the export had a stock photo (the asset must be in the dataset)
//   serviceAlts     alt text for the services' own photos (all were empty)
//   postAlts        alt text for a post's own main image when it is a crew photo shown as the
//                   post's cover (it had none)
//   atAGlance       service.atAGlance facts (with an optional supporting line); each one
//                   quotes its evidence, which must be word for word in the service body
//                   or the named /faq answer
//   quickAnswers    service.quickAnswer, the "short version" line; every evidence phrase
//                   must be in the service body, and no answer may name a price
//   bodyEdits       dollar ranges taken out of service bodies (owner rule); each `find`
//                   must occur exactly once and may not cut through a link, and no
//                   service body or question of its own may name a price afterwards
//   bodyLinks       a post linked, by its own title, at the end of a service body's block
//   linkFixes       links in a post, city body or FAQ answer that point to the wrong place:
//                   estimate requests the "free estimate" phrase rule misses (sent to
//                   /estimate) and a citation wrapped in a search URL; a citation whose
//                   page is gone (`to` null) loses its link and keeps its words; each must
//                   match exactly one link by its text and target
//   postCategories  post.category for the blog topic pages
//
//   textFixes       typing slips in a post body ("afternoon?The"); each must occur exactly
//                   once in that post's text
//   bodyRemovals    single body blocks taken out of a service or post: a list item by its
//                   exact text, or a figure by its image URL; each must match exactly one
//                   block
//   figureAlts      alt text for a figure in a post body that has none (Webflow's "inherit"
//                   placeholder is dropped by the converter), by its image URL
//
// It also drops the SEO tool's tracking markers ("sbb-itb-f8419aa") that the Webflow
// export carried into a post body as a heading of their own.
//
// Runs after page-sections. Titles, H1s, meta descriptions and slugs are never touched.
//
// The "posts" stage runs after the late copy edits, so it reads the post bodies as they ship:
//
//   postQuickAnswers  post.quickAnswer, the "Quick answer" box above a post's body; every
//                     evidence phrase must be in the post body, and no answer may name a price.
//                     Then no post may show a quick answer (else its excerpt, the box's
//                     fallback) that repeats its own opening word for word: the box sits
//                     right above it, so a post whose excerpt does needs an answer here.

import contentEdits from './content-edits.mjs'

const DATA = 'migration/content-data/cms-templates.json'
const PRICE = /\$\s?\d/

const blockText = (blocks = []) =>
  blocks
    .filter((b) => b._type === 'block')
    .map((b) => (b.children ?? []).map((c) => c.text ?? '').join(''))
    .join('\n')
// quote style and spacing don't matter when evidence is compared
const loose = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ')
const words = (s) => s.split(/\s+/).filter(Boolean).length

export default async function cmsTemplates(ctx, stage) {
  const {docs, readJson, report} = ctx
  const data = await readJson(DATA)
  const fail = (msg) => {
    throw new Error(`${DATA}: ${msg}`)
  }
  const bySlug = (type, slug) => docs.find((d) => d._type === type && d.slug?.current === slug) ?? fail(`no ${type} with slug "${slug}"`)
  if (stage === 'posts') return postQuickAnswers(docs, data, bySlug, fail, report)

  for (const slug of data.featuredPosts.slugs) bySlug('post', slug).featured = true

  const replaced = new Set()
  for (const {service, asset, alt} of data.serviceImages) {
    if (!docs.some((d) => d._type === 'sanity.imageAsset' && d._id === asset)) fail(`${service}: image asset ${asset} is not in the dataset`)
    if (!alt?.trim()) fail(`${service}: the replacement image needs alt text`)
    bySlug('service', service).mainImage = {_type: 'image', asset: {_type: 'reference', _ref: asset}, alt}
    replaced.add(service)
  }

  for (const [service, alt] of Object.entries(data.serviceAlts.alts)) {
    // a replaced image keeps the alt that describes it
    if (replaced.has(service)) fail(`${service}: has a replacement image; its alt belongs in serviceImages`)
    const doc = bySlug('service', service)
    if (!doc.mainImage) fail(`${service}: has no main image to describe`)
    doc.mainImage = {...doc.mainImage, alt}
  }

  for (const [post, alt] of Object.entries(data.postAlts.alts)) {
    const doc = bySlug('post', post)
    if (!doc.mainImage) fail(`postAlts ${post}: has no main image to describe`)
    if (doc.mainImage.alt) fail(`postAlts ${post}: the main image already has alt text "${doc.mainImage.alt}"`)
    doc.mainImage = {...doc.mainImage, alt}
  }

  // Price edits first, then the copy edits for service bodies (content-edits.mjs), so glance facts and quick
  // answers are checked against the final body.
  const edited = []
  for (const {service, find, replace} of data.bodyEdits.edits) {
    editBody(bySlug('service', service), find, replace, (msg) => fail(`bodyEdits ${service}: ${msg}`))
    edited.push(service)
  }
  await contentEdits(ctx, 'service')
  for (const doc of docs.filter((d) => d._type === 'service')) {
    const priced = blockText(doc.body).split('\n').find((line) => PRICE.test(line))
    if (priced) fail(`bodyEdits: ${doc.slug.current} still names a price in its body: "${priced.slice(0, 120)}…"`)
    // nor in its own questions (D9). The /faq questions tagged with a service keep their prices for /faq
    // and the guides; the service template leaves out every question with a price.
    const pricedFaq = (doc.faqs ?? []).find((f) => PRICE.test(f.question ?? '') || PRICE.test(blockText(f.answer)))
    if (pricedFaq) fail(`${doc.slug.current}: its own question "${pricedFaq.question}" names a price; service pages show none`)
  }

  const sourceText = (service, doc, source) => {
    if (source === 'body') return blockText(doc.body)
    const question = source?.startsWith('faq:') ? source.slice(4) : fail(`${service}: unknown source "${source}"`)
    const faq = docs.find((d) => d._type === 'faq' && d.question === question) ?? fail(`${service}: no faq "${question}"`)
    return blockText(faq.answer)
  }

  for (const [service, facts] of Object.entries(data.atAGlance)) {
    const doc = bySlug('service', service)
    doc.atAGlance = facts.map(({label, value, detail, source, evidence}, i) => {
      if (!label?.trim() || !value?.trim()) fail(`${service}: a fact needs a label and a value`)
      if (!evidence || !loose(sourceText(service, doc, source)).includes(loose(evidence))) fail(`${service}: "${evidence}" is not in ${source}`)
      return {_type: 'glanceFact', _key: `fact${i}`, label, value, ...(detail?.trim() ? {detail} : {})}
    })
  }

  for (const [service, {text, evidence}] of Object.entries(data.quickAnswers.answers)) {
    const doc = bySlug('service', service)
    const body = loose(blockText(doc.body))
    if (!text?.trim() || PRICE.test(text)) fail(`quickAnswers ${service}: empty, or names a price`)
    if (words(text) < 25 || words(text) > 60) fail(`quickAnswers ${service}: ${words(text)} words; keep it to 25–60`)
    if (!evidence?.length) fail(`quickAnswers ${service}: list the body phrases the answer restates`)
    for (const phrase of evidence) if (!body.includes(loose(phrase))) fail(`quickAnswers ${service}: "${phrase}" is not in the body`)
    doc.quickAnswer = text
  }

  for (const [i, {service, block, post}] of data.bodyLinks.links.entries()) {
    const doc = bySlug('service', service)
    const target = bySlug('post', post)
    const matches = (doc.body ?? []).filter((b) => b._type === 'block' && blockText([b]) === block)
    if (matches.length !== 1) fail(`bodyLinks ${service}: "${block}" matches ${matches.length} blocks, not 1`)
    const [b] = matches
    const key = `postlink${i}`
    b.markDefs = [...(b.markDefs ?? []), {_key: key, _type: 'link', href: `/blog-posts/${post}`}]
    b.children = [...b.children, {_type: 'span', _key: `${key}-sp`, text: ' ', marks: []}, {_type: 'span', _key: `${key}-t`, text: target.title, marks: [key]}]
  }

  for (const {post, location, faq, text, from, to} of data.linkFixes.fixes) {
    const where = post ?? location ?? faq
    const doc = post ? bySlug('post', post) : location ? bySlug('location', location) : (docs.find((d) => d._type === 'faq' && d.question === faq) ?? fail(`linkFixes: no faq "${faq}"`))
    const blocks = ((faq ? doc.answer : doc.body) ?? []).filter((b) => b._type === 'block')
    const hits = blocks.flatMap((b) =>
      (b.markDefs ?? [])
        .filter((m) => m._type === 'link' && m.href === from)
        .filter((m) => (b.children ?? []).filter((c) => c.marks?.includes(m._key)).map((c) => c.text).join('') === text)
        .map((m) => ({block: b, def: m})),
    )
    if (hits.length !== 1) fail(`linkFixes ${where}: "${text}" → ${from} matches ${hits.length} links, not 1`)
    const [{block, def}] = hits
    if (to) def.href = to
    else {
      // a dead citation with no current page: the words stay, the link goes
      block.markDefs = block.markDefs.filter((m) => m !== def)
      for (const c of block.children ?? []) if (c.marks?.includes(def._key)) c.marks = c.marks.filter((m) => m !== def._key)
    }
  }

  const categorized = new Map()
  for (const [categorySlug, posts] of Object.entries(data.postCategories.byCategory)) {
    const category = bySlug('postCategory', categorySlug)
    for (const slug of posts) {
      if (categorized.has(slug)) fail(`postCategories: ${slug} is in ${categorized.get(slug)} and ${categorySlug}`)
      categorized.set(slug, categorySlug)
      bySlug('post', slug).category = {_type: 'reference', _ref: category._id}
    }
  }

  for (const {post, find, replace} of data.textFixes.fixes) {
    const spans = (bySlug('post', post).body ?? []).flatMap((b) => (b._type === 'block' ? (b.children ?? []) : [])).filter((c) => c.text?.includes(find))
    const count = spans.reduce((n, c) => n + c.text.split(find).length - 1, 0)
    if (count !== 1) fail(`${post}: "${find}" occurs ${count} times in the body, not once`)
    spans[0].text = spans[0].text.replace(find, replace)
  }

  for (const {type, slug, text, image} of data.bodyRemovals.removals) {
    if (!text === !image) fail(`bodyRemovals ${slug}: name the block by its text or its image, not both`)
    const doc = bySlug(type, slug)
    const isTarget = (b) => (text ? b._type === 'block' && blockText([b]) === text : b._type === 'figure' && b._sanityAsset === `image@${image}`)
    const hits = (doc.body ?? []).filter(isTarget).length
    if (hits !== 1) fail(`bodyRemovals ${slug}: "${text ?? image}" matches ${hits} blocks, not 1`)
    doc.body = doc.body.filter((b) => !isTarget(b))
  }

  for (const {post, image, alt} of data.figureAlts.alts) {
    if (!alt?.trim() || /^__wf_/.test(alt)) fail(`figureAlts ${post}: give the alt text`)
    const hits = (bySlug('post', post).body ?? []).filter((b) => b._type === 'figure' && b._sanityAsset === `image@${image}`)
    if (hits.length !== 1) fail(`figureAlts ${post}: ${image} matches ${hits.length} figures, not 1`)
    if (hits[0].alt) fail(`figureAlts ${post}: the figure already has alt text "${hits[0].alt}"`)
    hits[0].alt = alt
  }

  // a block whose only text is the SEO tool's marker is not content
  const MARKER = /^sbb-itb-[0-9a-f]{7}$/
  const markers = []
  for (const doc of docs.filter((d) => d._type === 'post' && Array.isArray(d.body))) {
    const kept = doc.body.filter((b) => !(b._type === 'block' && MARKER.test(blockText([b]).trim())))
    if (kept.length !== doc.body.length) markers.push(doc.slug.current)
    doc.body = kept
  }

  report.cmsTemplates = {
    source: DATA,
    featuredPosts: data.featuredPosts.slugs.length,
    serviceImages: data.serviceImages.map((s) => s.service),
    serviceAlts: Object.keys(data.serviceAlts.alts),
    postAlts: Object.keys(data.postAlts.alts),
    atAGlance: Object.keys(data.atAGlance),
    quickAnswers: Object.keys(data.quickAnswers.answers),
    bodyEdits: edited,
    bodyLinks: data.bodyLinks.links.map((l) => `${l.service} → ${l.post}`),
    linkFixes: data.linkFixes.fixes.map((f) => `${f.post ?? f.location ?? f.faq}: "${f.text}" → ${f.to ?? '(link removed)'}`),
    postCategories: Object.fromEntries(Object.entries(data.postCategories.byCategory).map(([c, posts]) => [c, posts.length])),
    textFixes: data.textFixes.fixes.map((f) => `${f.post}: ${f.replace}`),
    bodyRemovals: data.bodyRemovals.removals.map((r) => `${r.slug}: ${r.text ?? r.image}`),
    figureAlts: data.figureAlts.alts.map((a) => `${a.post}: ${a.alt}`),
    markersRemovedFrom: markers,
  }
}

/**
 * The "posts" stage: post.quickAnswer from the data (40–60 words, every evidence phrase in the body as it ships,
 * no price), then the check that no post's quick-answer box (its quickAnswer, else its excerpt, as the template
 * falls back) repeats the opening right under it: the whole box text, or its first sentence of five words or
 * more, inside the body's first two blocks, with case, punctuation and apostrophes ignored. An opening heading
 * that only repeats the title is skipped, as the template drops it.
 */
function postQuickAnswers(docs, data, bySlug, fail, report) {
  const {answers} = data.postQuickAnswers
  for (const [post, {text, evidence}] of Object.entries(answers)) {
    const doc = bySlug('post', post)
    const body = loose(blockText(doc.body))
    if (!text?.trim() || PRICE.test(text)) fail(`postQuickAnswers ${post}: empty, or names a price`)
    if (words(text) < 40 || words(text) > 60) fail(`postQuickAnswers ${post}: ${words(text)} words; keep it to 40–60`)
    if (!evidence?.length) fail(`postQuickAnswers ${post}: list the body phrases the answer restates`)
    for (const phrase of evidence) if (!body.includes(loose(phrase))) fail(`postQuickAnswers ${post}: "${phrase}" is not in the body`)
    doc.quickAnswer = text
  }
  const norm = (s) => ` ${s.toLowerCase().replace(/[‘’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `
  const repeats = []
  for (const doc of docs.filter((d) => d._type === 'post')) {
    const shown = doc.quickAnswer || doc.excerpt || doc.seo?.description
    if (!shown) continue
    let blocks = (doc.body ?? []).filter((b) => b._type === 'block')
    if (/^h[1-6]$/.test(blocks[0]?.style ?? '') && norm(blockText(blocks.slice(0, 1))) === norm(doc.title ?? '')) blocks = blocks.slice(1)
    const opening = norm(blockText(blocks.slice(0, 2)))
    const first = norm(shown.split(/(?<=[.!?])\s/)[0])
    if (opening.includes(norm(shown)) || (first.trim().split(' ').length >= 5 && opening.includes(first))) repeats.push(doc.slug.current)
  }
  if (repeats.length) fail(`postQuickAnswers: the quick answer (else the excerpt) repeats the opening of ${repeats.join(', ')}; give each a quick answer that sums up the post`)
  report.cmsTemplates.postQuickAnswers = Object.keys(answers)
}

/**
 * Replaces `find` (exactly once in the body's text, inside one block) with plain text.
 * Spans the edit covers are trimmed or dropped; a linked span may not be touched, so
 * every link survives.
 */
function editBody(doc, find, replace, fail) {
  const blocks = (doc.body ?? []).filter((b) => b._type === 'block')
  const hits = blocks.filter((b) => blockText([b]).includes(find))
  const count = blocks.reduce((n, b) => n + blockText([b]).split(find).length - 1, 0)
  if (count !== 1) fail(`"${find}" occurs ${count} times, not once`)
  const block = hits[0]
  const links = new Set((block.markDefs ?? []).filter((m) => m._type === 'link').map((m) => m._key))
  const start = blockText([block]).indexOf(find)
  const end = start + find.length
  const children = []
  let at = 0
  let inserted = false
  const insert = () => {
    if (!inserted && replace) children.push({_type: 'span', _key: `${block._key}-edit${start}`, text: replace, marks: []})
    inserted = true
  }
  for (const span of block.children ?? []) {
    const text = span.text ?? ''
    const [from, to] = [at, at + text.length]
    at = to
    if (to <= start || from >= end) {
      if (from >= end) insert()
      children.push(span)
      continue
    }
    if (span.marks?.some((m) => links.has(m))) fail(`"${find}" cuts through the link "${text}"`)
    const before = text.slice(0, Math.max(0, start - from))
    const after = text.slice(Math.max(0, end - from))
    if (before) children.push({...span, text: before})
    if (to >= end) {
      insert()
      if (after) children.push({...span, _key: `${span._key}-rest`, text: after})
    }
  }
  insert()
  block.children = children
}
