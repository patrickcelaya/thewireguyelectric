// 301 redirects, applied by the Vercel adapter at build time.
//
// Four sources:
// 1. LEGACY_REDIRECTS: URLs that 404 or exist only as Webflow filler today
//    (measured 2026-10-12, see migration/seo-equity/redirect-candidates.json).
// 2. SHORT_LINKS: short addresses the business hands out (/review), as 302s.
// 3. postRedirects: the old /blog/<slug> path of every published post.
// 4. `redirect` documents in Sanity, so editors can add redirects without a deploy
//    of code (a publish triggers a rebuild).
//
// Webflow had no 301 redirects configured (confirmed by the owner, 2026-10-12),
// so there is no legacy rule list to carry over.
import {createClient} from '@sanity/client'
import {readFile} from 'node:fs/promises'

/** @type {Record<string, string>} */
export const LEGACY_REDIRECTS = {
  // Broken internal links on the live site.
  '/locations/mesa': '/',
  '/services/electrical-panels': '/services/panels',
  '/index.html': '/',

  // Misspelled URLs that Google has seen (Search Console, last 16 months) and
  // that 404 on the live site. Redirecting recovers whatever links point at them.
  '/blog-posts/bathroom-or-garage-outlets-not-working-heres-how-time': '/blog-posts/bathroom-or-garage-outlets-not-working-heres-how-to-fix',
  '/blog-posts/bathroom-or-garage-outlets-not-working-heres-how-time-fix': '/blog-posts/bathroom-or-garage-outlets-not-working-heres-how-to-fix',
  '/blog-posts/bathroom-or-garage-outlets-not-working-heres-to-fix': '/blog-posts/bathroom-or-garage-outlets-not-working-heres-how-to-fix',
  '/blog-posts/garage-outlets-not-working-heres-how-to-fix': '/blog-posts/bathroom-or-garage-outlets-not-working-heres-how-to-fix',
  '/blog-posts/can-hot-weather-cause-your-breaker-to-trip': '/blog-posts/can-hot-weather-cause-your-circuit-breaker-to-trip',
  '/blog-posts/can-hot-weather-cause-your-circuit-breaker-to-trap': '/blog-posts/can-hot-weather-cause-your-circuit-breaker-to-trip',
  '/blog-posts/can-hot-weather-cause-your-circuit-breaker-to_trip': '/blog-posts/can-hot-weather-cause-your-circuit-breaker-to-trip',
  '/blog-posts/electrical-work-in-arizona': '/blog-posts/diy-electrical-work-in-arizona',
  '/blog-posts/hot-tub-electrical-installation-cost-in-arizona': '/blog-posts/hot-tub-electrical-installation-cost-arizona',
  '/blog-posts/panel-upgrade-cost-arizona': '/blog-posts/electrical-panel-upgrade-cost-arizona',
  '/blog-posts/tesla-wall-connector-vs-chargepoint-home-flex': '/blog-posts/tesla-wall-connector-vs-chargepoint-home-flex-phoenix',

  // Archived 2023 posts (404 today); route any old links to the closest live page.
  '/blog-posts/upgrading-your-electrical-panel': '/services/panels',
  '/blog-posts/protecting-your-home-and-family': '/blog-posts/electrical-safety-tips',
  '/blog-posts/the-benefits-and-efficiency-of-lighting': '/services/led-lights',
  '/blog-posts/understanding-of-residential-wiring': '/blog-posts/outdated-wiring-in-older-phoenix-homes',

  // Webflow e-commerce template filler (200 and indexable today, ~7 words each).
  // /checkout, /paypal-checkout, /order-confirmation, /search, /401 and
  // /templates/* are deliberately NOT redirected: they never had value, and a
  // plain 404 drops them from the index cleanly.
  '/product/circuit-breakers': '/services',
  '/product/smart-devices': '/services',
  '/product/safety-equipment': '/services',
  '/product/lighting-fixtures': '/services',
  '/product/electrical-wiring': '/services',
  '/product/electrical-tools-kit': '/services',
  '/category/lighting-solutions': '/services',
  '/category/hardware': '/services',
  '/category/electrical-tools': '/services',
}

