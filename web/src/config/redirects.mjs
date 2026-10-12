// 301 redirects, applied by the Vercel adapter at build time.
//
// Two sources:
// 1. LEGACY_REDIRECTS: URLs that 404 or exist only as Webflow filler today
//    (measured 2026-10-12, see migration/seo-equity/redirect-candidates.json).
// 2. `redirect` documents in Sanity, so editors can add redirects without a deploy
//    of code (a publish triggers a rebuild).
//
// TODO before launch: add every rule from Webflow → Site settings → Publishing →
// 301 redirects. The Webflow API doesn't expose them on this plan.
import {createClient} from '@sanity/client'

/** @type {Record<string, string>} */
export const LEGACY_REDIRECTS = {
  // Broken internal links on the live site.
  '/estimate': '/contact-us',
  '/locations/mesa': '/',
  '/services/electrical-panels': '/services/panels',
  '/blog/[slug]': '/blog-posts/[slug]',
  '/index.html': '/',

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
    while (map[target] !== undefined && !target.includes('[')) {
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
