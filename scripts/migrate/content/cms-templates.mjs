// Content the CMS templates (city, service and post pages) show, from
// migration/content-data/cms-templates.json:
//
//   featuredPosts   post.featured on the most-read guides (Search Console), so guide
//                   lists on city and service pages lead with them
//   serviceImages   a service's main image replaced by the crew's own photo of that work
//                   where the export had a stock photo (the asset must be in the dataset)
//   serviceAlts     alt text for the services' own photos (all were empty)
//   atAGlance       service.atAGlance facts (with an optional supporting line); each one
//                   quotes its evidence, which must be word for word in the service body
//                   or the named /faq answer
//   quickAnswers    service.quickAnswer, the "short version" line; every evidence phrase
//                   must be in the service body, and no answer may name a price
//   bodyEdits       dollar ranges taken out of service bodies (owner rule); each `find`
//                   must occur exactly once and may not cut through a link, and no
//                   service body may name a price afterwards
//   bodyLinks       a post linked, by its own title, at the end of a service body's block
//   linkFixes       estimate links in post bodies that the "free estimate" phrase rule
//                   misses, sent to /estimate
//   postCategories  post.category for the blog topic pages
//
//   textFixes       typing slips in a post body ("afternoon?The"); each must occur exactly
//                   once in that post's text
//
// It also drops the SEO tool's tracking markers ("sbb-itb-f8419aa") that the Webflow
// export carried into a post body as a heading of their own.
//
// Runs after page-sections. Titles, H1s, meta descriptions and slugs are never touched.

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

export default async function cmsTemplates(ctx) {
  const {docs, readJson, report} = ctx
  const data = await readJson(DATA)
  const fail = (msg) => {
    throw new Error(`${DATA}: ${msg}`)
  }
  const bySlug = (type, slug) => docs.find((d) => d._type === type && d.slug?.current === slug) ?? fail(`no ${type} with slug "${slug}"`)

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

  // Price edits first, so glance facts and quick answers are checked against the final body.
  const edited = []
  for (const {service, find, replace} of data.bodyEdits.edits) {
    editBody(bySlug('service', service), find, replace, (msg) => fail(`bodyEdits ${service}: ${msg}`))
    edited.push(service)
  }
  for (const doc of docs.filter((d) => d._type === 'service')) {
    const priced = blockText(doc.body).split('\n').find((line) => PRICE.test(line))
    if (priced) fail(`bodyEdits: ${doc.slug.current} still names a price in its body: "${priced.slice(0, 120)}…"`)
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

  for (const {post, text, from, to} of data.linkFixes.fixes) {
    const blocks = (bySlug('post', post).body ?? []).filter((b) => b._type === 'block')
    const hits = blocks.flatMap((b) =>
      (b.markDefs ?? [])
        .filter((m) => m._type === 'link' && m.href === from)
        .filter((m) => (b.children ?? []).filter((c) => c.marks?.includes(m._key)).map((c) => c.text).join('') === text),
    )
    if (hits.length !== 1) fail(`linkFixes ${post}: "${text}" → ${from} matches ${hits.length} links, not 1`)
    hits[0].href = to
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
    atAGlance: Object.keys(data.atAGlance),
    quickAnswers: Object.keys(data.quickAnswers.answers),
    bodyEdits: edited,
    bodyLinks: data.bodyLinks.links.map((l) => `${l.service} → ${l.post}`),
    linkFixes: data.linkFixes.fixes.map((f) => `${f.post}: "${f.text}" → ${f.to}`),
    postCategories: Object.fromEntries(Object.entries(data.postCategories.byCategory).map(([c, posts]) => [c, posts.length])),
    textFixes: data.textFixes.fixes.map((f) => `${f.post}: ${f.replace}`),
    markersRemovedFrom: markers,
  }
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
