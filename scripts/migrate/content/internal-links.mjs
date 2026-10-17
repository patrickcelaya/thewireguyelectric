// Contextual internal links, from migration/content-data/internal-links.json (README.md
// section 12 there): post → service, service → post, city → service and post → post, each a
// link mark on words already in a body. No word changes.
//
// Each entry names the document (type:slug), the block (_key), the anchor and the target.
// The anchor is found by its text in that block after the copy edits (so it reads as the
// page does), the spans it covers are split and the middle ones get the link. An entry
// with `from` moves an existing link instead (its words must be exactly the anchor).
//
// The module stops when an anchor occurs other than exactly once in its block, the block is
// a heading or a quote, the anchor overlaps a link, the body already links the target, a
// post would get more than 3 new service links, or the block's text changes.
//
// Runs after the copy edits (content-edits late), which never touch linked words.

const DATA = 'migration/content-data/internal-links.json'
const MAX_SERVICE_LINKS = 3

const blockText = (b) => (b.children ?? []).map((c) => c.text ?? '').join('')

export default async function internalLinks(ctx) {
  const {docs, readJson, report} = ctx
  const {links} = await readJson(DATA)
  const fail = (entry, msg) => {
    throw new Error(`${DATA} ${entry.doc} ${entry.block} "${entry.anchor}": ${msg}`)
  }
  const added = new Map()
  const serviceLinks = new Map()
  let moved = 0

  for (const entry of links) {
    const [type, slug] = entry.doc.split(':')
    const doc = docs.find((d) => d._type === type && d.slug?.current === slug) ?? fail(entry, 'no such document')
    const block = (doc.body ?? []).find((b) => b._key === entry.block) ?? fail(entry, 'no such block')
    if (block._type !== 'block' || /^(h\d|blockquote)$/.test(block.style ?? 'normal')) fail(entry, `block is a ${block.style ?? block._type}, not body text`)
    const linkKeys = new Set((block.markDefs ?? []).filter((m) => m._type === 'link').map((m) => m._key))
    const bodyHrefs = (doc.body ?? []).flatMap((b) => (b.markDefs ?? []).filter((m) => m._type === 'link').map((m) => m.href))
    if (bodyHrefs.includes(entry.href)) fail(entry, `the body already links ${entry.href}`)
    const before = blockText(block)

    if (entry.from) {
      const hits = (block.markDefs ?? []).filter(
        (m) => linkKeys.has(m._key) && m.href === entry.from && (block.children ?? []).filter((c) => c.marks?.includes(m._key)).map((c) => c.text).join('') === entry.anchor,
      )
      if (hits.length !== 1) fail(entry, `matches ${hits.length} links to ${entry.from}, not 1`)
      hits[0].href = entry.href
      moved++
      continue
    }

    const count = before.split(entry.anchor).length - 1
    if (count !== 1) fail(entry, `occurs ${count} times in the block, not once`)
    const start = before.indexOf(entry.anchor)
    const end = start + entry.anchor.length
    const key = `ilink${(block.markDefs ?? []).length}`
    if ((block.markDefs ?? []).some((m) => m._key === key)) fail(entry, `mark key ${key} is taken`)

    // split the spans at the anchor's edges; the spans inside it get the link
    const children = []
    let at = 0
    for (const span of block.children ?? []) {
      const text = span.text ?? ''
      const [from, to] = [at, at + text.length]
      at = to
      if (to <= start || from >= end) {
        children.push(span)
        continue
      }
      if (span.marks?.some((m) => linkKeys.has(m))) fail(entry, `overlaps the link "${text}"`)
      const cuts = [from, Math.max(from, start), Math.min(to, end), to]
      const pieces = [
        [cuts[0], cuts[1], false],
        [cuts[1], cuts[2], true],
        [cuts[2], cuts[3], false],
      ].filter(([a, b]) => b > a)
      pieces.forEach(([a, b, linked], i) =>
        children.push({...span, _key: i ? `${span._key}-${key}-${i}` : span._key, text: text.slice(a - from, b - from), marks: linked ? [...(span.marks ?? []), key] : (span.marks ?? [])}),
      )
    }
    block.children = children
    block.markDefs = [...(block.markDefs ?? []), {_key: key, _type: 'link', href: entry.href}]
    if (blockText(block) !== before) fail(entry, 'internal: the block text changed')

    added.set(entry.doc, (added.get(entry.doc) ?? 0) + 1)
    if (type === 'post' && entry.href.startsWith('/services/')) {
      const n = (serviceLinks.get(entry.doc) ?? 0) + 1
      if (n > MAX_SERVICE_LINKS) fail(entry, `more than ${MAX_SERVICE_LINKS} new service links in one post`)
      serviceLinks.set(entry.doc, n)
    }
  }

  report.internalLinks = {source: DATA, added: [...added.values()].reduce((a, b) => a + b, 0), documents: added.size, moved}
}
