// Every post is linked from the guides block of its primary hub (the first service it supports),
// wherever that service's picked guides leave room (lib/cms.ts serviceGuides: picks, then the
// unpicked posts written for the service, newest first, up to five). Reads the last build
// (PUBLIC_SANITY_PROJECT_ID= pnpm --filter web build, so the build used the local dataset);
// skipped when there is none.
import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'
import {test} from 'node:test'

const root = new URL('../.vercel/output/static/', import.meta.url)
const built = existsSync(new URL('services/index.html', root))
const docs = readFileSync(new URL('../../migration/sanity-import/production.ndjson', import.meta.url), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((d) => !d._id.startsWith('drafts.'))
const byId = new Map(docs.map((d) => [d._id, d]))
const posts = docs
  .filter((d) => d._type === 'post' && d.slug?.current && d.publishedAt)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a._id.localeCompare(b._id))
const services = docs.filter((d) => d._type === 'service' && d.slug?.current)

/** The guide links of a built service page: the hrefs inside its guides block. */
function guideLinks(slug) {
  const html = readFileSync(new URL(`services/${slug}/index.html`, root), 'utf8')
  const start = html.indexOf('<div class="guides-block">')
  if (start < 0) return []
  const end = html.indexOf('</ul>', start)
  return [...html.slice(start, end).matchAll(/href="\/blog-posts\/([^"#?]+)"/g)].map((m) => m[1])
}

test('posts are linked from their primary hub', {skip: !built && 'no build in web/.vercel/output'}, async (t) => {
  for (const service of services) {
    const slug = service.slug.current
    const picked = (service.relatedPosts ?? []).map((r) => byId.get(r._ref)?.slug?.current).filter(Boolean)
    const own = posts
      .filter((p) => byId.get(p.relatedServices?.[0]?._ref)?.slug?.current === slug && !picked.includes(p.slug.current))
      .map((p) => p.slug.current)
    const expected = [...picked, ...own].slice(0, 5)
    if (!expected.length) continue
    await t.test(slug, () => {
      const links = guideLinks(slug)
      assert.deepEqual(expected.filter((s) => !links.includes(s)), [], `/services/${slug} guides: ${links.join(', ')}`)
      assert.ok(links.length <= 5, `/services/${slug} shows ${links.length} guides`)
    })
  }
})
