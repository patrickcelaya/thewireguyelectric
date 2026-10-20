// Internal link hygiene for content links (rich text, CTAs): hrefs to this site
// become relative, lose a trailing slash and skip redirects, so no internal link
// ever points at a 3xx (docs/SEO_STRATEGY.md; redesign spec §1.5).
import {LEGACY_REDIRECTS, flattenRedirects, postRedirects} from '../config/redirects.mjs'

const SITE_ORIGIN = /^https?:\/\/(www\.)?thewireguyelectric\.com(?=\/|$|[?#])/i

/** Source path → destination, one hop, as Vercel serves them. */
export type RedirectMap = Record<string, string>

/**
 * The legacy redirects, the posts' old /blog/ paths and the Sanity `redirect` documents
 * (source → destination), flattened: the same table astro.config.mjs hands to Vercel.
 */
export function buildRedirectMap(sanityRedirects: RedirectMap = {}, postSlugs: string[] = []): RedirectMap {
  const flat = flattenRedirects({...LEGACY_REDIRECTS, ...postRedirects(postSlugs), ...sanityRedirects})
  return Object.fromEntries(Object.entries(flat).map(([from, to]) => [from, typeof to === 'string' ? to : to.destination]))
}

/**
 * The href to render. Links to this site become root-relative paths without a
 * trailing slash, mapped through the redirects; everything else is returned as is.
 */
export function resolveHref(href: string, redirects: RedirectMap = {}) {
  const raw = href.trim()
  const local = raw.replace(SITE_ORIGIN, '') || '/'
  if (!local.startsWith('/') || local.startsWith('//')) return raw
  const [, path = '/', suffix = ''] = local.match(/^([^?#]*)(.*)$/) ?? []
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path
  return `${redirects[clean] ?? clean}${suffix}`
}

/** True for http(s) links that leave this site. */
export function isExternal(href: string) {
  return /^https?:\/\//i.test(href) && !SITE_ORIGIN.test(href)
}
