import type {APIRoute} from 'astro'
import {SITE_INDEXABLE, SITE_URL} from '../lib/seo'

// Production allows everything (including AI search crawlers, which cite sources).
// Every other build blocks crawling outright.
export const GET: APIRoute = () => {
  const body = SITE_INDEXABLE
    ? `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`
    : `User-agent: *\nDisallow: /\n`
  return new Response(body, {headers: {'content-type': 'text/plain; charset=utf-8'}})
}
