#!/usr/bin/env node
// Launch-day verification for www.thewireguyelectric.com (or any build of it).
//
//   node scripts/launch/verify.mjs --base https://www.thewireguyelectric.com
//   node scripts/launch/verify.mjs --base https://thewireguyelectric.vercel.app --allow-noindex   # protected preview
//   PUBLIC_SANITY_PROJECT_ID= node scripts/launch/verify.mjs --base http://localhost:4321          # serve-build.mjs, local dataset
//
// Checks, in order (each prints PASS / WARN / FAIL / INFO; exit 1 on any FAIL):
//   domain     apex -> www in one 301/308 (path and query kept); http -> https in one hop;
//              http://apex reaches https://www in at most two hops (only for the production host)
//   robots     robots.txt is 200 text/plain, has no "Disallow: /" for *, lists the www sitemap
//   sitemap    the expected URL count, every <url> has a valid <lastmod> (not in the future),
//              https www locs, no trailing slashes, no duplicates
//   pages      every sitemap URL answers 200 (no redirect) as HTML, with no noindex (header or meta),
//              exactly one canonical equal to its sitemap loc, og:url equal to the canonical, a <title>,
//              one <h1>; google-site-verification on the homepage
//   ga         the GA4 snippet (G-4ZYV7JMRJH, gated to www.thewireguyelectric.com) is in every page
//   slash      every sitemap path with a trailing slash 308s to the path without it, in one hop
//   redirects  every rule in web/src/config/redirects.mjs (legacy + GSC misspellings), every
//              /blog/<slug> post redirect and every enabled Sanity Redirect document: one hop,
//              right status, right target, target answers 200; same for the trailing-slash spelling.
//              Intentionally removed URLs answer 404/410; an unknown URL answers 404 (no soft 404s)
//   form       GET /api/contact answers 405 with Allow: POST; an empty POST answers 400 (stops at
//              validation, so no lead is created); build-info.json says at least one lead
//              destination (FORMSPARK_FORM_ID, a webhook or email) was set for the build
//   hygiene    WARN only: frame headers (X-Frame-Options, CSP frame-ancestors) as the live site sends,
//              /x/index.html 301s to /x, /favicon.ico answers, /build-info.json is served (the Ignored
//              Build Step reads it), and on www: the production .vercel.app alias is not indexable
//   parity     scripts/seo/crawl.mjs + scripts/seo/parity.mjs against migration/seo-baseline.json
//
// Expected redirects come from Sanity (production) unless PUBLIC_SANITY_PROJECT_ID is set; set it
// empty to check a build of the local dataset.
//
// Options:
//   --allow-noindex     a pre-launch build: noindex/robots-blocked/no-GA are reported, not failed
//   --expect-sitemap N  expected sitemap size (default 94: 96 until the two generator posts were removed, D15)
//   --ga-id ID          default G-4ZYV7JMRJH;  --gsv VALUE  default the Sanity value (mW1y…)
//   --no-domain --no-redirects --no-form --no-hygiene --no-parity   skip a group
//   --concurrency N     parallel requests (default 3)
//   --out DIR           where the JSON report and the parity files go (default: OS temp dir)
//   --repo DIR          repository root (default: two levels up from this file)
//   VERBOSE=1           print the full detail of passing checks too
// Protected Vercel deployments: export VERCEL_AUTOMATION_BYPASS_SECRET (sent to *.vercel.app hosts only).

import {spawn} from 'node:child_process'
import {mkdir, writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const argv = process.argv.slice(2)
const flag = (k) => argv.includes(`--${k}`)
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}

