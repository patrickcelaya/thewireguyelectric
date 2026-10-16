// Content the CMS templates (city, service and post pages) show, from
// migration/content-data/cms-templates.json:
//
//   featuredPosts   post.featured on the most-read guides (Search Console), so guide
//                   lists on city and service pages lead with them
//   serviceImages   a service's main image replaced by the crew's own photo of that work
//                   where the export had a stock photo (the asset must be in the dataset)
//   serviceAlts     alt text for the services' own photos (all were empty)
//   atAGlance       service.atAGlance facts; each one quotes its evidence, which must be
//                   word for word in the service body or the named /faq answer
//
// It also drops the SEO tool's tracking markers ("sbb-itb-f8419aa") that the Webflow
// export carried into a post body as a heading of their own.
//
// Runs after page-sections. Titles, H1s, meta descriptions and slugs are never touched.

const DATA = 'migration/content-data/cms-templates.json'

const blockText = (blocks = []) =>
  blocks
    .filter((b) => b._type === 'block')
    .map((b) => (b.children ?? []).map((c) => c.text ?? '').join(''))
    .join('\n')

export default async function cmsTemplates(ctx) {
  const {docs, readJson, report} = ctx
  const data = await readJson(DATA)
  const fail = (msg) => {
    throw new Error(`${DATA}: ${msg}`)
  }
  const bySlug = (type, slug) => docs.find((d) => d._type === type && d.slug?.current === slug) ?? fail(`no ${type} with slug "${slug}"`)

  for (const slug of data.featuredPosts.slugs) bySlug('post', slug).featured = true

  for (const {service, asset, alt} of data.serviceImages) {
    if (!docs.some((d) => d._type === 'sanity.imageAsset' && d._id === asset)) fail(`${service}: image asset ${asset} is not in the dataset`)
    if (!alt?.trim()) fail(`${service}: the replacement image needs alt text`)
    bySlug('service', service).mainImage = {_type: 'image', asset: {_type: 'reference', _ref: asset}, alt}
  }

  for (const [service, alt] of Object.entries(data.serviceAlts.alts)) {
    const doc = bySlug('service', service)
    if (!doc.mainImage) fail(`${service}: has no main image to describe`)
    doc.mainImage = {...doc.mainImage, alt}
  }

  for (const [service, facts] of Object.entries(data.atAGlance)) {
    const doc = bySlug('service', service)
    doc.atAGlance = facts.map(({label, value, source, evidence}, i) => {
      if (!label?.trim() || !value?.trim()) fail(`${service}: a fact needs a label and a value`)
      const question = source.startsWith('faq:') ? source.slice(4) : undefined
      const faq = question && docs.find((d) => d._type === 'faq' && d.question === question)
      if (question && !faq) fail(`${service}: no faq "${question}"`)
      const text = faq ? blockText(faq.answer) : source === 'body' ? blockText(doc.body) : fail(`${service}: unknown source "${source}"`)
      if (!evidence || !text.includes(evidence)) fail(`${service}: "${evidence}" is not in ${source}`)
      return {_type: 'glanceFact', _key: `fact${i}`, label, value}
    })
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
    markersRemovedFrom: markers,
  }
}
