// Sourced local facts for the city pages, and for Mesa (the homepage).
//
// migration/local-facts/locations.json and mesa.json hold the researched values,
// each with its source ids and a confidence; docs/research/local-facts.md is the
// readable version with citations. This module writes only "high" confidence values:
//   location: county, zipCodes, neighborhoods, utilityProviders, permitNotes, geo, and
//             faqs: the city's own questions ("Who provides electric service in Gilbert?",
//             "Who issues electrical permits in Gilbert?"), answered with its permit notes
//   siteSettings.homeCity (Mesa): county, neighborhoods, utilityProviders
// Mesa's ZIPs, geo and permit notes stay in mesa.json until the homeCity schema has
// fields for them.
//
// Neighborhoods are only names the business already uses. Each one carries the quote
// that names it, and this checks the quote is in the location's body copy or in the
// live homepage snapshot (the city tiles), so a name cannot be added here without
// first appearing in the business's own copy. Every source id a fact cites (including
// a neighborhood's "verifiedBy") must exist in that file's "sources".

import {readFile} from 'node:fs/promises'

const LOCATIONS = 'migration/local-facts/locations.json'
const MESA = 'migration/local-facts/mesa.json'
const HOMEPAGE = 'migration/live-snapshots/index.html'
// Mirrors UTILITY_PROVIDERS in studio/schemaTypes/shared/fields.ts.
const UTILITIES = ['SRP', 'APS', 'City of Mesa', 'TEP', 'ED3']
const ZIP = /^\d{5}$/
// Rough Arizona bounding box: catches swapped or mistyped coordinates.
const inArizona = ({lat, lng}) => lat > 31.3 && lat < 37.1 && lng > -114.9 && lng < -109

const squash = (s) => s.replace(/\s+/g, ' ').trim()
const htmlText = (html) =>
  squash(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#x27;|&#39;|&rsquo;/g, '’'),
  )
const blocksText = (blocks = []) =>
  squash(
    blocks
      .filter((b) => b._type === 'block')
      .map((b) => (b.children ?? []).map((c) => c.text ?? '').join(''))
      .join('\n'),
  )

