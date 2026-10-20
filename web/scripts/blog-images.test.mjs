// The owner-approved post images (post.showMainImage) in the built site: each post's /blog thumbnail
// and its own cover are its own image (lib/cms.ts reserveOwnImages, postThumb, ownPostImage). Reads the
// last build (PUBLIC_SANITY_PROJECT_ID= pnpm --filter web build, so the build used the local dataset);
// skipped when there is none.
import assert from 'node:assert/strict'
import {existsSync, readFileSync} from 'node:fs'
import {test} from 'node:test'

const root = new URL('../.vercel/output/static/', import.meta.url)
const built = existsSync(new URL('blog/index.html', root))
const hash = (ref) => ref?.replace(/^image-/, '').replace(/-[a-z0-9]+$/, '')
const docs = readFileSync(new URL('../../migration/sanity-import/production.ndjson', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const shown = docs.filter((d) => d._type === 'post' && d.showMainImage && !d._id.startsWith('drafts.'))

test('the approved images', {skip: !built && 'no build in web/.vercel/output'}, async (t) => {
  assert.ok(shown.length > 0, 'the dataset has posts with showMainImage')
  const blog = readFileSync(new URL('blog/index.html', root), 'utf8')
  const rows = new Map(
    [...blog.matchAll(/<li class="postrow[^"]*">([\s\S]*?)<\/li>/g)].map(([, row]) => [
      /href="\/blog-posts\/([^"]+)"/.exec(row)?.[1],
      /postrow__thumb[\s\S]*?cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([0-9a-f]{40}-\d+x\d+)/.exec(row)?.[1],
    ]),
  )
  await t.test('each one is its post\'s /blog thumbnail', () => {
    const wrong = shown.filter((p) => rows.get(p.slug.current) !== hash(p.mainImage.asset._ref)).map((p) => `${p.slug.current}: ${rows.get(p.slug.current) ?? 'no thumbnail'}`)
    assert.deepEqual(wrong, [])
  })
  await t.test('each one is its post\'s cover (the primary image)', () => {
    const wrong = shown.filter((p) => {
      const html = readFileSync(new URL(`blog-posts/${p.slug.current}/index.html`, root), 'utf8')
      const primary = /"@id":"[^"]*#primaryimage"[^}]*?"url":"https:\/\/cdn\.sanity\.io\/images\/[^/]+\/[^/]+\/([0-9a-f]{40}-\d+x\d+)/.exec(html)?.[1]
      return primary !== hash(p.mainImage.asset._ref)
    })
    assert.deepEqual(wrong.map((p) => p.slug.current), [])
  })
})
