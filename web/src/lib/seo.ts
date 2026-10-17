import type {ImageRef, Seo, SiteSettings} from './types'
import {ogImageUrl} from './image'

export const SITE_URL = 'https://www.thewireguyelectric.com'

/**
 * Pages are indexable only when SITE_INDEXABLE=true, which is set on the Vercel
 * production environment at cutover. Every other build (previews, local, the
 * production deployment before DNS moves) renders noindex and a blocking
 * robots.txt, so nothing can compete with the live site.
 */
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === 'true'

/**
 * The production build stops when a page composed in Sanity has no sections: that is
 * the content from before the redesign (the dataset was not re-imported), and shipping
 * it would drop the page's copy below its SEO floors. Every other build (previews, local)
 * renders what the dataset holds and only warns.
 */
export function requireComposed(page: {slug: string; sections?: unknown[] | null}) {
  if (page.sections?.length) return
  const message = `page "${page.slug}" has no sections: the dataset holds the content from before the redesign. Import migration/sanity-import/production.ndjson, then run validate-dataset and verify-content.`
  if (SITE_INDEXABLE) throw new Error(`Production build stopped: ${message}`)
  console.warn(`[content] ${message}`)
}

export interface Crumb {
  name: string
  path: string
}

export interface PageMeta {
  title: string
  description?: string
  /** Path without trailing slash, e.g. "/services/panels". */
  path: string
  ogImage?: string
  ogType?: 'website' | 'article'
  noIndex?: boolean
  breadcrumbs?: Crumb[]
  jsonLd?: Array<Record<string, unknown>>
  publishedTime?: string
  modifiedTime?: string
}

/** Absolute URL for a path, without a trailing slash (the homepage is "<origin>/"). */
export function absoluteUrl(path: string) {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path.replace(/\/+$/, '')}`
}

/**
 * Resolve the meta title. An explicit SEO title wins (imported titles are stored
 * there verbatim). Otherwise apply the same template Webflow used for that type.
 */
export function resolveTitle(seo: Seo | undefined, fallback: string) {
  return seo?.title?.trim() || fallback
}

export function resolveDescription(seo: Seo | undefined, ...fallbacks: Array<string | undefined>) {
  return seo?.description?.trim() || fallbacks.find((f) => f && f.trim())?.trim()
}

export function resolveOgImage(settings: SiteSettings, ...images: Array<ImageRef | undefined | null>) {
  for (const image of [...images, settings.defaultOgImage]) {
    const url = ogImageUrl(image)
    if (url) return url
  }
  return undefined
}
