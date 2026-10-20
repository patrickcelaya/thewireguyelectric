// Tests for the Ignored Build Step, against a mock server standing in for both the production
// deployment (/build-info.json) and Sanity's query API.
//
//   pnpm --filter web test
import assert from 'node:assert/strict'
import {execFile} from 'node:child_process'
import {createHash} from 'node:crypto'
import http from 'node:http'
import {after, before, beforeEach, describe, test} from 'node:test'
import {fileURLToPath} from 'node:url'
import {DELIVERY_VARS, buildSettings, contentHash, contentSource} from '../src/config/build-info.mjs'
import {decide} from './ignore-build.mjs'

const SHA = 'a'.repeat(40)
const HOUR = 3_600_000
/** 05:00 on Oct 20 in Arizona (UTC−7, no daylight saving time). */
const NOW = Date.parse('2026-10-20T12:00:00Z')
const DOCS = [
  {_id: 'siteSettings', _rev: 'r3'},
  {_id: 'post-b', _rev: 'r2'},
  {_id: 'post-a', _rev: 'r1'},
]
const sha256 = (s) => createHash('sha256').update(s).digest('hex')
const HASH = sha256('post-a:r1\npost-b:r2\nsiteSettings:r3')
/** No form destination set, as ENV has none. */
const NO_DELIVERY = {FORMSPARK_FORM_ID: false, LEAD_WEBHOOK_URL: false, RESEND_API_KEY: false, LEADS_TO_EMAIL: false}

/** What the mock answers; each test adjusts it. */
let mock
/** The requests the mock received. */
let requests
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://mock')
  requests.push({path: url.pathname, query: url.searchParams, headers: req.headers})
  if (url.pathname === '/build-info.json') {
    if (mock.hang) return // never answers: the timeout test
    if (mock.redirect) {
      res.writeHead(301, {location: mock.redirect})
      return res.end()
    }
    res.writeHead(mock.infoStatus, {'content-type': mock.infoType ?? 'application/json'})
    return res.end(typeof mock.info === 'string' ? mock.info : JSON.stringify(mock.info))
  }
  if (url.pathname === '/elsewhere/build-info.json') {
    res.writeHead(200, {'content-type': 'application/json'})
    return res.end(JSON.stringify(mock.info))
  }
  if (url.pathname === '/v2026-10-01/data/query/production') {
    res.writeHead(mock.sanityStatus, {'content-type': 'application/json'})
    return res.end(JSON.stringify({result: mock.docs}))
  }
  res.writeHead(404)
  res.end()
})
let origin

// Route the real hosts to the mock, so the URLs the script builds are what gets tested.
const mockFetch = (url, init) => {
  const u = new URL(url)
  assert.ok(['www.thewireguyelectric.com', 'thewireguyelectric.com', 'thewireguyelectric.vercel.app', 'qhi2uf0l.api.sanity.io'].includes(u.host), `unexpected host ${u.host}`)
  assert.equal(u.protocol, 'https:')
  return fetch(`${origin}${u.pathname}${u.search}`, init)
}

const ENV = {
  VERCEL_ENV: 'production',
  VERCEL_PROJECT_PRODUCTION_URL: 'www.thewireguyelectric.com',
  VERCEL_GIT_COMMIT_SHA: SHA,
  PUBLIC_SANITY_PROJECT_ID: 'qhi2uf0l',
  PUBLIC_SANITY_DATASET: 'production',
  SITE_INDEXABLE: 'true',
}
const run = (env = {}, options = {}) => decide({...ENV, ...env}, {fetch: mockFetch, now: NOW, ...options})

