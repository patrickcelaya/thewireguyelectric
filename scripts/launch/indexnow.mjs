#!/usr/bin/env node
// Tell IndexNow search engines (Bing, Yandex, Seznam, Naver, Yep; not Google) about every URL in
// the sitemap. Run it once on launch day, after DNS points at Vercel and verify.mjs passes, and again
// after a batch of content changes. One POST reaches every participating engine.
//
//   node scripts/launch/indexnow.mjs --dry-run            # show what would be sent, check the key file
//   node scripts/launch/indexnow.mjs                      # submit every sitemap URL
//   node scripts/launch/indexnow.mjs --since 2026-10-20   # only URLs whose <lastmod> is on/after a date
//   node scripts/launch/indexnow.mjs --urls /services/panels,/blog-posts/x
//
// The key is public by design (https://www.indexnow.org/documentation): it lives in
// web/public/<key>.txt, so the build serves it at https://www.thewireguyelectric.com/<key>.txt, and
// the engines fetch it to confirm the submitter controls the host. Rotate it by replacing that file.
//
// Options:
//   --site URL          the host being submitted (default https://www.thewireguyelectric.com)
//   --from URL          where to read sitemap.xml and the key file (default: --site). Lets a dry run
//                       read a local build (serve-build.mjs) or the protected preview before launch
//                       (export VERCEL_AUTOMATION_BYPASS_SECRET; it is sent to *.vercel.app hosts only).
//   --key KEY           override the key (default: the single <32 hex>.txt in web/public)
//   --endpoint URL      default https://api.indexnow.org/indexnow
//   --dry-run           validate everything, print the payload summary, send nothing
//   --skip-key-check    do not fetch the key file first (not recommended)

import {readdir, readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const argv = process.argv.slice(2)
const flag = (k) => argv.includes(`--${k}`)
const opt = (k, d) => {
  const i = argv.indexOf(`--${k}`)
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d
}

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const site = new URL(opt('site', 'https://www.thewireguyelectric.com'))
const from = new URL(opt('from', site.origin))
const endpoint = opt('endpoint', 'https://api.indexnow.org/indexnow')
const dryRun = flag('dry-run')
const MAX_PER_POST = 10_000
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
/** Reads from --from; a protected Vercel deployment needs the bypass header. */
const read = (url, init = {}) =>
  fetch(url, {...init, headers: bypass && new URL(url).hostname.endsWith('.vercel.app') ? {'x-vercel-protection-bypass': bypass} : {}})

async function findKey() {
  if (opt('key')) return opt('key')
  const files = (await readdir(path.join(repo, 'web/public'))).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f))
  if (files.length !== 1) throw new Error(`expected exactly one <32 hex>.txt key file in web/public, found ${files.length}`)
  const key = (await readFile(path.join(repo, 'web/public', files[0]), 'utf8')).trim()
  if (`${key}.txt` !== files[0]) throw new Error(`${files[0]} must contain its own name (the key), found "${key}"`)
  return key
}

const key = await findKey()
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('IndexNow keys are 8-128 characters of a-z, A-Z, 0-9 and -')
const keyLocation = `${site.origin}/${key}.txt`

// 1. The engines will fetch keyLocation: make sure it answers with the key first.
if (!flag('skip-key-check')) {
  const res = await read(new URL(`/${key}.txt`, from), {redirect: 'manual'})
  const body = (await res.text()).trim()
  if (res.status !== 200 || body !== key) {
    console.error(`Key file check failed: ${new URL(`/${key}.txt`, from).href} answered ${res.status} "${body.slice(0, 60)}". Deploy web/public/${key}.txt first.`)
    process.exit(1)
  }
  console.log(`key file OK: ${new URL(`/${key}.txt`, from).href} (submitted as keyLocation ${keyLocation})`)
}

// 2. The URL list: every sitemap <loc> on this host (optionally only recently modified), or --urls.
let urls
if (opt('urls')) {
  urls = opt('urls')
    .split(',')
    .map((u) => new URL(u.trim(), site.origin).href)
} else {
  const res = await read(new URL('/sitemap.xml', from))
  if (!res.ok) throw new Error(`sitemap.xml answered ${res.status}`)
  const xml = await res.text()
  const since = opt('since')
  urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => ({loc: m[1].match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1], lastmod: m[1].match(/<lastmod>\s*([^<\s]+)\s*<\/lastmod>/)?.[1]}))
    .filter((e) => e.loc && (!since || (e.lastmod && e.lastmod.slice(0, 10) >= since)))
    .map((e) => e.loc)
}
const foreign = urls.filter((u) => new URL(u).host !== site.host)
if (foreign.length) throw new Error(`IndexNow only accepts URLs on ${site.host}; found ${foreign.length}, e.g. ${foreign[0]}`)
urls = [...new Set(urls)]
if (!urls.length) {
  console.log('nothing to submit')
  process.exit(0)
}

// 3. Submit (one POST per 10,000 URLs). Response codes: https://www.indexnow.org/documentation#response
const MEANING = {
  200: 'OK: URLs submitted',
  202: 'Accepted: key validation pending (the engine will fetch the key file)',
  400: 'Bad request: invalid format',
  403: 'Forbidden: key not valid (key file missing or different)',
  422: 'Unprocessable: URLs do not belong to the host, or the key does not match the protocol',
  429: 'Too many requests: possible spam; wait and retry later',
}
let failed = false
for (let i = 0; i < urls.length; i += MAX_PER_POST) {
  const urlList = urls.slice(i, i + MAX_PER_POST)
  const payload = {host: site.host, key, keyLocation, urlList}
  if (dryRun) {
    console.log(`[dry run] would POST ${urlList.length} URLs to ${endpoint}: ${JSON.stringify({...payload, urlList: [...urlList.slice(0, 3), `…(${urlList.length} total)`]})}`)
    continue
  }
  const res = await fetch(endpoint, {method: 'POST', headers: {'content-type': 'application/json; charset=utf-8'}, body: JSON.stringify(payload)})
  const text = (await res.text()).slice(0, 300)
  console.log(`${res.status} ${MEANING[res.status] ?? ''} (${urlList.length} URLs)${text ? `: ${text}` : ''}`)
  if (![200, 202].includes(res.status)) failed = true
}
process.exit(failed ? 1 : 0)
