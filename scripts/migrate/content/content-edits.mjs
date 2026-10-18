// The launch copy pass (2026-10-17): the verified AI-slop edits and the lead's copy decisions, from
// migration/content-edits/ (README.md there explains each file):
//
//   pages.json  services.json  cities.json  posts-a.json  posts-b.json
//                   the verified edits (verdict accept, or amend with the amended text)
//   decisions.json  copy decisions D1 and D6, and D5's split of the one-block Ahwatukee body
//
// An edit names a document by _id, the field it changes and old_text → new_text:
//   - a string (a section heading, a card's text): old_text must occur exactly once in it, and a field the
//     edit empties is removed (empty means nothing);
//   - Portable Text (a body, an FAQ answer, a bio): old_text is matched against one block's text (its spans
//     joined); it must occur exactly once in the whole field, in the named block. The change happens inside
//     the spans: kept words keep their marks, new words take the bold/italic of the words they replace,
//     linked words (links, team mentions) never change, and a block the edits leave empty is dropped.
//     `format` sets the bold/italic of the new words where the verifier asked for a different layout.
// An edit with `skip` stays in the list with its reason but is not applied. Edits of kind "file" were made in
// the file itself (page-sections.mjs, the templates, content-data/); they are listed so the record is whole.
//
// The module runs three times, so every edit lands before the checks that read its text:
//   early    after fixes: FAQ answers and city bodies (local-facts then checks its neighbourhood quotes
//            against the city bodies, and cms-templates checks at-a-glance evidence in the FAQ answers)
//   service  from cms-templates, after the price edits and before the quick-answer and at-a-glance checks
//   late     last: page sections and team members (made by page-sections), Site settings (after
//            page-sections has compared its shared lists with the live copy, so the pages keep pointing at
//            them) and post bodies (written against the bodies cms-templates leaves)
// The late run fails if any edit was not applied. Titles, H1s, meta descriptions and slugs never change.

const DIR = 'migration/content-edits/'
const FILES = ['pages', 'services', 'cities', 'posts-a', 'posts-b', 'decisions']
const STAGES = {early: ['faq', 'location'], service: ['service'], late: ['page', 'siteSettings', 'teamMember', 'post']}

const blockText = (b) => (b.children ?? []).map((c) => c.text ?? '').join('')
const count = (text, find) => text.split(find).length - 1
// Spacing slips an edit could leave: a double space, a space at an edge or before punctuation.
const SLIPS = / {2}|^\s|\s$| [.,;:!?]/g
const slips = (s) => (s.match(SLIPS) ?? []).length

let loaded
async function load(readJson) {
  if (loaded) return loaded
  const edits = []
  const splits = []
  for (const name of FILES) {
    const data = await readJson(`${DIR}${name}.json`)
    for (const e of data.edits ?? []) edits.push({...e, file: name})
    for (const s of data.splits ?? []) splits.push({...s, file: name})
  }
  const ids = edits.map((e) => e.id)
  const dup = ids.find((id, i) => ids.indexOf(id) !== i)
  if (dup) throw new Error(`${DIR}: edit id ${dup} is listed twice`)
  loaded = {edits, splits, applied: new Set(), dropped: 0, byFile: {}}
  return loaded
}

export default async function contentEdits(ctx, stage) {
  const {docs, readJson, report} = ctx
  if (!STAGES[stage]) throw new Error(`content-edits: unknown stage "${stage}"`)
  const state = await load(readJson)
  const types = STAGES[stage]
  const byId = new Map(docs.map((d) => [d._id, d]))
  const before = seoSnapshot(docs)

  // Blocks an edit empties (block → the array holding it) are dropped once the stage's edits are in, so the
  // block numbers later edits name still point where they did.
  const emptied = new Map()
  for (const e of state.edits) {
    if (e.skip || e.target?.kind !== 'ndjson') continue
    const doc = byId.get(e.target.doc_id)
    const fail = (msg) => {
      throw new Error(`${DIR}${e.file}.json ${e.id}: ${msg}`)
    }
    if (!doc) fail(`no document ${e.target.doc_id}`)
    if (!types.includes(doc._type)) continue
    applyEdit(doc, e, emptied, fail)
    state.applied.add(e.id)
    state.byFile[e.file] = (state.byFile[e.file] ?? 0) + 1
  }
  for (const s of state.splits) {
    const doc = byId.get(s.target.doc_id)
    if (!doc || !types.includes(doc._type)) continue
    splitBlock(doc, s, (msg) => {
      throw new Error(`${DIR}${s.file}.json ${s.id}: ${msg}`)
    })
    state.applied.add(s.id)
  }
  for (const [block, field] of emptied) field.splice(field.indexOf(block), 1)
  state.dropped += emptied.size

  if (seoSnapshot(docs) !== before) throw new Error('content-edits: a title, H1, meta description or slug changed; copy edits must never do that')

  if (stage === 'late') {
    const missing = [...state.edits.filter((e) => !e.skip && e.target?.kind === 'ndjson'), ...state.splits].filter((e) => !state.applied.has(e.id))
    if (missing.length) throw new Error(`content-edits: ${missing.length} edit(s) never applied (no stage handles their document type): ${missing.map((e) => e.id).join(', ')}`)
    report.contentEdits = {
      source: DIR,
      applied: state.byFile,
      splits: state.splits.map((s) => s.id),
      blocksDropped: state.dropped,
      skipped: state.edits.filter((e) => e.skip).map((e) => e.id),
      inFiles: state.edits.filter((e) => !e.skip && e.target?.kind === 'file').map((e) => `${e.id} ${e.target.file}`),
    }
  }
}