before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${server.address().port}`
})
after(() => {
  server.closeAllConnections()
  server.close()
})
beforeEach(() => {
  requests = []
  mock = {
    infoStatus: 200,
    info: {sha: SHA, contentHash: HASH, builtAt: new Date(NOW - 2 * HOUR).toISOString(), content: 'sanity:qhi2uf0l/production', indexable: true, delivery: {...NO_DELIVERY}},
    sanityStatus: 200,
    docs: DOCS,
  }
})

describe('builds', () => {
  test('a preview deployment, without asking anything', async () => {
    const r = await run({VERCEL_ENV: 'preview'})
    assert.equal(r.build, true)
    assert.match(r.reason, /VERCEL_ENV=preview/)
    assert.equal(requests.length, 0)
  })

  test('when VERCEL_ENV is missing (System Environment Variables not exposed)', async () => {
    assert.equal((await run({VERCEL_ENV: undefined})).build, true)
  })

  test('when there is no production URL', async () => {
    const r = await run({VERCEL_PROJECT_PRODUCTION_URL: ''})
    assert.equal(r.build, true)
    assert.match(r.reason, /VERCEL_PROJECT_PRODUCTION_URL/)
  })

  test('when build-info.json is missing (production predates it)', async () => {
    mock.infoStatus = 404
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /answered 404/)
  })

  test('when the production deployment is protected and the bypass is refused', async () => {
    mock.infoStatus = 401
    assert.equal((await run()).build, true)
  })

  test('when build-info.json is not valid JSON', async () => {
    mock.info = '{"sha": "aaa'
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /could not read/)
  })

  test("when protection answers with Vercel's login page", async () => {
    mock.info = '<!doctype html><title>Login</title>'
    mock.infoType = 'text/html; charset=utf-8'
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /not JSON: protected without a bypass secret/)
  })

  test('when build-info.json has no SHA', async () => {
    mock.info = {contentHash: HASH}
    assert.equal((await run()).build, true)
  })

  test('when the connection fails', async () => {
    const refused = (url, init) => fetch(`http://127.0.0.1:1${new URL(url).pathname}`, init)
    const r = await run({}, {fetch: refused})
    assert.equal(r.build, true)
    assert.match(r.reason, /could not read/)
  })

  test('when production does not answer in time', async () => {
    mock.hang = true
    const r = await run({}, {timeoutMs: 200})
    assert.equal(r.build, true)
    assert.match(r.reason, /could not read/)
  })

  test('on a new commit, without asking Sanity', async () => {
    const r = await run({VERCEL_GIT_COMMIT_SHA: 'b'.repeat(40)})
    assert.equal(r.build, true)
    assert.match(r.reason, /new commit \(aaaaaaa → bbbbbbb\)/)
    assert.deepEqual(
      requests.map((q) => q.path),
      ['/build-info.json'],
    )
  })

  test('when VERCEL_GIT_COMMIT_SHA is missing', async () => {
    assert.equal((await run({VERCEL_GIT_COMMIT_SHA: undefined})).build, true)
  })

  test('when SITE_INDEXABLE changed on the same commit (the launch switch)', async () => {
    mock.info.indexable = false
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /SITE_INDEXABLE changed \(false → true\)/)
  })

  test('when the content source changed', async () => {
    const r = await run({PUBLIC_SANITY_DATASET: 'staging'})
    assert.equal(r.build, true)
    assert.match(r.reason, /content source changed/)
  })

  test('when a form destination was added on the same commit, without asking Sanity', async () => {
    const r = await run({FORMSPARK_FORM_ID: 'test-form'})
    assert.equal(r.build, true)
    assert.match(r.reason, /form delivery changed \(FORMSPARK_FORM_ID set\)/)
    assert.deepEqual(
      requests.map((q) => q.path),
      ['/build-info.json'],
    )
  })

  test('when a form destination was removed', async () => {
    mock.info.delivery.LEAD_WEBHOOK_URL = true
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /form delivery changed \(LEAD_WEBHOOK_URL unset\)/)
  })

  test('when email delivery gains one of its two variables', async () => {
    mock.info.delivery.RESEND_API_KEY = true
    const r = await run({RESEND_API_KEY: 'test-key', LEADS_TO_EMAIL: 'office@example.com'})
    assert.equal(r.build, true)
    assert.match(r.reason, /\(LEADS_TO_EMAIL set\)/)
  })

  test('when production predates the delivery fingerprint', async () => {
    delete mock.info.delivery
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /form delivery changed/)
  })

  test('when a document was published (a new _rev)', async () => {
    mock.docs = [...DOCS.slice(0, 2), {_id: 'post-a', _rev: 'r9'}]
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /content changed/)
  })

  test('when a document was deleted or unpublished', async () => {
    mock.docs = DOCS.slice(0, 2)
    assert.equal((await run()).build, true)
  })

  test('when production recorded no content hash', async () => {
    mock.info.contentHash = null
    assert.equal((await run()).build, true)
  })

  test('when Sanity fails', async () => {
    mock.sanityStatus = 500
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /could not hash the content \(Sanity answered 500\)/)
  })

  test('when the last build is more than 20 hours old', async () => {
    mock.info.builtAt = new Date(NOW - 21 * HOUR).toISOString()
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /21\.0 h old/)
  })

  test('when builtAt is not a date', async () => {
    mock.info.builtAt = 'yesterday'
    assert.equal((await run()).build, true)
  })

  test('when builtAt is still to come (a clock ahead)', async () => {
    mock.info.builtAt = new Date(NOW + 3 * HOUR).toISOString()
    const r = await run()
    assert.equal(r.build, true)
    assert.match(r.reason, /builtAt still to come/)
  })

  // The daily call comes at 00:17 Arizona time (07:17 UTC)
  test('on the daily call after a build earlier the day before, under 20 hours ago', async () => {
    mock.info.builtAt = '2026-10-19T12:00:00Z' // 05:00 Oct 19 in Arizona
    const r = await run({}, {now: Date.parse('2026-10-20T07:17:00Z')})
    assert.equal(r.build, true)
    assert.match(r.reason, /last build was on 2026-10-19, Arizona time \(19\.3 h ago\); today is 2026-10-20/)
  })

  test('on the day after a job closes, whatever the last build was for', async () => {
    mock.info.builtAt = '2026-11-18T12:00:00Z' // the job's validThrough day
    assert.equal((await run({}, {now: Date.parse('2026-11-19T07:17:00Z')})).build, true)
  })

  test('on the first daily call of a new year (the footer year)', async () => {
    mock.info.builtAt = '2026-12-31T13:00:00Z'
    assert.equal((await run({}, {now: Date.parse('2027-01-01T07:17:00Z')})).build, true)
  })

  test('after 20 hours even on the same Arizona day', async () => {
    mock.info.builtAt = '2026-10-20T07:30:00Z' // 00:30 in Arizona
    const r = await run({}, {now: Date.parse('2026-10-21T06:30:00Z')}) // 23:30 the same day
    assert.equal(r.build, true)
    assert.match(r.reason, /23\.0 h old/)
  })

  test('when the bypass would have to follow a redirect off the Vercel alias', async () => {
    mock.redirect = '/elsewhere/build-info.json' // relative, so a followed redirect stays on the mock
    const r = await run({VERCEL_PROJECT_PRODUCTION_URL: 'thewireguyelectric.vercel.app', VERCEL_AUTOMATION_BYPASS_SECRET: 'test-bypass'})
    assert.equal(r.build, true)
    assert.match(r.reason, /answered 301/)
    assert.deepEqual(
      requests.map((q) => q.path),
      ['/build-info.json'],
    )
  })
})