const PROD_HOST = 'www.thewireguyelectric.com'
const SITE = `https://${PROD_HOST}`
const APEX = 'thewireguyelectric.com'
const PROD_ALIAS = 'thewireguyelectric.vercel.app'
const base = new URL(opt('base', SITE))
const allowNoindex = flag('allow-noindex')
const expectSitemap = Number(opt('expect-sitemap', 94))
const gaId = opt('ga-id', 'G-4ZYV7JMRJH')
const gsv = opt('gsv', 'mW1yfCySi6NNyQyHBXBsvC650sFk8im69Ps7eNQ7Jy0')
const concurrency = Number(opt('concurrency', 3))
const repo = path.resolve(opt('repo', path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')))
const outDir = path.resolve(opt('out', path.join(os.tmpdir(), `wireguy-launch-verify-${Date.now()}`)))
const isProd = base.hostname === PROD_HOST
const isLocal = /^(localhost|127\.0\.0\.1)$/.test(base.hostname)

const require = createRequire(path.join(repo, 'package.json'))
const cheerio = require('cheerio')

const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
function headersFor(url) {
  const h = {'user-agent': 'WireGuyLaunchVerify/1.0 (+launch check)'}
  if (bypass && new URL(url).hostname.endsWith('.vercel.app')) h['x-vercel-protection-bypass'] = bypass
  return h
}
async function get(url, init = {}) {
  return fetch(url, {redirect: 'manual', ...init, headers: {...headersFor(url), ...(init.headers ?? {})}})
}
const errorCode = (e) => String(e?.cause?.code ?? e?.message ?? e)
/** Follow redirects by hand (max 6), recording each hop. A network error ends the chain with status "error …". */
async function chain(url) {
  const hops = []
  let current = new URL(url)
  for (let i = 0; i < 6; i++) {
    let res
    try {
      res = await get(current.href)
    } catch (e) {
      return {hops, final: current.href, status: `error ${errorCode(e)}`}
    }
    const loc = res.headers.get('location')
    await res.arrayBuffer().catch(() => {})
    if (res.status >= 300 && res.status < 400 && loc) {
      const next = new URL(loc, current)
      hops.push({status: res.status, from: current.href, to: next.href})
      current = next
      continue
    }
    return {hops, final: current.href, status: res.status}
  }
  return {hops, final: current.href, status: 'loop'}
}
const hopText = (r) => `${r.hops.map((h) => `${h.status} ${h.to}`).join(' | ')} => ${r.status}`
async function pool(items, fn) {
  let i = 0
  const results = []
  await Promise.all(
    Array.from({length: Math.min(concurrency, items.length)}, async () => {
      while (i < items.length) {
        const idx = i++
        results[idx] = await fn(items[idx]).catch((e) => ({item: items[idx], error: errorCode(e)}))
      }
    }),
  )
  return results
}

const report = {base: base.href, startedAt: new Date().toISOString(), allowNoindex, groups: {}}
let failures = 0
let warnings = 0
function record(group, level, check, detail) {
  ;(report.groups[group] ??= []).push({level, check, detail})
  if (level === 'FAIL') failures++
  if (level === 'WARN') warnings++
  const shown = detail && (level !== 'PASS' || process.env.VERBOSE) ? ` — ${detail}` : ''
  console.log(`${level.padEnd(4)} [${group}] ${check}${shown}`)
}
/** A check that must pass on a launched site but is expected to fail on a pre-launch build. */
const strict = (ok) => (ok ? 'PASS' : allowNoindex ? 'INFO' : 'FAIL')
const at = (p) => new URL(p, base).href
const samePlace = (a, b) => {
  const x = new URL(a, base)
  const y = new URL(b, base)
  return x.pathname === y.pathname && x.search === y.search && (x.host === y.host || x.host === base.host || y.host === base.host)
}
const list = (rows, fmt, max = 25) => rows.slice(0, max).map(fmt).join(', ') + (rows.length > max ? ` …(+${rows.length - max})` : '')

// ---------- domain ----------
async function checkDomain() {
  if (flag('no-domain')) return
  if (!isLocal) {
    const r = await chain(`http://${base.host}/services/panels`)
    const ok = r.hops.length === 1 && [301, 308].includes(r.hops[0].status) && r.final === `https://${base.host}/services/panels` && r.status === 200
    record('domain', ok ? 'PASS' : 'FAIL', `http -> https on ${base.host} in one hop`, hopText(r))
  }
  if (!isProd) {
    record('domain', 'INFO', 'apex -> www skipped', `base is ${base.host}, not ${PROD_HOST}`)
    return
  }
  for (const p of ['/', '/services/panels?utm_source=verify']) {
    const r = await chain(`https://${APEX}${p}`)
    const want = `${SITE}${p}`
    const ok = r.hops.length === 1 && [301, 308].includes(r.hops[0].status) && r.final === want && r.status === 200
    record('domain', ok ? 'PASS' : 'FAIL', `https://${APEX}${p} -> ${want} in one hop`, hopText(r))
  }
  const r = await chain(`http://${APEX}/services/panels`)
  const ok = r.final === `${SITE}/services/panels` && r.status === 200
  record('domain', ok ? (r.hops.length <= 1 ? 'PASS' : r.hops.length === 2 ? 'WARN' : 'FAIL') : 'FAIL', `http://${APEX}/services/panels -> ${SITE}/services/panels`, `${r.hops.length} hops: ${hopText(r)}`)
  const home = await get(`${SITE}/`)
  await home.arrayBuffer().catch(() => {})
  record('domain', home.headers.get('strict-transport-security') ? 'PASS' : 'WARN', 'HSTS header on www', home.headers.get('strict-transport-security') ?? 'missing')
  record('domain', home.headers.get('server')?.toLowerCase().includes('vercel') ? 'PASS' : 'FAIL', 'www is served by Vercel', `server: ${home.headers.get('server')}`)
}

// ---------- robots ----------
async function checkRobots() {
  const res = await get(at('/robots.txt'))
  const body = await res.text()
  const type = res.headers.get('content-type') ?? ''
  record('robots', res.status === 200 && type.startsWith('text/plain') ? 'PASS' : 'FAIL', 'robots.txt answers 200 as text/plain', `${res.status} ${type}`)
  const blocksAll = /^\s*disallow:\s*\/\s*$/im.test(body)
  record('robots', strict(!blocksAll), 'robots.txt does not block crawling', blocksAll ? body.replace(/\n/g, ' \\n ') : '')
  const sm = body.includes(`Sitemap: ${SITE}/sitemap.xml`)
  record('robots', strict(sm), `robots.txt lists ${SITE}/sitemap.xml`, sm ? '' : body.replace(/\n/g, ' \\n '))
}

// ---------- sitemap ----------
async function readSitemap() {
  const res = await get(at('/sitemap.xml'))
  const xml = await res.text()
  record('sitemap', res.status === 200 && /xml/.test(res.headers.get('content-type') ?? '') ? 'PASS' : 'FAIL', 'sitemap.xml answers 200 as XML', `${res.status} ${res.headers.get('content-type')}`)
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1],
    lastmod: m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1],
  }))
  record('sitemap', entries.length === expectSitemap ? 'PASS' : 'FAIL', `sitemap lists ${expectSitemap} URLs`, `found ${entries.length}`)
  const today = new Date().toISOString().slice(0, 10)
  const noLastmod = entries.filter((e) => !e.lastmod || !/^\d{4}-\d{2}-\d{2}/.test(e.lastmod) || e.lastmod.slice(0, 10) > today)
  record('sitemap', noLastmod.length ? 'FAIL' : 'PASS', 'every <url> has a valid, non-future <lastmod>', list(noLastmod, (e) => `${e.loc} ${e.lastmod ?? 'missing'}`))
  const badLoc = entries.filter((e) => !e.loc?.startsWith(`${SITE}/`) || (e.loc !== `${SITE}/` && e.loc.endsWith('/')))
  record('sitemap', badLoc.length ? 'FAIL' : 'PASS', `every <loc> is ${SITE}/… with no trailing slash`, list(badLoc, (e) => e.loc))
  const dupes = entries.map((e) => e.loc).filter((l, i, all) => all.indexOf(l) !== i)
  record('sitemap', dupes.length ? 'FAIL' : 'PASS', 'no duplicate <loc>', dupes.join(', '))
  return entries.filter((e) => e.loc)
}

