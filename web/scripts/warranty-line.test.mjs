// The one warranty line (decision D17, owner 2026-10-19) lives in two places: WARRANTY_LINE in src/lib/site.ts,
// which the service at-a-glance facts and /estimate show, and the D17 copy edits in
// migration/content-edits/decisions.json, which put it in the FAQ answer and the homepage card. This test keeps
// the two word for word the same.
import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('the D17 copy edits end with WARRANTY_LINE word for word', async () => {
  const site = await read('web/src/lib/site.ts')
  const line = site.match(/export const WARRANTY_LINE = '([^']+)'/)?.[1]
  assert.ok(line, 'WARRANTY_LINE is a plain string in web/src/lib/site.ts')
  const {edits} = JSON.parse(await read('migration/content-edits/decisions.json'))
  const d17 = edits.filter((e) => /^D17-/.test(e.id) && !e.skip)
  assert.ok(d17.length > 0, 'decisions.json has D17 edits')
  for (const e of d17) assert.ok(e.new_text.endsWith(line), `${e.id} ends with "${line}"`)
})