// Every field that feeds a title, H1, meta description or URL (the same guard as fixes.mjs). A service's short
// description is its meta description only while seo.description is empty (lib/seo.ts resolveDescription);
// otherwise it is card and hero text, which copy edits may change.
const seoSnapshot = (docs) =>
  JSON.stringify(
    docs
      .filter((d) => ['location', 'service', 'post', 'page', 'serviceCategory', 'postCategory'].includes(d._type))
      .map((d) => [d._id, d.slug?.current, d.heading, d.title, d.cityNameForSeo, d.description, d.seo?.description?.trim() ? null : d.shortDescription, d.excerpt, d.seo]),
  )

/** The node a field path names ("sections[3].services[1].text", "body[17]", "answer[0]") and its parent. */
function resolve(doc, field, fail) {
  const steps = field.match(/[^.[\]]+|\[\d+\]/g) ?? fail(`bad field "${field}"`)
  let parent
  let key
  let node = doc
  for (const step of steps) {
    parent = node
    key = step.startsWith('[') ? Number(step.slice(1, -1)) : step
    node = parent?.[key]
    if (node === undefined) fail(`field "${field}" does not exist`)
  }
  return {parent, key, node}
}

function applyEdit(doc, e, emptied, fail) {
  const {old_text: find, new_text: replace = ''} = e
  if (!find) fail('old_text is empty')
  const {parent, key, node} = resolve(doc, e.target.field, fail)

  if (typeof node === 'string') {
    if (e.format) fail('format applies to Portable Text only')
    const n = count(node, find)
    if (n !== 1) fail(`"${find}" occurs ${n} times in ${e.target.field}, not once`)
    const next = node.replace(find, () => replace)
    if (slips(next) > slips(node)) fail(`leaves a spacing slip: "${next}"`)
    if (next.trim()) parent[key] = next
    else if (Array.isArray(parent)) fail('empties an item of a list of strings')
    else delete parent[key]
    return
  }

  // Portable Text: the field is the array of blocks; the block is named by _key or by its index.
  const blockNamed = node?._type === 'block' && Array.isArray(parent)
  const field = blockNamed ? parent : node
  if (!Array.isArray(field)) fail(`${e.target.field} is neither text nor Portable Text`)
  const blocks = field.filter((b) => b._type === 'block' && !emptied.has(b))
  const n = blocks.reduce((sum, b) => sum + count(blockText(b), find), 0)
  if (n !== 1) fail(`"${find}" occurs ${n} times in ${e.target.field}, not once`)
  const block = blocks.find((b) => blockText(b).includes(find))
  if (e.target.block_key && block._key !== e.target.block_key) fail(`found in block ${block._key}, not ${e.target.block_key}`)
  if (!e.target.block_key && blockNamed && block !== node) fail(`found in another block than ${e.target.field}`)
  const text = blockText(block)
  const start = text.indexOf(find)
  replaceInBlock(block, start, start + find.length, replace, e.format, fail)
  const after = blockText(block)
  if (!after.trim()) emptied.set(block, field)
  else if (slips(after) > slips(text)) fail(`leaves a spacing slip in block ${block._key}: "${after}"`)
}

// ---------------------------------------------------------------------------
// Portable Text: text changes inside the spans

