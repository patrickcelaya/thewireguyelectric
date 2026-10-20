// The /review short link must reach the main (Mesa) Google Business Profile: its place ID encodes the
// profile's CID, which must be the Google Maps CID in migration/content-data/profiles.json sameAs.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {SHORT_LINKS} from '../src/config/redirects.mjs'

/** A ChIJ… place ID is base64 protobuf: field 1 { fixed64 feature id, fixed64 CID }. */
function placeIdCid(placeId) {
  const b = Buffer.from(placeId.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  assert.equal(b[0], 0x0a, 'place ID: field 1')
  assert.equal(b[2], 0x09, 'place ID: fixed64 feature id')
  assert.equal(b[11], 0x11, 'place ID: fixed64 CID')
  return b.readBigUInt64LE(12).toString()
}

test('/review goes to the write-a-review form of the profile in profiles.json sameAs', async () => {
  const review = SHORT_LINKS['/review']
  assert.equal(review.status, 302)
  const url = new URL(review.destination)
  assert.equal(url.origin + url.pathname, 'https://search.google.com/local/writereview')
  const profiles = JSON.parse(await readFile(new URL('../../migration/content-data/profiles.json', import.meta.url), 'utf8'))
  const cids = profiles.sameAs.add.map((u) => /google\.com\/maps\?cid=(\d+)/.exec(u)?.[1]).filter(Boolean)
  assert.equal(cids.length, 1, 'one Google profile in sameAs')
  assert.equal(placeIdCid(url.searchParams.get('placeid')), cids[0])
})