describe('skips', () => {
  test('when commit, settings and content match a build under 20 hours old', async () => {
    const r = await run()
    assert.equal(r.build, false)
    assert.match(r.reason, /2\.0 h ago/)
    const [info, query] = requests
    assert.equal(info.path, '/build-info.json')
    assert.equal(info.headers['x-vercel-protection-bypass'], undefined)
    // the published perspective, drafts left out, from the API host (not the CDN)
    assert.equal(query.query.get('perspective'), 'published')
    assert.match(query.query.get('query'), /!\(_id in path\("drafts\.\*\*"\)\)/)
  })

  test('just under the 20-hour limit, on the same Arizona day', async () => {
    const now = Date.parse('2026-10-21T04:00:00Z') // 21:00 Oct 20 in Arizona
    mock.info.builtAt = new Date(now - 20 * HOUR + 60_000).toISOString() // 01:01 the same day
    assert.equal((await run({}, {now})).build, false)
  })

  test('on a call later the same Arizona day as the last build, across midnight UTC', async () => {
    mock.info.builtAt = '2026-10-20T08:00:00Z' // 01:00 Oct 20 in Arizona
    assert.equal((await run({}, {now: Date.parse('2026-10-21T02:00:00Z')})).build, false) // 19:00 Oct 20
  })

  test('whatever order Sanity returns the documents in', async () => {
    mock.docs = [...DOCS].reverse()
    assert.equal((await run()).build, false)
  })

  test('when a form destination that was set keeps a value (only presence is compared)', async () => {
    mock.info.delivery = {...NO_DELIVERY, FORMSPARK_FORM_ID: true}
    assert.equal((await run({FORMSPARK_FORM_ID: 'another-form'})).build, false)
  })

  test('sending the protection bypass to the Vercel alias when Vercel provides one', async () => {
    const r = await run({VERCEL_PROJECT_PRODUCTION_URL: 'thewireguyelectric.vercel.app', VERCEL_AUTOMATION_BYPASS_SECRET: 'test-bypass'})
    assert.equal(r.build, false)
    assert.equal(requests[0].headers['x-vercel-protection-bypass'], 'test-bypass')
  })

  test('never sending the protection bypass to a custom domain, and following the apex redirect', async () => {
    for (const host of ['www.thewireguyelectric.com', 'thewireguyelectric.com']) {
      requests = []
      mock.redirect = host === 'thewireguyelectric.com' ? '/elsewhere/build-info.json' : undefined // the apex's 301 to www
      const r = await run({VERCEL_PROJECT_PRODUCTION_URL: host, VERCEL_AUTOMATION_BYPASS_SECRET: 'test-bypass'})
      assert.equal(r.build, false, `${host}: ${r.reason}`)
      const infos = requests.filter((q) => q.path.endsWith('/build-info.json'))
      assert.equal(infos.length, host === 'thewireguyelectric.com' ? 2 : 1)
      for (const q of infos) assert.equal(q.headers['x-vercel-protection-bypass'], undefined, `${host}${q.path}`)
    }
  })

  test('sending the read token to Sanity when one is set', async () => {
    assert.equal((await run({SANITY_API_READ_TOKEN: 'test-token'})).build, false)
    assert.equal(requests[1].headers.authorization, 'Bearer test-token')
  })

  test('with the local dataset, by hashing the NDJSON', async () => {
    const local = contentSource({})
    mock.info = {...mock.info, content: local.label, contentHash: await contentHash(local)}
    const r = await run({PUBLIC_SANITY_PROJECT_ID: ''})
    assert.equal(r.build, false)
    assert.equal(requests.length, 1)
  })
})

