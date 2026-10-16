// Internal link hygiene for content links (rich text, CTAs): hrefs to this site
// become relative, lose a trailing slash and skip redirects, so no internal link
// ever points at a 3xx (docs/SEO_STRATEGY.md; redesign spec §1.5).
import {LEGACY_REDIRECTS, flattenRedirects} from '../config/redirects.mjs'

const SITE_ORIGIN = /^https?:\/\/(www\.)?thewireguyelectric\.com(?=\/|$|[?#])/i

/** Source path → destination, one hop, as Vercel serves them. */
export type RedirectMap = Record<string, string>

/** The legacy redirects plus the Sanity `redirect` documents (source → destination), flattened. */
export function buildRedirectMap(sanityRedirects: RedirectMap = {}): RedirectMap {
  const flat = flattenRedirects({...LEGACY_REDIRECTS, ...sanityRedirects})
  return Object.fromEntries(Object.entries(flat).map(([from, to]) => [from, typeof to === 'string' ? to : to.destination]))
}

function redirectTarget(path: string, redirects: RedirectMap) {
  if (redirects[path]) return redirects[path]
  // one-segment patterns such as /blog/[slug] → /blog-posts/[slug]
  for (const [from, to] of Object.entries(redirects)) {
    const m = from.match(/^(.*)\/\[(\w+)\]$/)
    if (!m || !path.startsWith(`${m[1]}/`)) continue
    const rest = path.slice(m[1].length + 1)
    if (rest && !rest.includes('/')) return to.replace(`[${m[2]}]`, rest)
  }
  return undefined
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
  return `${redirectTarget(clean, redirects) ?? clean}${suffix}`
}

/** True for http(s) links that leave this site. */
export function isExternal(href: string) {
  return /^https?:\/\//i.test(href) && !SITE_ORIGIN.test(href)
}
