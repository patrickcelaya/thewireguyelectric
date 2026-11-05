// Blog posts written after the Webflow export, from migration/content-data/new-posts.json (README.md
// section 15 there). The last content module: the posts arrive complete (title, meta, quick answer,
// related services, cover photo), so no earlier module needs to know about them.
//
//   posts   slug, title (the H1), seoTitle (the title tag before " | The Wire Guy"), seoDescription,
//           excerpt (cards), quickAnswer (40-60 words), relatedServices (service slugs, the first is
//           the primary), publishedAt, photo (a company photo's name in web/src/lib/library-photos.json),
//           body (HTML, converted with the same toPortableText as every other body), sources (where
//           each fact was checked)
//
// The module stops when a slug is taken, live in the SEO baseline or removed, a service or photo is
// missing, a quick answer is outside 40-60 words or repeats the title or the opening, the text names
// a price or a 24/7 claim, an internal link points at a page this dataset doesn't build, or a fact
// has no source. It changes no existing document.

import {blocksFrom} from './new-services.mjs'

const DATA = 'migration/content-data/new-posts.json'
const PHOTOS = 'web/src/lib/library-photos.json'
const PRICE = /\$\s?\d/
const BANNED = /24\s*\/\s*7|around the clock|emergency service|same[- ]day/i
const ROUTE = {service: '/services/', post: '/blog-posts/', location: '/locations/', serviceCategory: '/services-categories/'}

const blockText = (b) => (b.children ?? []).map((c) => c.text ?? '').join('')
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

export default async function newPosts(ctx) {
  const {docs, push, idFor, readJson, live, report} = ctx
  const data = await readJson(DATA)
  const photos = await readJson(PHOTOS)
  const removed = new Set((await readJson('migration/content-data/removed-posts.json')).posts.map((r) => r.slug))
  const fail = (msg) => {
    throw new Error(`${DATA}: ${msg}`)
  }
  const bySlug = (type, slug) => docs.find((d) => d._type === type && d.slug?.current === slug)
  const built = new Set(['/', '/estimate', ...docs.filter((d) => d.slug?.current && (ROUTE[d._type] || d._type === 'page')).map((d) => (d._type === 'page' ? `/${d.slug.current}` : ROUTE[d._type] + d.slug.current))])
  for (const p of data.posts) built.add(`/blog-posts/${p.slug}`)

  const added = []
  for (const p of data.posts) {
    const path = `/blog-posts/${p.slug}`
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug)) fail(`${p.slug}: not a URL slug`)
    if (bySlug('post', p.slug) || added.includes(p.slug)) fail(`${p.slug}: a post with this slug already exists`)
    if (live(path) || removed.has(p.slug)) fail(`${p.slug}: ${path} was a page on the old site; pick a new slug`)
    for (const k of ['title', 'seoTitle', 'seoDescription', 'excerpt', 'quickAnswer', 'publishedAt', 'photo']) if (!p[k]?.trim()) fail(`${p.slug}: needs ${k}`)
    if (`${p.seoTitle} | The Wire Guy`.length > 70) fail(`${p.slug}: the title tag "${p.seoTitle} | The Wire Guy" is over 70 characters`)
    if (p.seoDescription.length < 120 || p.seoDescription.length > 160) fail(`${p.slug}: the meta description is ${p.seoDescription.length} characters (120-160)`)
    if (Number.isNaN(Date.parse(p.publishedAt))) fail(`${p.slug}: publishedAt is not a date`)
    if (!p.sources?.length || p.sources.some((s) => !s.claim?.trim() || !/^https:\/\//.test(s.url ?? ''))) fail(`${p.slug}: list the source of each fact (claim and https URL)`)

    const body = blocksFrom(ctx, p.body.join(''), path, 'p')
    const opening = blockText(body.find((b) => b.style === 'normal') ?? {})
    const qa = words(p.quickAnswer)
    if (qa < 40 || qa > 60) fail(`${p.slug}: the quick answer is ${qa} words (40-60)`)
    if (norm(p.quickAnswer).includes(norm(p.title)) || norm(opening).startsWith(norm(p.quickAnswer).split(' ').slice(0, 8).join(' '))) fail(`${p.slug}: the quick answer repeats the title or the opening`)
    for (const text of [p.title, p.seoTitle, p.seoDescription, p.excerpt, p.quickAnswer, ...body.map(blockText)]) {
      if (PRICE.test(text)) fail(`${p.slug}: names a price ("${text.slice(0, 60)}…"); link the cost guide instead`)
      if (BANNED.test(text)) fail(`${p.slug}: claims 24/7, emergency or same-day service ("${text.slice(0, 60)}…")`)
    }
    for (const b of body) for (const m of b.markDefs ?? []) {
      if (m._type !== 'link' || !m.href?.startsWith('/')) continue
      if (!built.has(m.href.split(/[?#]/)[0])) fail(`${p.slug}: links to ${m.href}, which is not a page in the dataset`)
    }

    const services = (p.relatedServices ?? []).map((s) => bySlug('service', s) ?? fail(`${p.slug}: no service "${s}"`))
    if (!services.length || services.length > 3) fail(`${p.slug}: list 1 to 3 related services`)
    const photo = photos.find((ph) => ph.name === p.photo) ?? fail(`${p.slug}: no photo named "${p.photo}" in ${PHOTOS}`)
    const width = Number(photo.id.match(/-(\d+)x\d+-[a-z0-9]+$/)?.[1])
    if (!(width >= 1200)) fail(`${p.slug}: ${p.photo} is ${width} px wide; a shown image is at least 1,200 px`)

    push({
      _id: idFor(`post:new:${p.slug}`),
      _type: 'post',
      title: p.title,
      slug: {_type: 'slug', current: p.slug},
      excerpt: p.excerpt,
      quickAnswer: p.quickAnswer,
      mainImage: {_type: 'image', asset: {_type: 'reference', _ref: photo.id}, alt: p.photoAlt ?? photo.alt},
      showMainImage: true,
      body,
      publishedAt: new Date(p.publishedAt).toISOString(),
      featured: false,
      relatedServices: services.map((s) => ({_type: 'reference', _ref: s._id, _key: s.slug.current})),
      seo: {_type: 'seo', title: `${p.seoTitle} | The Wire Guy`, description: p.seoDescription},
    })
    added.push(p.slug)
  }
  report.newPosts = {source: DATA, added}
}