export default async function localFacts(ctx) {
  const {docs, readJson, plainBlocks, p, report} = ctx
  const data = await readJson(LOCATIONS)
  const mesaData = await readJson(MESA)
  const mesa = mesaData.mesa
  const homepage = htmlText(await readFile(p(HOMEPAGE), 'utf8'))

  const fail = (where, msg) => {
    throw new Error(`local-facts: ${where}: ${msg}`)
  }
  const skipped = []
  const isHigh = (where, field, fact) => {
    if (!fact) return false
    if (fact.confidence === 'high') return true
    skipped.push({where, field, reason: `confidence ${fact.confidence ?? 'missing'}`})
    return false
  }

  const checkUtilities = (where, values) => {
    if (!Array.isArray(values) || !values.length) fail(where, 'utilityProviders is empty')
    for (const v of values) if (!UTILITIES.includes(v)) fail(where, `utility "${v}" is not in the schema's list`)
    return [...values]
  }
  const checkZips = (where, values) => {
    if (!Array.isArray(values) || !values.length) fail(where, 'zipCodes is empty')
    for (const z of values) if (!ZIP.test(z)) fail(where, `bad ZIP "${z}"`)
    if (new Set(values).size !== values.length) fail(where, 'duplicate ZIP')
    return [...values]
  }
  const checkGeo = (where, value) => {
    if (!value || !Number.isFinite(value.lat) || !Number.isFinite(value.lng) || !inArizona(value)) fail(where, `bad geo ${JSON.stringify(value)}`)
    return {_type: 'geopoint', lat: value.lat, lng: value.lng}
  }
  // Every cited source id must be defined, so no value is left pointing at a missing citation.
  const checkSources = (where, facts, sources) => {
    for (const [field, fact] of Object.entries(facts)) {
      if (!fact || typeof fact !== 'object' || Array.isArray(fact)) continue
      const ids = [...(fact.sources ?? []), ...(Array.isArray(fact.value) ? fact.value.flatMap((v) => v?.verifiedBy ?? []) : [])]
      for (const id of ids) if (!sources[id]) fail(where, `${field} cites unknown source "${id}"`)
    }
  }
  const checkNeighborhoods = (where, items, bodyText) => {
    const names = []
    for (const {name, evidence} of items ?? []) {
      if (!name || !evidence?.quote) fail(where, `neighborhood without evidence: ${name}`)
      if (!evidence.quote.includes(name)) fail(where, `quote does not contain "${name}"`)
      const copy = evidence.source === 'business-location-body' ? bodyText : evidence.source === 'business-homepage-tiles' ? homepage : undefined
      if (copy === undefined) fail(where, `unknown evidence source for "${name}": ${evidence.source}`)
      if (!copy.includes(squash(evidence.quote))) fail(where, `"${evidence.quote}" is not in the ${evidence.source === 'business-location-body' ? 'location body' : 'homepage snapshot'}`)
      if (!names.includes(name)) names.push(name)
    }
    if (!names.length) fail(where, 'no neighborhoods')
    return names
  }

  const applied = {}
  const missing = []
  for (const [slug, facts] of Object.entries(data.locations)) {
    const doc = docs.find((d) => d._type === 'location' && d.slug?.current === slug)
    if (!doc) {
      missing.push(slug)
      continue
    }
    const where = `${LOCATIONS} ${slug}`
    checkSources(where, facts, data.sources)
    const fields = []
    if (isHigh(slug, 'county', facts.county)) {
      if (!/ County$/.test(facts.county.value ?? '')) fail(where, `bad county "${facts.county.value}"`)
      doc.county = facts.county.value
      fields.push('county')
    }
    if (isHigh(slug, 'zipCodes', facts.zipCodes)) {
      doc.zipCodes = checkZips(where, facts.zipCodes.value)
      fields.push('zipCodes')
    }
    if (isHigh(slug, 'neighborhoods', facts.neighborhoods)) {
      doc.neighborhoods = checkNeighborhoods(where, facts.neighborhoods.value, blocksText(doc.body))
      fields.push('neighborhoods')
    }
    if (isHigh(slug, 'utilityProviders', facts.utilityProviders)) {
      doc.utilityProviders = checkUtilities(where, facts.utilityProviders.value)
      fields.push('utilityProviders')
    }
    if (isHigh(slug, 'permitNotes', facts.permitNotes)) {
      const paras = facts.permitNotes.value
      if (!Array.isArray(paras) || !paras.length || paras.some((t) => typeof t !== 'string' || !t.trim() || /\n/.test(t))) fail(where, 'permitNotes must be one string per paragraph')
      doc.permitNotes = plainBlocks(paras.join('\n\n'))
      fields.push('permitNotes')
      const faqs = cityFaqs(doc, paras, (msg) => fail(where, msg))
      if (faqs.length) {
        doc.faqs = faqs
        fields.push('faqs')
      }
    }
    if (isHigh(slug, 'geo', facts.geo)) {
      doc.geo = checkGeo(where, facts.geo.value)
      fields.push('geo')
    }
    applied[slug] = fields
  }
  if (missing.length) console.warn(`local-facts: no location document for ${missing.join(', ')}`)

  // Mesa lives on the homepage, so its facts go to Site settings → Home city.
  const settings = docs.find((d) => d._type === 'siteSettings')
  const homeCity = []
  if (settings) {
    const where = `${MESA} mesa`
    checkSources(where, mesa, mesaData.sources)
    const next = {...(settings.homeCity ?? {})}
    next.name ??= mesa.city
    if (isHigh('mesa', 'county', mesa.county)) {
      next.county = mesa.county.value
      homeCity.push('county')
    }
    if (isHigh('mesa', 'neighborhoods', mesa.neighborhoods)) {
      next.neighborhoods = checkNeighborhoods(where, mesa.neighborhoods.value, '')
      homeCity.push('neighborhoods')
    }
    if (isHigh('mesa', 'utilityProviders', mesa.utilityProviders)) {
      next.utilityProviders = checkUtilities(where, mesa.utilityProviders.value)
      homeCity.push('utilityProviders')
    }
    // Validated here so a bad edit fails the run, though the schema has no field for them yet.
    checkZips(where, mesa.zipCodes.value)
    checkGeo(where, mesa.geo.value)
    settings.homeCity = next
  }

  // The city's own questions (round-5 Gilbert mockup), answered with its permit notes
  // word for word: the last paragraph is the utility one ("Most of Gilbert is in SRP's
  // electric service area; …" and how a panel upgrade is coordinated with it), the ones
  // before it name the permit office. Nothing is added to the notes; the page shows
  // them as these questions (and in its FAQPage) instead of as a note.
  function cityFaqs(doc, paras, failHere) {
    const city = doc.name
    const utilities = doc.utilityProviders ?? []
    const power = paras.at(-1)
    const permits = paras.slice(0, -1)
    if (!permits.length) failHere('permitNotes needs the permit paragraph(s) before the utility paragraph')
    const firstSentence = power.split(/(?<=[.;])\s/)[0]
    if (!utilities.length || !utilities.some((u) => firstSentence.includes(u))) failHere(`the last permit note should open with the city's utility (${utilities.join(', ')}): "${firstSentence}"`)
    if (!permits[0].includes(city) && !permits[0].includes(doc.cityNameForSeo?.replace(/,\s*AZ$/, '') ?? city)) failHere(`the first permit note does not name ${city}`)
    return [
      {_type: 'faqItem', _key: 'utility', question: `Who provides electric service in ${city}?`, answer: plainBlocks(power)},
      {_type: 'faqItem', _key: 'permits', question: `Who issues electrical permits in ${city}?`, answer: plainBlocks(permits.join('\n\n'))},
    ]
  }

  report.localFacts = {
    source: [LOCATIONS, MESA],
    applied,
    homeCity,
    heldBackNeighborhoods: Object.entries(data.locations).flatMap(([slug, f]) => (f.neighborhoods?.heldBack ?? []).map((h) => ({slug, name: h.name}))),
    skipped,
    missing,
  }
}