// ---------- pages ----------
async function checkPages(entries) {
  const results = await pool(entries, async (e) => {
    const p = new URL(e.loc).pathname
    const res = await get(at(p))
    const out = {path: p, status: res.status, xrt: res.headers.get('x-robots-tag'), type: res.headers.get('content-type')}
    if (!(out.type ?? '').includes('text/html')) {
      await res.arrayBuffer().catch(() => {})
      return out
    }
    const $ = cheerio.load(await res.text())
    out.robots = $('meta[name="robots"]').attr('content') ?? null
    out.canonicals = $('link[rel="canonical"]').map((_, el) => $(el).attr('href')).get()
    out.ogUrl = $('meta[property="og:url"]').attr('content') ?? null
    out.title = $('head > title').text().trim()
    out.h1 = $('h1').length
    out.gsv = $('meta[name="google-site-verification"]').map((_, el) => $(el).attr('content')).get()
    const inline = $('script:not([src])').map((_, el) => $(el).html()).get().join('\n')
    out.ga = inline.includes(`"${gaId}"`) && inline.includes(`"${PROD_HOST}"`) && /location\.hostname\s*===\s*gaHost/.test(inline)
    return out
  })
  const fail = (rows, check, fmt, level = 'FAIL') => record('pages', rows.length ? level : 'PASS', check, list(rows, fmt))
  fail(results.filter((r) => r.error || r.status !== 200), `all ${results.length} sitemap URLs answer 200 without a redirect`, (r) => `${r.path ?? r.item?.loc} ${r.error ?? r.status}`)
  fail(results.filter((r) => r.status === 200 && !(r.type ?? '').includes('text/html')), 'every sitemap URL is HTML', (r) => `${r.path} ${r.type}`)
  const noindex = results.filter((r) => /noindex/i.test(r.xrt ?? '') || /noindex/i.test(r.robots ?? ''))
  fail(noindex, 'no noindex (X-Robots-Tag or meta robots) on any sitemap URL', (r) => `${r.path} meta=${r.robots} header=${r.xrt}`, allowNoindex ? 'INFO' : 'FAIL')
  const want = (r) => (r.path === '/' ? `${SITE}/` : `${SITE}${r.path}`)
  fail(results.filter((r) => r.canonicals && (r.canonicals.length !== 1 || r.canonicals[0] !== want(r))), 'exactly one canonical = https://www… + path (no trailing slash)', (r) => `${r.path} ${JSON.stringify(r.canonicals)}`)
  fail(results.filter((r) => r.canonicals && r.ogUrl !== r.canonicals[0]), 'og:url = canonical', (r) => `${r.path} ${r.ogUrl}`)
  fail(results.filter((r) => r.canonicals && !r.title), 'every page has a <title>', (r) => r.path)
  fail(results.filter((r) => r.canonicals && r.h1 !== 1), 'every page has one <h1>', (r) => `${r.path} ${r.h1}`, 'WARN')
  const home = results.find((r) => r.path === '/')
  record('pages', home?.gsv?.includes(gsv) ? 'PASS' : 'FAIL', 'google-site-verification meta on the homepage', JSON.stringify(home?.gsv))
  const noGa = results.filter((r) => r.canonicals && !r.ga)
  record('ga', noGa.length ? (allowNoindex ? 'INFO' : 'FAIL') : 'PASS', `GA4 ${gaId} snippet gated to ${PROD_HOST} on every page`, noGa.length ? `${noGa.length} pages without it, e.g. ${noGa.slice(0, 5).map((r) => r.path).join(', ')}` : '')
  report.pages = results
}

