#!/usr/bin/env node
// Checks the generated dataset against the Studio schema, field by field.
//
//   node scripts/migrate/validate-dataset.mjs [path/to/production.ndjson] [--check-profiles]
//
// `sanity documents validate --file` runs the schema's validation rules (required
// fields, alt text, list values) but does not report fields the schema doesn't
// define or values of the wrong JSON type, which the Studio would show as
// "Unknown field" or "Invalid property value". This walks every document and
// every nested value (sections, Portable Text, references) against the compiled
// Studio schema and reports:
//
//   - document types and fields the schema doesn't define;
//   - values of the wrong type (string vs number, object vs array, ...);
//   - array items without _key, with duplicate _keys, or of a type the array
//     doesn't allow; values outside an options.list;
//   - references to a missing document or to a type the field doesn't allow;
//   - images without an asset, and missing alt where the schema requires it;
//   - Portable Text marks that are neither a decorator nor a markDef;
//   - profile URLs (sameAs) that aren't full https URLs, are link shorteners or repeat,
//     and image alts that are Webflow's placeholder (see "Content rules" below).
//
// Exits 1 on any problem. The schema is read from studio/schemaTypes, so it never
// drifts from what editors see.

import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {Rule, Schema} from '@sanity/schema'
import {builtinTypes} from '@sanity/schema/_internal'
import {profileProblems} from './content/profiles.mjs'

const ROOT = new URL('../../', import.meta.url)
const STUDIO = fileURLToPath(new URL('studio/', ROOT))
const [datasetArg] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const datasetPath = datasetArg ? new URL(datasetArg, `file://${process.cwd()}/`) : new URL('migration/sanity-import/production.ndjson', ROOT)

// Load the Studio's TypeScript schema with the jiti the Studio's toolchain installs.
const studioRequire = createRequire(`${STUDIO}package.json`)
let jitiPath
try {
  jitiPath = studioRequire.resolve('jiti')
} catch {
  jitiPath = createRequire(studioRequire.resolve('sanity/package.json')).resolve('jiti')
}
const {createJiti} = await import(jitiPath)
const {schemaTypes} = await createJiti(`${STUDIO}package.json`).import(`${STUDIO}schemaTypes/index.ts`)
const schema = Schema.compile({name: 'default', types: [...builtinTypes, ...schemaTypes]})

const docs = (await readFile(datasetPath, 'utf8')).split('\n').filter(Boolean).map((l) => JSON.parse(l))
const byId = new Map(docs.map((d) => [d._id, d]))

const problems = []
const problem = (doc, path, msg) => problems.push({doc: `${doc._type} ${doc.slug?.current ?? doc.name ?? doc.title ?? doc.question ?? doc._id}`, path, msg})

const SYSTEM = new Set(['_type', '_key', '_id', '_rev', '_createdAt', '_updatedAt'])
const isType = (type, name) => Boolean(type) && (type.name === name || isType(type.type, name))
const listValues = (type) => {
  const list = type?.options?.list
  return Array.isArray(list) ? list.map((v) => (typeof v === 'object' ? v.value : v)) : undefined
}
const typeLabel = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)