/** The block as characters (UTF-16 units, as string offsets count them), each with its span's marks and key. */
function charsOf(block) {
  const out = []
  for (const span of block.children ?? []) {
    const text = span.text ?? ''
    for (let i = 0; i < text.length; i++) out.push({ch: text[i], marks: span.marks ?? [], key: span._key})
  }
  return out
}

/** Spans from characters: a new span starts where the marks change or another original span begins. */
function spansOf(block, chars) {
  const groups = []
  for (const c of chars) {
    const last = groups.at(-1)
    const sameMarks = last && last.marks.join() === c.marks.join()
    if (last && sameMarks && (c.key === null || last.key === null || last.key === c.key)) {
      last.text += c.ch
      last.key ??= c.key
    } else groups.push({text: c.ch, marks: c.marks, key: c.key})
  }
  const used = new Set()
  let n = 0
  const fresh = () => {
    let k
    do k = `${block._key}-e${n++}`
    while (used.has(k) || (block.children ?? []).some((s) => s._key === k))
    return k
  }
  return groups.map((g) => {
    const key = g.key && !used.has(g.key) ? g.key : fresh()
    used.add(key)
    return {_type: 'span', _key: key, text: g.text, marks: g.marks}
  })
}

const TOKEN = /[\p{L}\p{N}][\p{L}\p{N}’'-]*|\s+|[^\s\p{L}\p{N}]/gu

/** Tokens of a text range, with each linked run (a link or mention mark) as one token that must survive. */
function tokensOf(chars, isLink) {
  const tokens = []
  let i = 0
  while (i < chars.length) {
    const link = chars[i].marks.find(isLink)
    let j = i
    if (link) {
      while (j < chars.length && chars[j].marks.includes(link)) j++
      tokens.push({text: chars.slice(i, j).map((c) => c.ch).join(''), from: i, to: j, link})
    } else {
      while (j < chars.length && !chars[j].marks.some(isLink)) j++
      const text = chars.slice(i, j).map((c) => c.ch).join('')
      for (const m of text.matchAll(TOKEN)) tokens.push({text: m[0], from: i + m.index, to: i + m.index + m[0].length})
    }
    i = j
  }
  return tokens
}

/** Longest common subsequence of two token lists: the pairs [old index, new index] that stay. */
function lcs(a, b) {
  const same = (x, y) => x.text === y.text && Boolean(x.link) === Boolean(y.link)
  const t = Array.from({length: a.length + 1}, () => new Array(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) t[i][j] = same(a[i], b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1])
  const pairs = []
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (same(a[i], b[j])) pairs.push([i++, j++])
    else if (t[i + 1][j] >= t[i][j + 1]) i++
    else j++
  }
  return pairs
}