/**
 * Short links the business hands out, as temporary (302) redirects: the destination is someone else's URL and may
 * change, and a short link is no page of its own (no 200, nothing to index, not in the sitemap).
 * - /review: Google's "write a review" form for the business's MAIN Google Business Profile, the Mesa one
 *   (maps.app.goo.gl/j4qZJwx8ttVZo93w5; "Had us out? Leave a Google review" in the footer, and the link the crew
 *   can text or print after a job). Not the Scottsdale profile. The place ID was read from that profile's place
 *   card; it encodes the profile's CID, 4489697358306155784 (0x3e4e9bf5bed91d08), the same CID as the Google
 *   entry in migration/content-data/profiles.json sameAs (the JSON-LD sameAs and hasMap). web/scripts/
 *   short-links.test.mjs decodes it and fails if the two ever disagree; scripts/launch/verify.mjs checks the 302.
 * @type {Record<string, {status: 302, destination: string}>}
 */
export const SHORT_LINKS = {
  '/review': {status: 302, destination: 'https://search.google.com/local/writereview?placeid=ChIJo0p1h7CoK4cRCB3ZvvWbTj4'},
}

/**
 * Collapse chains (A→B, B→C becomes A→C, B→C) so every old URL is one hop from
 * its final page, and fail the build on loops.
 */
/**
 * @param {Record<string, string | {status: number, destination: string}>} map
 * @returns {Record<string, any>}
 */
export function flattenRedirects(map) {
  const dest = (v) => (typeof v === 'string' ? v : v.destination)
  const out = {}
  for (const [source, value] of Object.entries(map)) {
    let target = dest(value)
    const seen = new Set([source])
    while (map[target] !== undefined) {
      if (seen.has(target)) throw new Error(`Redirect loop: ${[...seen, target].join(' -> ')}`)
      seen.add(target)
      target = dest(map[target])
    }
    out[source] = typeof value === 'string' ? target : {...value, destination: target}
  }
  return out
}

/**
 * Fetch enabled redirect documents from Sanity. Returns {} when Sanity isn't configured.
 * @param {{projectId?: string, dataset: string, token?: string}} options
 * @returns {Promise<Record<string, {status: 301 | 302, destination: string}>>}
 */
export async function loadSanityRedirects({projectId, dataset, token}) {
  if (!projectId) return {}
  const client = createClient({projectId, dataset, token, apiVersion: '2026-10-01', useCdn: false, perspective: 'published'})
  const docs = await client.fetch(`*[_type == "redirect" && isEnabled != false && defined(source) && defined(destination)]{source, destination, permanent}`)
  return Object.fromEntries(
    docs.map((/** @type {{source: string, destination: string, permanent?: boolean}} */ r) => [r.source.replace(/\/$/, '') || '/', {status: r.permanent === false ? 302 : 301, destination: r.destination}]),
  )
}

/**
 * `/blog/<slug>` → `/blog-posts/<slug>` for each published post (live pages linked
 * some posts by that path). Only real posts redirect, so an unknown /blog/ URL is a
 * plain 404 instead of a redirect to one.
 * @param {string[]} slugs
 * @returns {Record<string, string>}
 */
export function postRedirects(slugs) {
  return Object.fromEntries(slugs.map((slug) => [`/blog/${slug}`, `/blog-posts/${slug}`]))
}

/**
 * Every published post's slug: from Sanity when it's configured, else from the local
 * dataset the site builds from (see lib/sanity.ts).
 * @param {{projectId?: string, dataset: string, token?: string, localDataset: URL}} options
 * @returns {Promise<string[]>}
 */
export async function loadPostSlugs({projectId, dataset, token, localDataset}) {
  if (projectId) {
    const client = createClient({projectId, dataset, token, apiVersion: '2026-10-01', useCdn: false, perspective: 'published'})
    return client.fetch(`*[_type == "post" && defined(slug.current)].slug.current`)
  }
  const text = await readFile(localDataset, 'utf8').catch(() => '')
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((doc) => doc._type === 'post' && !String(doc._id).startsWith('drafts.') && doc.slug?.current)
    // _id order, as Sanity returns them
    .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0))
    .map((doc) => doc.slug.current)
}