describe('build-info.json', () => {
  test('records whether each form destination is set, never its value', () => {
    const values = {FORMSPARK_FORM_ID: 'form-id-123', LEAD_WEBHOOK_URL: 'https://hooks.example.com/abc', RESEND_API_KEY: 're_key_456', LEADS_TO_EMAIL: 'leads@example.com'}
    const settings = buildSettings({...values, LEADS_TO_EMAIL: ''})
    assert.deepEqual(Object.keys(settings.delivery), DELIVERY_VARS)
    assert.deepEqual(settings.delivery, {FORMSPARK_FORM_ID: true, LEAD_WEBHOOK_URL: true, RESEND_API_KEY: true, LEADS_TO_EMAIL: false})
    const json = JSON.stringify(buildSettings(values))
    for (const value of Object.values(values)) {
      assert.ok(!json.includes(value), `${value} leaked`)
      assert.ok(!json.includes(sha256(value)), `a hash of ${value} leaked`)
    }
  })
})

describe('the command', () => {
  const script = fileURLToPath(new URL('./ignore-build.mjs', import.meta.url))
  // asynchronously, so this process's mock server can answer the child
  const exec = (env) =>
    new Promise((resolve) => execFile(process.execPath, [script], {env: {PATH: process.env.PATH, ...env}}, (error, stdout) => resolve({status: error ? error.code : 0, stdout})))

  test('exits 1 (build) on a preview', async () => {
    const r = await exec({VERCEL_ENV: 'preview'})
    assert.equal(r.status, 1)
    assert.match(r.stdout, /\[ignore-build\] Building: not a production deployment/)
  })

  test('exits 0 (skip) when nothing changed, and 1 once production is unreachable', async () => {
    const local = contentSource({})
    mock.info = {...mock.info, content: local.label, contentHash: await contentHash(local), builtAt: new Date().toISOString()}
    const env = {VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: origin, VERCEL_GIT_COMMIT_SHA: SHA, SITE_INDEXABLE: 'true'}
    const skipped = await exec(env)
    assert.equal(skipped.status, 0, skipped.stdout)
    assert.match(skipped.stdout, /\[ignore-build\] Skipping the build: same commit/)
    const built = await exec({...env, VERCEL_PROJECT_PRODUCTION_URL: 'http://127.0.0.1:1'})
    assert.equal(built.status, 1)
    assert.match(built.stdout, /\[ignore-build\] Building: could not read/)
  })
})