function replaceInBlock(block, start, end, replace, format, fail) {
  const annotations = new Set((block.markDefs ?? []).map((m) => m._key))
  const isLink = (m) => annotations.has(m)
  const chars = charsOf(block)
  const decor = (c) => (c ? c.marks.filter((m) => !isLink(m)) : [])
  const inside = chars.slice(start, end)
  // old_text may not start or end inside linked words
  if (start > 0 && chars[start - 1].marks.some((m) => isLink(m) && inside[0]?.marks.includes(m))) fail('old_text starts inside linked words')
  if (end < chars.length && chars[end].marks.some((m) => isLink(m) && inside.at(-1)?.marks.includes(m))) fail('old_text ends inside linked words')

  const oldTokens = tokensOf(inside, isLink)
  // the new text, with each linked run of the old text found in order as one token
  const newTokens = []
  let at = 0
  for (const run of oldTokens.filter((t) => t.link)) {
    const i = replace.indexOf(run.text, at)
    if (i < 0) fail(`the linked words "${run.text}" are not kept word for word`)
    for (const m of replace.slice(at, i).matchAll(TOKEN)) newTokens.push({text: m[0]})
    newTokens.push({text: run.text, link: run.link})
    at = i + run.text.length
  }
  for (const m of replace.slice(at).matchAll(TOKEN)) newTokens.push({text: m[0]})
  if (newTokens.map((t) => t.text).join('') !== replace) fail('new_text did not tokenize back to itself')

  const pairs = lcs(oldTokens, newTokens)
  for (const t of oldTokens.filter((t) => t.link)) if (!pairs.some(([i]) => oldTokens[i] === t)) fail(`the linked words "${t.text}" would change`)

  // Walk the alignment: kept tokens keep their characters; new tokens take the marks of what they replace.
  const out = []
  let i = 0
  let j = 0
  const hunk = (iTo, jTo) => {
    const removed = oldTokens.slice(i, iTo).flatMap((t) => inside.slice(t.from, t.to))
    const added = newTokens.slice(j, jTo).map((t) => t.text).join('')
    if (added) {
      const words = removed.filter((c) => c.ch.trim())
      let marks
      if (words.length) marks = decor(words[0]).filter((m) => words.every((c) => c.marks.includes(m)))
      else {
        // a pure insertion: the bold/italic both neighbours share, never a link
        const prev = oldTokens[i - 1] ? inside[oldTokens[i - 1].to - 1] : chars[start - 1]
        const next = oldTokens[iTo] ? inside[oldTokens[iTo].from] : chars[end]
        if (prev && next && prev.marks.some((m) => isLink(m) && next.marks.includes(m))) fail('new words would land inside linked words')
        const sides = [prev, next].filter(Boolean)
        marks = sides.length ? decor(sides[0]).filter((m) => sides.every((c) => c.marks.includes(m))) : []
      }
      for (let k = 0; k < added.length; k++) out.push({ch: added[k], marks, key: null})
    }
    i = iTo
    j = jTo
  }
  for (const [pi, pj] of pairs) {
    hunk(pi, pj)
    const t = oldTokens[pi]
    out.push(...inside.slice(t.from, t.to))
    i = pi + 1
    j = pj + 1
  }
  hunk(oldTokens.length, newTokens.length)
  if (out.map((c) => c.ch).join('') !== replace) fail('internal: rebuilt text differs from new_text')

  // `format`: {strong: [...], em: [...]}: exactly these words of new_text carry that decorator.
  for (const [mark, words] of Object.entries(format ?? {})) {
    for (const c of out) if (c.marks.includes(mark)) c.marks = c.marks.filter((m) => m !== mark)
    for (const w of words) {
      const n = count(replace, w)
      if (n !== 1) fail(`format: "${w}" occurs ${n} times in new_text, not once`)
      const from = replace.indexOf(w)
      for (let k = from; k < from + w.length; k++) out[k] = {...out[k], marks: [...out[k].marks, mark]}
    }
  }
  block.children = spansOf(block, [...chars.slice(0, start), ...out, ...chars.slice(end)])
}

// ---------------------------------------------------------------------------
// Splitting a block that holds a whole article (paragraphs separated by blank lines)

/**
 * Turns one block into paragraphs at its blank lines. The paragraph that starts with `list` keeps that line
 * as a paragraph and makes each following line a bullet item. Marks stay on their words.
 */
function splitBlock(doc, s, fail) {
  const {parent, node: block} = resolve(doc, s.target.field, fail)
  if (block?._type !== 'block' || !Array.isArray(parent)) fail(`${s.target.field} is not a block`)
  const chars = charsOf(block)
  const text = chars.map((c) => c.ch).join('')
  const pieces = []
  const piece = (from, to, extra = {}) => {
    while (from < to && /\s/.test(text[from])) from++
    while (to > from && /\s/.test(text[to - 1])) to--
    if (to > from) pieces.push({from, to, ...extra})
  }
  let at = 0
  for (const m of [...text.matchAll(/\n\s*\n/g), {index: text.length, 0: ''}]) {
    const [from, to] = [at, m.index]
    at = m.index + m[0].length
    const para = text.slice(from, to)
    if (s.list && para.trim().startsWith(s.list)) {
      // the first line introduces the list; every other line is an item
      let lineStart = from
      let intro = true
      for (const line of para.split('\n')) {
        if (line.trim()) {
          piece(lineStart, lineStart + line.length, intro ? {} : {listItem: 'bullet', level: 1})
          intro = false
        }
        lineStart += line.length + 1
      }
    } else {
      if (para.trim().includes('\n')) fail(`a paragraph still holds a line break: "${para.trim().slice(0, 80)}…"`)
      piece(from, to)
    }
  }
  if (pieces.length < 2) fail('nothing to split')
  if (s.list && !pieces.some((p) => p.listItem)) fail(`no list after "${s.list}"`)
  const blocks = pieces.map(({from, to, listItem, level}, n) => {
    const b = {_key: n ? `${block._key}-p${n}` : block._key, _type: 'block', style: block.style ?? 'normal', markDefs: block.markDefs ?? [], children: []}
    b.children = spansOf(b, chars.slice(from, to))
    const used = new Set(b.children.flatMap((c) => c.marks))
    b.markDefs = b.markDefs.filter((m) => used.has(m._key))
    return listItem ? {...b, listItem, level} : b
  })
  parent.splice(parent.indexOf(block), 1, ...blocks)
}