function check(doc, value, type, path) {
  if (value === undefined) return
  const json = type.jsonType
  if (json === 'object') return checkObject(doc, value, type, path)
  if (json === 'array') return checkArray(doc, value, type, path)
  if (typeLabel(value) !== json) return problem(doc, path, `expected ${json} (${type.name}), got ${typeLabel(value)}`)
  const list = listValues(type)
  if (list && !list.includes(value)) problem(doc, path, `"${value}" is not one of the allowed values ${JSON.stringify(list)}`)
  if (json === 'string') {
    if (isType(type, 'date') && !/^\d{4}-\d{2}-\d{2}$/.test(value)) problem(doc, path, `"${value}" is not a YYYY-MM-DD date`)
    if (isType(type, 'datetime') && Number.isNaN(Date.parse(value))) problem(doc, path, `"${value}" is not a datetime`)
    if (isType(type, 'url') && !/^(https?:|mailto:|tel:|\/|#)/.test(value)) problem(doc, path, `"${value}" is not a URL or relative path`)
  }
}

function checkObject(doc, value, type, path) {
  if (typeLabel(value) !== 'object') return problem(doc, path, `expected object (${type.name}), got ${typeLabel(value)}`)
  if (isType(type, 'reference')) {
    for (const k of Object.keys(value)) if (!['_type', '_key', '_ref', '_weak', '_strengthenOnPublish'].includes(k)) problem(doc, `${path}.${k}`, 'unknown property on a reference')
    if (typeof value._ref !== 'string') return problem(doc, path, 'reference without _ref')
    const target = byId.get(value._ref)
    if (!target) return problem(doc, path, `reference to missing document ${value._ref}`)
    const allowed = (type.to ?? []).map((t) => t.name)
    if (allowed.length && !allowed.includes(target._type)) problem(doc, path, `reference to a ${target._type}, field allows ${allowed.join('/')}`)
    return
  }
  if (isType(type, 'globalDocumentReference') || isType(type, 'crossDatasetReference')) return

  const fields = new Map((type.fields ?? []).map((f) => [f.name, f.type]))
  const isAsset = isType(type, 'image') || isType(type, 'file')
  if (value._type !== undefined && typeof value._type !== 'string') problem(doc, `${path}._type`, '_type is not a string')
  else if (value._type && !isType(type, value._type)) problem(doc, `${path}._type`, `_type "${value._type}" but the field is a ${type.name}`)
  for (const [k, v] of Object.entries(value)) {
    if (SYSTEM.has(k)) continue
    if (k === '_sanityAsset' && isAsset) continue
    if (!fields.has(k)) {
      problem(doc, `${path}.${k}`, `unknown field "${k}" on ${type.name}`)
      continue
    }
    check(doc, v, fields.get(k), `${path}.${k}`)
  }

  if (isAsset) {
    if (!value.asset?._ref && !value._sanityAsset) problem(doc, path, 'image without an asset')
    if (value.asset?._ref && byId.get(value.asset._ref)?._type !== 'sanity.imageAsset' && isType(type, 'image')) problem(doc, `${path}.asset`, 'asset is not a sanity.imageAsset document in this file')
    const alt = fields.get('alt')
    if (alt && !String(value.alt ?? '').trim() && altRequired(type)) problem(doc, `${path}.alt`, 'alt text is required (error level) and missing')
  }

  if (isType(type, 'block')) checkBlock(doc, value, type, path)
}

// The schema's alt field: required at error level in sections and galleries,
// at warning level on imported document images (counted, not a failure).
function altRequired(imageType) {
  const alt = (imageType.fields ?? []).find((f) => f.name === 'alt')
  const validation = alt?.type?.validation
  if (!validation) return false
  const rules = [typeof validation === 'function' ? validation(new Rule()) : validation].flat()
  const required = rules.filter((r) => r?._required === 'required')
  if (required.some((r) => (r._level ?? 'error') === 'error')) return true
  if (required.length) altWarnings.push(imageType.name)
  return false
}
const altWarnings = []

function checkBlock(doc, block, type, path) {
  const childrenType = type.fields.find((f) => f.name === 'children')?.type
  const span = childrenType?.of?.find((t) => t.name === 'span')
  const decorators = (span?.decorators ?? []).map((d) => d.value)
  const markKeys = new Set((block.markDefs ?? []).map((m) => m._key))
  for (const [i, child] of (block.children ?? []).entries()) {
    for (const mark of child.marks ?? []) {
      if (!markKeys.has(mark) && !decorators.includes(mark)) problem(doc, `${path}.children[${i}].marks`, `mark "${mark}" is neither a decorator (${decorators.join(', ')}) nor a markDef`)
    }
  }
}

function checkArray(doc, value, type, path) {
  if (!Array.isArray(value)) return problem(doc, path, `expected array (${type.name}), got ${typeLabel(value)}`)
  const members = type.of ?? []
  const keys = new Set()
  const arrayList = listValues(type)
  value.forEach((item, i) => {
    const at = `${path}[${item?._key ?? i}]`
    if (typeLabel(item) === 'object') {
      if (typeof item._key !== 'string' || !item._key) problem(doc, at, 'array item without _key')
      else if (keys.has(item._key)) problem(doc, at, `duplicate _key "${item._key}"`)
      keys.add(item._key)
      const objectMembers = members.filter((m) => m.jsonType === 'object')
      const member = item._type ? objectMembers.find((m) => m.name === item._type) : objectMembers.length === 1 ? objectMembers[0] : undefined
      if (!item._type) problem(doc, at, `array item without _type (allowed: ${objectMembers.map((m) => m.name).join(', ')})`)
      if (!member) return problem(doc, at, `"${item._type}" is not allowed here (allowed: ${objectMembers.map((m) => m.name).join(', ')})`)
      return check(doc, item, member, at)
    }
    const member = members.find((m) => m.jsonType === typeLabel(item))
    if (!member) return problem(doc, at, `${typeLabel(item)} item not allowed (allowed: ${members.map((m) => m.name).join(', ')})`)
    if (arrayList && !arrayList.includes(item)) problem(doc, at, `"${item}" is not one of the allowed values ${JSON.stringify(arrayList)}`)
    check(doc, item, member, at)
  })
}

const counts = {}
for (const doc of docs) {
  const type = schema.get(doc._type)
  counts[doc._type] = (counts[doc._type] ?? 0) + 1
  if (!type) {
    problem(doc, '', `document type "${doc._type}" is not in the schema`)
    continue
  }
  if (!/^[A-Za-z0-9._-]+$/.test(doc._id ?? '')) problem(doc, '_id', `bad _id "${doc._id}"`)
  check(doc, doc, type, '')
}

// Content rules the schema can't express:
//   - profile URLs (Site settings' sameAs and each office's): full https URLs, never a link
//     shortener, none listed twice (content/profiles.mjs profileProblems);
//   - no image alt is Webflow's "inherit" placeholder (__wf_reserved_inherit), which is not
//     a description.
const settingsDoc = byId.get('siteSettings')
if (settingsDoc) {
  for (const msg of profileProblems(settingsDoc.sameAs)) problem(settingsDoc, '.sameAs', msg)
  for (const a of settingsDoc.addresses ?? []) for (const msg of profileProblems(a.sameAs)) problem(settingsDoc, `.addresses[${a._key}].sameAs`, msg)
}
const walkAlts = (doc, node, path) => {
  if (Array.isArray(node)) return node.forEach((n, i) => walkAlts(doc, n, `${path}[${n?._key ?? i}]`))
  if (!node || typeof node !== 'object') return
  if (typeof node.alt === 'string' && /^__wf_/.test(node.alt)) problem(doc, `${path}.alt`, `"${node.alt}" is Webflow's placeholder, not alt text`)
  for (const [k, v] of Object.entries(node)) if (k !== 'alt') walkAlts(doc, v, `${path}.${k}`)
}
for (const doc of docs) walkAlts(doc, doc, '')

// --check-profiles: also request every profile URL (warnings only: Facebook, Instagram and Yelp
// often refuse bots).
if (process.argv.includes('--check-profiles') && settingsDoc) {
  const urls = [...(settingsDoc.sameAs ?? []), ...(settingsDoc.addresses ?? []).flatMap((a) => a.sameAs ?? [])]
  for (const url of urls) {
    const status = await fetch(url, {redirect: 'follow', signal: AbortSignal.timeout(15000), headers: {'user-agent': 'Mozilla/5.0'}}).then((r) => r.status, (e) => e.name)
    if (status !== 200) console.log(`  warning: profile ${url} answered ${status}`)
  }
}

console.log(`Checked ${docs.length} documents against the Studio schema:`, counts)
if (altWarnings.length) console.log(`Note: ${altWarnings.length} image(s) where alt is recommended (warning level) have none; see sanity documents validate`)
if (problems.length) {
  const grouped = {}
  for (const p of problems) {
    const k = `${p.path.replace(/\[[^\]]+\]/g, '[]')}: ${p.msg}`
    ;(grouped[k] ??= []).push(p.doc)
  }
  for (const [k, list] of Object.entries(grouped)) console.log(`  ${list.length}x ${k}\n     e.g. ${[...new Set(list)].slice(0, 3).join(' | ')}`)
  console.error(`FAIL: ${problems.length} problem(s)`)
  process.exit(1)
}
console.log('OK: every document, section and field matches the schema')
