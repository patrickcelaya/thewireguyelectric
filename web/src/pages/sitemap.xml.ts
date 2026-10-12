// /sitemap.xml at the same URL Webflow used (it's what Search Console has on file).
// Only indexable, canonical URLs; lastmod comes from the content's real update time.
import type {APIRoute} from 'astro'
import {fetchQuery} from '../lib/sanity'
import {absoluteUrl} from '../lib/seo'

type Entry = {path: string; lastmod?: string}

export const GET: APIRoute = async () => {
  const docs = await fetchQuery<Array<{_type: string; slug: string; _updatedAt?: string; updatedAt?: string; publishedAt?: string}>>(
    `*[_type in ["page", "service", "serviceCategory", "location", "post"] && defined(slug.current) && seo.noIndex != true]{
      _type, "slug": slug.current, _updatedAt, updatedAt, publishedAt
    }`,
  )
  const prefix: Record<string, string> = {service: '/services/', serviceCategory: '/services-categories/', location: '/locations/', post: '/blog-posts/'}
  const entries: Entry[] = docs.map((d) => ({
    path: d._type === 'page' ? (d.slug === 'index' ? '/' : `/${d.slug}`) : `${prefix[d._type]}${d.slug}`,
    // Posts carry real publish/update dates; prefer them over _updatedAt (which the import resets).
    lastmod: d.updatedAt ?? d.publishedAt ?? d._updatedAt,
  }))
  for (const fixed of ['/', '/services', '/blog']) if (!entries.some((e) => e.path === fixed)) entries.push({path: fixed})
  entries.sort((a, b) => (a.path === '/' ? -1 : b.path === '/' ? 1 : a.path.localeCompare(b.path)))

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url><loc>${absoluteUrl(e.path)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`
  return new Response(body, {headers: {'content-type': 'application/xml; charset=utf-8'}})
}
