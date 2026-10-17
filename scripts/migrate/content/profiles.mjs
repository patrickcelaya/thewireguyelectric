// The business's own profiles on other sites and the facts read from them, from
// migration/content-data/profiles.json (README.md section 11 there):
//
//   sameAs          appended to siteSettings.sameAs (the live JSON-LD's Facebook, Instagram,
//                   Yelp and BBB come first), without duplicates
//   offices         per office (siteSettings.addresses by city): geo, the profile pin; sameAs,
//                   that office's own profiles (the Scottsdale branch's structured data)
//   reviewSummary   the Google rating and review count shown as text across the site
//
// sameAs states identity, so every profile URL must be a full https URL, never a link
// shortener (share.google, goo.gl, bit.ly) whose target can change under it, and never
// listed twice (profileProblems; validate-dataset.mjs runs the same check on the output).
// The footer's share.google links are map links (googleMapsUrl), not profiles, and stay.
//
// Runs right after fixes (which sets the offices' map links).

const DATA = 'migration/content-data/profiles.json'
const SHORTENER = /^https?:\/\/(?:[^/]*\.)?(?:share\.google|goo\.gl|bit\.ly)(?:\/|$)/i

/** What is wrong with a list of profile URLs (empty when nothing is). */
export function profileProblems(urls) {
  const problems = []
  const seen = new Set()
  for (const url of urls ?? []) {
    if (typeof url !== 'string' || !/^https:\/\/[^/\s]+\.[^/\s]+/i.test(url)) problems.push(`"${url}" is not a full https URL`)
    else if (SHORTENER.test(url)) problems.push(`"${url}" is a link shortener`)
    const key = String(url).toLowerCase().replace(/\/+$/, '')
    if (seen.has(key)) problems.push(`"${url}" is listed twice`)
    seen.add(key)
  }
  return problems
}

export default async function profiles(ctx) {
  const {docs, readJson, report} = ctx
  const data = await readJson(DATA)
  const fail = (msg) => {
    throw new Error(`${DATA}: ${msg}`)
  }
  const settings = docs.find((d) => d._id === 'siteSettings') ?? fail('no siteSettings document')

  const key = (u) => u.toLowerCase().replace(/\/+$/, '')
  const known = new Set((settings.sameAs ?? []).map(key))
  const added = data.sameAs.add.filter((u) => !known.has(key(u)))
  settings.sameAs = [...(settings.sameAs ?? []), ...added]
  const bad = profileProblems(settings.sameAs)
  if (bad.length) fail(`sameAs: ${bad.join('; ')}`)

  for (const [city, office] of Object.entries(data.offices)) {
    const address = settings.addresses?.find((a) => a.addressLocality === city) ?? fail(`offices: no ${city} address in siteSettings.addresses`)
    const {lat, lng} = office.geo ?? {}
    if (office.geo && !(Math.abs(lat - 33.4) < 0.5 && Math.abs(lng + 111.9) < 0.5)) fail(`offices.${city}: geo ${lat},${lng} is not in the Phoenix valley`)
    if (office.geo) address.geo = {_type: 'geopoint', lat, lng}
    if (office.sameAs) {
      const problems = profileProblems(office.sameAs)
      if (problems.length) fail(`offices.${city}.sameAs: ${problems.join('; ')}`)
      address.sameAs = office.sameAs
    }
  }

  const {ratingValue, reviewCount} = data.reviewSummary
  if (!(ratingValue > 0 && ratingValue <= 5) || !Number.isInteger(reviewCount)) fail('reviewSummary needs a rating (0-5] and a whole review count')
  settings.reviewSummary = {...settings.reviewSummary, ratingValue, reviewCount}

  report.profiles = {
    sameAsAdded: added,
    offices: Object.fromEntries(Object.entries(data.offices).map(([city, o]) => [city, [o.geo && 'geo', o.sameAs && `${o.sameAs.length} profiles`].filter(Boolean).join(', ')])),
    reviewSummary: `${ratingValue} from ${reviewCount}+`,
  }
}