// ---------- trailing slash ----------
async function checkSlash(entries) {
  const paths = entries.map((e) => new URL(e.loc).pathname).filter((p) => p !== '/')
  const rows = await pool(paths, async (p) => ({p, r: await chain(at(`${p}/`))}))
  const bad = rows.filter(({p, r}) => r.hops.length !== 1 || ![301, 308].includes(r.hops[0].status) || new URL(r.final).pathname !== p || r.status !== 200)
  record('slash', bad.length ? 'FAIL' : 'PASS', `/x/ -> /x in one 308 for all ${paths.length} sitemap paths`, list(bad, ({p, r}) => `${p}/ ${hopText(r)}`, 10))
}

// ---------- redirects ----------
async function expectedRedirects() {
  const mod = await import(pathToFileURL(path.join(repo, 'web/src/config/redirects.mjs')).href)
  const projectId = process.env.PUBLIC_SANITY_PROJECT_ID ?? 'qhi2uf0l'
  const dataset = process.env.PUBLIC_SANITY_DATASET || 'production'
  const sanity = {projectId, dataset, token: process.env.SANITY_API_READ_TOKEN}
  const [slugs, fromSanity] = await Promise.all([
    mod.loadPostSlugs({...sanity, localDataset: pathToFileURL(path.join(repo, 'migration/sanity-import/production.ndjson'))}),
    mod.loadSanityRedirects(sanity),
  ])
  const legacy = mod.LEGACY_REDIRECTS
  const flat = mod.flattenRedirects({...legacy, ...mod.postRedirects(slugs), ...fromSanity})
  return Object.entries(flat).map(([source, v]) => ({
    source,
    destination: typeof v === 'string' ? v : v.destination,
    status: typeof v === 'string' ? 301 : v.status,
    kind: legacy[source] ? 'legacy' : source.startsWith('/blog/') ? 'post' : 'sanity',
  }))
}
async function checkRedirects() {
  if (flag('no-redirects')) return
  const rules = await expectedRedirects()
  const rows = await pool(
    rules.flatMap((rule) => [
      {...rule, from: rule.source},
      {...rule, from: `${rule.source}/`},
    ]),
    async (rule) => ({rule, r: await chain(at(rule.from))}),
  )
  const bad = rows.filter(({rule, r}) => r.hops.length !== 1 || r.hops[0].status !== rule.status || !samePlace(r.final, rule.destination) || r.status !== 200)
  const counts = rules.reduce((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {})
  record(
    'redirects',
    bad.length ? 'FAIL' : 'PASS',
    `${rules.length} redirect rules (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}), with and without a trailing slash: one hop, right status, target 200`,
    bad
      .slice(0, 15)
      .map(({rule, r}) => `${rule.from} want ${rule.status} ${rule.destination}; got ${hopText(r)}`)
      .join(' ;; '),
  )
  // Short links (/review) point off-site, and Google's review form itself redirects a signed-out client to
  // its sign-in page, so these check the one local hop only: exactly the 302 to the destination.
  const {SHORT_LINKS = {}} = await import(pathToFileURL(path.join(repo, 'web/src/config/redirects.mjs')).href)
  const shortRows = await pool(
    Object.entries(SHORT_LINKS).flatMap(([source, v]) => [source, `${source}/`].map((from) => ({from, ...v}))),
    async (rule) => {
      const res = await get(at(rule.from)).catch((e) => ({status: `error ${errorCode(e)}`, headers: new Headers()}))
      await res.arrayBuffer?.().catch(() => {})
      return {rule, status: res.status, location: res.headers.get('location') ?? ''}
    },
  )
  const badShort = shortRows.filter(({rule, status, location}) => status !== rule.status || location !== rule.destination)
  record(
    'redirects',
    badShort.length ? 'FAIL' : 'PASS',
    `${Object.keys(SHORT_LINKS).length} short link(s) (${Object.keys(SHORT_LINKS).join(', ')}), with and without a trailing slash: one ${[...new Set(Object.values(SHORT_LINKS).map((v) => v.status))].join('/')} to the exact destination (not followed: it is off-site)`,
    badShort.map(({rule, status, location}) => `${rule.from} want ${rule.status} ${rule.destination}; got ${status} ${location || '(no location)'}`).join(' ;; '),
  )
  const gone = ['/checkout','/paypal-checkout', '/order-confirmation', '/search', '/templates/style-guide', `/verify-${Date.now().toString(36)}-should-404`]
  const goneRows = await pool(gone, async (p) => ({p, r: await chain(at(p))}))
  const notGone = goneRows.filter(({r}) => r.hops.length || ![404, 410].includes(r.status))
  record('redirects', notGone.length ? 'FAIL' : 'PASS', 'removed and unknown URLs answer 404/410 (no soft 404s)', notGone.map(({p, r}) => `${p} ${hopText(r)}`).join(', '))
}

// ---------- form endpoint ----------
async function checkForm() {
  if (flag('no-form')) return
  // serve-build.mjs serves the static output only; functions answer 501 there
  const emulated = (status) => isLocal && status === 501
  const g = await get(at('/api/contact'))
  await g.arrayBuffer().catch(() => {})
  const allow = g.headers.get('allow') ?? ''
  if (emulated(g.status)) record('form', 'INFO', 'GET /api/contact not emulated by serve-build.mjs', `${g.status}`)
  else if (g.status === 405) record('form', /\bPOST\b/i.test(allow) ? 'PASS' : 'FAIL', 'GET /api/contact answers 405 with Allow: POST', `405, allow: ${allow || 'missing'}`)
  else if (g.status === 404) record('form', 'FAIL', 'GET /api/contact answers 405 with Allow: POST', '404: a build from before the 405 handler (Astro answers 404 for a method the endpoint does not export), or no function deployed')
  else record('form', 'FAIL', 'GET /api/contact answers 405 with Allow: POST', `${g.status}`)

  // An empty POST stops at validation (400) before any delivery code runs: it proves the function is
  // deployed without creating a lead. 503 would only show for a real submission with no delivery channel.
  const p = await get(at('/api/contact'), {method: 'POST', headers: {accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded'}, body: ''})
  const text = (await p.text()).slice(0, 60)
  if (emulated(p.status)) record('form', 'INFO', 'POST /api/contact not emulated by serve-build.mjs', `${p.status}`)
  else if (p.status === 400) record('form', 'PASS', 'POST /api/contact (empty form) answers 400: the function is deployed', `400 "${text}"`)
  else if (p.status === 404 || p.status >= 500) record('form', 'FAIL', 'POST /api/contact (empty form) answers 400: the function is deployed', `${p.status} "${text}"`)
  else record('form', 'WARN', 'POST /api/contact (empty form) answers 400: the function is deployed', `${p.status} "${text}"`)

  // Without a destination every lead answers 503 ("please call"). build-info.json records only whether
  // each variable was set for the build, never its value (web/src/config/build-info.mjs).
  // (a local build has none unless its shell had them, so that is INFO there, as before launch)
  const info = await get(at('/build-info.json'))
  const delivery = (await info.json().catch(() => null))?.delivery
  if (!info.ok || !delivery) record('form', 'WARN', 'build-info.json lists the lead destinations set for this build', `${info.status}: no delivery field`)
  else {
    const set = Object.keys(delivery).filter((name) => delivery[name])
    const usable = delivery.FORMSPARK_FORM_ID || delivery.LEAD_WEBHOOK_URL || (delivery.RESEND_API_KEY && delivery.LEADS_TO_EMAIL)
    record('form', usable ? 'PASS' : allowNoindex || isLocal ? 'INFO' : 'FAIL', 'a lead destination is set for this build (else every form answers 503)', set.length ? set.join(', ') : 'none set')
  }
  record('form', 'INFO', 'delivery is not tested here', 'submit /estimate and /careers by hand and confirm the lead arrives (Formspark / webhook / email)')
}

// ---------- hygiene (WARN only) ----------
async function checkHygiene() {
  if (flag('no-hygiene')) return
  const home = await get(at('/'))
  await home.arrayBuffer().catch(() => {})
  const xfo = home.headers.get('x-frame-options') ?? ''
  const csp = home.headers.get('content-security-policy') ?? ''
  record('hygiene', /sameorigin/i.test(xfo) && /frame-ancestors\s+'self'/i.test(csp) ? 'PASS' : 'WARN', "frame headers as the live site sends them (X-Frame-Options SAMEORIGIN, CSP frame-ancestors 'self')", `x-frame-options: ${xfo || 'missing'}; content-security-policy: ${csp || 'missing'}`)

  const dup = await chain(at('/services/panels/index.html'))
  const dupOk = dup.hops.length === 1 && dup.hops[0].status === 301 && new URL(dup.final).pathname === '/services/panels' && dup.status === 200
  record('hygiene', dupOk ? 'PASS' : 'WARN', '/services/panels/index.html 301s to /services/panels (no duplicate URL)', hopText(dup))

  const ico = await chain(at('/favicon.ico'))
  record('hygiene', ico.status === 200 && ico.hops.length <= 1 ? 'PASS' : 'WARN', '/favicon.ico answers 200', hopText(ico))

  const info = await get(at('/build-info.json'))
  let body = null
  try {
    body = info.ok ? await info.json() : null
  } catch {}
  const infoOk = typeof body?.sha === 'string' && typeof body?.contentHash === 'string' && !Number.isNaN(Date.parse(body?.builtAt))
  record('hygiene', infoOk ? 'PASS' : 'WARN', '/build-info.json is served (the Ignored Build Step compares against it)', infoOk ? `commit ${body.sha.slice(0, 7)}, built ${body.builtAt}, ${body.content}, indexable ${body.indexable}` : `${info.status}${body ? ` ${JSON.stringify(body).slice(0, 120)}` : ''}`)
  if (infoOk && body.indexable !== true) record('hygiene', allowNoindex ? 'INFO' : 'WARN', 'build-info.json says the build is indexable', `indexable: ${body.indexable}`)

  if (isProd) {
    // what the public (no bypass header) gets from the production alias: a redirect to www, a login wall, or noindex
    const res = await fetch(`https://${PROD_ALIAS}/`, {redirect: 'manual', headers: {'user-agent': 'WireGuyLaunchVerify/1.0 (+launch check)'}})
    await res.arrayBuffer().catch(() => {})
    const loc = res.headers.get('location') ?? ''
    const xrt = res.headers.get('x-robots-tag') ?? ''
    const ok = /noindex/i.test(xrt) || [401, 403].includes(res.status) || (res.status >= 300 && res.status < 400 && (loc.startsWith(SITE) || /vercel\.com\/sso/.test(loc)))
    record('hygiene', ok ? 'PASS' : 'WARN', `https://${PROD_ALIAS}/ is not an indexable duplicate of www`, `${res.status}${loc ? ` -> ${loc.slice(0, 80)}` : ''}; x-robots-tag: ${xrt || 'none'}`)
  }
}

// ---------- parity ----------
function run(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {cwd: repo, stdio: ['ignore', 'pipe', 'pipe'], env: process.env})
    let out = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (out += d))
    child.on('close', (code) => resolve({code, out}))
  })
}
async function checkParity() {
  if (flag('no-parity')) return
  const candidate = path.join(outDir, 'seo-candidate.json')
  const crawl = await run(process.execPath, ['scripts/seo/crawl.mjs', '--base', base.origin, '--paths-from', 'migration/seo-baseline.json', '--out', candidate, '--concurrency', String(concurrency)])
  if (crawl.code !== 0) return record('parity', 'FAIL', 'crawl failed', crawl.out.slice(-500))
  const parity = await run(process.execPath, ['scripts/seo/parity.mjs', '--candidate', candidate, '--out', path.join(outDir, 'parity-report.json'), ...(allowNoindex ? ['--allow-noindex'] : [])])
  const summary = parity.out.match(/Summary: (.*)/)?.[1] ?? ''
  record('parity', parity.code === 0 ? 'PASS' : 'FAIL', `parity vs migration/seo-baseline.json${allowNoindex ? ' (--allow-noindex)' : ''}`, `${summary}${parity.code ? `\n${parity.out.slice(0, 3000)}` : ''}`)
}

await mkdir(outDir, {recursive: true})
console.log(`Verifying ${base.href}${allowNoindex ? ' (pre-launch: noindex allowed)' : ''}; report in ${outDir}`)
await checkDomain()
await checkRobots()
const entries = await readSitemap()
await checkPages(entries)
await checkSlash(entries)
await checkRedirects()
await checkForm()
await checkHygiene().catch((e) => record('hygiene', 'WARN', 'hygiene checks stopped', errorCode(e)))
await checkParity()
report.finishedAt = new Date().toISOString()
report.failures = failures
report.warnings = warnings
await writeFile(path.join(outDir, 'verify-report.json'), JSON.stringify(report, null, 2))
const passes = Object.values(report.groups)
  .flat()
  .filter((r) => r.level === 'PASS').length
console.log(`\n${failures ? 'FAILED' : 'OK'}: ${passes} passed, ${warnings} warnings, ${failures} failures. Report: ${path.join(outDir, 'verify-report.json')}`)
process.exit(failures ? 1 : 0)
