// Service pages added after the Webflow export, and copy added to existing service bodies,
// from migration/content-data/new-services.json (README.md section 14 there; decision D18).
//
//   services     new service documents (name, slug, category, short description, body, own
//                questions, order), built the way the export's services are: the body and
//                answers are HTML converted with the same toPortableText, so their links are
//                normalized and checked like every other body
//   bodyInserts  blocks added to an existing service body, before a named heading
//   names        a service's name (its menu label, card title and breadcrumb), with the name
//                it replaces
//
// The first stage (no name) runs first and adds the services, so fixes (relations), cms-templates (photos, quick answers, at-a-glance facts
// and the no-price check), internal-links and titles-meta (the approved title, meta and H1 of
// each new page) treat these documents like the others. The "inserts" stage runs after cms-templates,
// once the copy edits that name service blocks by position are in, and adds the body blocks and the
// names. The module stops when a slug is taken
// or listed twice, a category, service or heading is missing, a name is not the one it says it
// replaces, or any new text names a price or a 24/7 claim. It sets no title, meta description,
// H1 or slug of an existing page.

const DATA = 'migration/content-data/new-services.json'
const PRICE = /\$\s?\d/
const BANNED = /24\s*\/\s*7|around the clock|emergency service/i

const blockText = (b) => (b.children ?? []).map((c) => c.text ?? '').join('')

/** Portable Text from HTML with every key prefixed, so inserted blocks never share a key with the body they join. */
function blocksFrom(ctx, html, path, prefix) {
  const blocks = ctx.toPortableText(html, path) ?? []
  return blocks.map((b, i) => {
    const key = `${prefix}${i}`
    const marks = new Map((b.markDefs ?? []).map((m, j) => [m._key, `${key}m${j}`]))
    return {
      ...b,
      _key: key,
      ...(b.markDefs ? {markDefs: b.markDefs.map((m) => ({...m, _key: marks.get(m._key)}))} : {}),
      ...(b.children ? {children: b.children.map((c, j) => ({...c, _key: `${key}s${j}`, marks: (c.marks ?? []).map((m) => marks.get(m) ?? m)}))} : {}),
    }
  })
}

export default async function newServices(ctx, stage) {
  const {docs, push, idFor, readJson, report} = ctx
  const data = await readJson(DATA)
  const fail = (msg) => {
    throw new Error(`${DATA}: ${msg}`)
  }
  const bySlug = (type, slug) => docs.find((d) => d._type === type && d.slug?.current === slug)
  const checkText = (where, text) => {
    if (PRICE.test(text)) fail(`${where} names a price; service pages show none (link the cost guide)`)
    if (BANNED.test(text)) fail(`${where} claims 24/7 or emergency service`)
  }

  // The copy edits name service blocks by position (content-edits.mjs, "body[17]"), so blocks are inserted only
  // after they have run (the "inserts" stage, after cms-templates); the heading is named as it then reads.
  if (stage === 'inserts') return insertBlocks(ctx, data, bySlug, fail, checkText)

  const added = []
  const seen = new Set()
  for (const s of data.services) {
    if (seen.has(s.slug)) fail(`${s.slug} is listed twice`)
    seen.add(s.slug)
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug)) fail(`${s.slug}: not a URL slug`)
    if (bySlug('service', s.slug)) fail(`${s.slug}: a service with this slug already exists`)
    if (ctx.live(`/services/${s.slug}`)) fail(`${s.slug}: /services/${s.slug} is a live page in migration/seo-baseline.json, so it is not new`)
    const category = bySlug('serviceCategory', s.category) ?? fail(`${s.slug}: no service category "${s.category}"`)
    if (!s.name?.trim() || !s.shortDescription?.trim() || !s.body?.length) fail(`${s.slug}: needs a name, a short description and a body`)
    if (!Number.isFinite(s.order)) fail(`${s.slug}: order must be a number`)
    const path = `/services/${s.slug}`
    const body = blocksFrom(ctx, s.body.join(''), path, 'n')
    const faqs = (s.faqs ?? []).map((f, i) => ({_type: 'faqItem', _key: `faq${i}`, question: f.question, answer: blocksFrom(ctx, f.answer, path, `faq${i}b`)}))
    if (faqs.length && (faqs.length < 3 || faqs.length > 5)) fail(`${s.slug}: list 3 to 5 questions of its own`)
    for (const text of [s.shortDescription, ...body.map(blockText)]) checkText(`${s.slug} body`, text)
    for (const f of faqs) checkText(`${s.slug} "${f.question}"`, [f.question, ...f.answer.map(blockText)].join(' '))
    push({
      _id: idFor(`service:new:${s.slug}`),
      _type: 'service',
      name: s.name,
      slug: {_type: 'slug', current: s.slug},
      category: {_type: 'reference', _ref: category._id},
      shortDescription: s.shortDescription,
      body,
      ...(faqs.length ? {faqs} : {}),
      order: s.order,
    })
    added.push(s.slug)
  }

  report.newServices = {source: DATA, added}
}

function insertBlocks(ctx, data, bySlug, fail, checkText) {
  const {report} = ctx
  const inserted = []
  for (const [n, {service, before, body}] of data.bodyInserts.entries()) {
    const doc = bySlug('service', service) ?? fail(`bodyInserts: no service "${service}"`)
    const at = (doc.body ?? []).findIndex((b) => b._type === 'block' && /^h\d$/.test(b.style ?? '') && blockText(b) === before)
    if (at < 0) fail(`bodyInserts ${service}: no heading "${before}" in its body`)
    if ((doc.body ?? []).filter((b) => blockText(b) === before).length !== 1) fail(`bodyInserts ${service}: "${before}" occurs more than once`)
    const blocks = blocksFrom(ctx, body.join(''), `/services/${service}`, `ins${n}b`)
    for (const b of blocks) checkText(`bodyInserts ${service}`, blockText(b))
    doc.body.splice(at, 0, ...blocks)
    inserted.push(`${service}: ${blocks.length} blocks before "${before}"`)
  }

  for (const {service, was, name} of data.names) {
    const doc = bySlug('service', service) ?? fail(`names: no service "${service}"`)
    if (doc.name !== was) fail(`names ${service}: the name is "${doc.name}", not "${was}"`)
    // the H1 falls back to the name: it must already come from heading (titles-meta sets it) or stay put
    doc.name = name
  }

  report.newServices = {...report.newServices, inserted, renamed: data.names.map((r) => `${r.service}: ${r.was} -> ${r.name}`)}
}
