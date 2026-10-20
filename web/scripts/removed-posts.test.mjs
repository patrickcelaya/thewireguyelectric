// Posts removed on purpose (decision D15: the generator posts) must 301 to the page the parity gate approved,
// from their /blog-posts/ URL and their old /blog/ path, in one hop. The removal is recorded in three places:
// migration/content-data/removed-posts.json (the content pipeline leaves the post out), the parity allowlist's
// `removed` (migration/seo-intentional-changes.json) and LEGACY_REDIRECTS. This test keeps them in step.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {LEGACY_REDIRECTS, flattenRedirects} from '../src/config/redirects.mjs'

const readJson = async (path) => JSON.parse(await readFile(new URL(`../../${path}`, import.meta.url), 'utf8'))

test('every removed post redirects, in one hop, to the page the parity allowlist approved', async () => {
  const [{posts}, allowlist] = await Promise.all([readJson('migration/content-data/removed-posts.json'), readJson('migration/seo-intentional-changes.json')])
  const removed = allowlist.removed ?? {}
  assert.deepEqual(
    Object.fromEntries(posts.map((p) => [`/blog-posts/${p.slug}`, p.redirect])),
    Object.fromEntries(Object.entries(removed).map(([path, r]) => [path, r.redirect])),
    'removed-posts.json and the allowlist name the same posts and targets',
  )
  const flat = flattenRedirects(LEGACY_REDIRECTS)
  for (const {slug, redirect} of posts) {
    assert.equal(LEGACY_REDIRECTS[`/blog-posts/${slug}`], redirect, `/blog-posts/${slug}`)
    assert.equal(LEGACY_REDIRECTS[`/blog/${slug}`], redirect, `/blog/${slug}`)
    assert.equal(flat[`/blog-posts/${slug}`], redirect, `/blog-posts/${slug} is one hop`)
    assert.equal(LEGACY_REDIRECTS[redirect], undefined, `${redirect} is a live page, not another redirect`)
  }
  for (const path of Object.keys(removed)) assert.ok(!(allowlist.frozenTitleAndH1 ?? []).includes(path), `${path} is Tier 1`)
})
