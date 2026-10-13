// Real customer reviews as crawlable content.
//
// migration/reviews/google-reviews.json holds every review the live site's
// BrightLocal "Showcase Reviews" widget shows, copied verbatim (see its
// `provenance`). This pushes one `review` document per review, unless the JSON
// marks it `excludedFromSanity` (directory snippets the widget truncates, or a
// source the review schema does not list). Review text is never edited here.
//
// Location and service references are resolved by slug from the documents built
// earlier in this run. The JSON keeps the matched phrase that justifies each tag.

const DATA = 'migration/reviews/google-reviews.json'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function reviews(ctx) {
  const {docs, push, idFor, readJson, report} = ctx
  const data = await readJson(DATA)

  const bySlug = (type, slug) => docs.find((d) => d._type === type && d.slug?.current === slug)
  const unresolved = []
  const refTo = (type, tag, review) => {
    if (!tag?.slug) return undefined
    if (tag.evidence && !review.text.includes(tag.evidence)) {
      throw new Error(`${DATA}: ${review.key}: ${type} evidence is not in the review text: ${tag.evidence}`)
    }
    const doc = bySlug(type, tag.slug)
    if (!doc) {
      unresolved.push({review: review.key, type, slug: tag.slug})
      return undefined
    }
    return {_type: 'reference', _ref: doc._id}
  }

  const keys = new Set()
  const pushed = []
  const skipped = []
  for (const r of data.reviews) {
    if (r.excludedFromSanity) {
      skipped.push({review: r.key, reason: r.excludedFromSanity})
      continue
    }
    // Rating-only reviews have nothing to show.
    if (!r.text?.trim()) {
      skipped.push({review: r.key, reason: 'no text'})
      continue
    }
    if (!r.key?.startsWith(`review:${r.source.toLowerCase()}:`)) throw new Error(`${DATA}: bad key ${r.key}`)
    if (keys.has(r.key)) throw new Error(`${DATA}: duplicate review ${r.key}`)
    keys.add(r.key)
    if (!r.authorName) throw new Error(`${DATA}: ${r.key}: missing authorName`)
    if (!Number.isInteger(r.rating) || r.rating < 1 || r.rating > 5) throw new Error(`${DATA}: ${r.key}: bad rating ${r.rating}`)
    if (r.date && !ISO_DATE.test(r.date)) throw new Error(`${DATA}: ${r.key}: bad date ${r.date}`)

    const doc = {
      _id: idFor(r.key),
      _type: 'review',
      authorName: r.authorName,
      rating: r.rating,
      text: r.text,
      date: r.date,
      source: r.source,
      sourceUrl: r.sourceUrl,
      location: refTo('location', r.location, r),
      service: refTo('service', r.service, r),
      featured: Boolean(r.featured),
    }
    push(doc)
    pushed.push(doc)
  }

  if (unresolved.length) console.warn(`reviews: ${unresolved.length} tag(s) point at a missing document and were left empty`, unresolved)
  report.reviews = {
    source: DATA,
    widgetTotal: data.widget?.displayedTotal,
    pushed: pushed.length,
    featured: pushed.filter((d) => d.featured).length,
    withLocation: pushed.filter((d) => d.location).length,
    withService: pushed.filter((d) => d.service).length,
    skipped,
    unresolved,
  }
}
