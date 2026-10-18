#!/usr/bin/env node
// Vercel Ignored Build Step: `node scripts/ignore-build.mjs` (Project → Settings → Build and
// Deployment → Ignored Build Step → Custom; Vercel runs it in the Root Directory, web/).
// Exit 1 builds; exit 0 skips (the deployment shows as Canceled).
//
// A production build is skipped only when it would change nothing, judged against the
// /build-info.json the current production deployment serves (src/config/build-info.mjs):
//   1. not production (VERCEL_ENV)                         → build (previews always build)
//   2. build-info.json unreadable (any fetch failure)       → build
//   3. another commit                                       → build (a git push)
//   4. other build settings (content source, SITE_INDEXABLE) → build (e.g. the launch switch)
//   5. a form destination added or removed                  → build (FORMSPARK_FORM_ID and the like)
//   6. other content (hash of Sanity's published _id:_rev)  → build (a publish)
//   7. built on an earlier Arizona day, more than 20 hours  → build (the daily rebuild refreshes dated content:
//      ago, or at a time still to come                         a job past its closing date, the footer year)
//   8. otherwise                                            → skip
// Anything unexpected builds: a wasted build costs a minute, a wrongly skipped one leaves the
// site stale. It runs before `pnpm install`, so it uses node built-ins and fetch only.
import {pathToFileURL} from 'node:url'
import {buildSettings, contentHash, contentSource} from '../src/config/build-info.mjs'

const MAX_AGE_HOURS = 20
/** The calendar the site's dates follow (src/lib/format.ts): Arizona, which has no daylight saving time. */
const azDay = (time) => new Date(time).toLocaleDateString('en-CA', {timeZone: 'America/Phoenix'})

const message = (error) => (error instanceof Error ? (error.cause instanceof Error ? `${error.message}: ${error.cause.message}` : error.message) : String(error))
const build = (reason) => ({build: true, reason})
const skip = (reason) => ({build: false, reason})

/**
 * Decide whether this deployment should build.
 * @param {Record<string, string | undefined>} env
 * @param {{fetch?: typeof fetch, now?: number, timeoutMs?: number}} [options]
 * @returns {Promise<{build: boolean, reason: string}>}
 */
export async function decide(env = process.env, {fetch = globalThis.fetch, now = Date.now(), timeoutMs = 15_000} = {}) {
  if (env.VERCEL_ENV !== 'production') return build(`not a production deployment (VERCEL_ENV=${env.VERCEL_ENV || 'unset'})`)

  // The shortest production domain, without a scheme (an explicit http(s):// is kept, for tests).
  // After launch that is the apex, which redirects to www; fetch follows it.
  const host = env.VERCEL_PROJECT_PRODUCTION_URL
  if (!host) return build('VERCEL_PROJECT_PRODUCTION_URL is not set (are System Environment Variables exposed?)')
  const url = new URL('/build-info.json', /^https?:\/\//.test(host) ? host : `https://${host}`)
  // The bypass secret goes only to a Vercel alias, and never on through a redirect: once the custom
  // domains are on the project, the apex is the production URL while DNS may still point at Webflow
  // (or back at it, in a rollback). Custom domains are public under Standard Protection anyway.
  const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET && url.hostname.endsWith('.vercel.app') ? env.VERCEL_AUTOMATION_BYPASS_SECRET : ''
  const headers = {'cache-control': 'no-cache', ...(bypass ? {'x-vercel-protection-bypass': bypass} : {})}
  let live
  try {
    // with the secret attached, a 3xx is not followed: it fails res.ok below, and that builds
    const res = await fetch(url, {headers, redirect: bypass ? 'manual' : 'follow', signal: AbortSignal.timeout(timeoutMs)})
    if (!res.ok) return build(`${url.href} answered ${res.status}`)
    // a protected deployment without the bypass redirects to Vercel's login page
    if (!/json/.test(res.headers.get('content-type') ?? '')) {
      const landed = res.url ? new URL(res.url) : url
      return build(`${url.href} led to ${landed.origin}${landed.pathname} (${res.headers.get('content-type')}), not JSON: protected without a bypass secret?`)
    }
    live = await res.json()
  } catch (error) {
    return build(`could not read ${url.href} (${message(error)})`)
  }
  if (!live || typeof live !== 'object' || typeof live.sha !== 'string') return build(`${url.href} has no commit SHA`)

  if (!env.VERCEL_GIT_COMMIT_SHA) return build('VERCEL_GIT_COMMIT_SHA is not set')
  if (env.VERCEL_GIT_COMMIT_SHA !== live.sha) return build(`new commit (${live.sha.slice(0, 7)} → ${env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)})`)

  const settings = buildSettings(env)
  if (settings.content !== live.content) return build(`content source changed (${live.content} → ${settings.content})`)
  if (settings.indexable !== live.indexable) return build(`SITE_INDEXABLE changed (${live.indexable} → ${settings.indexable})`)
  // a build-info.json from before this field has no delivery, so every name differs and it builds
  const delivery = Object.entries(settings.delivery).filter(([name, isSet]) => isSet !== live.delivery?.[name])
  if (delivery.length) return build(`form delivery changed (${delivery.map(([name, isSet]) => `${name} ${isSet ? 'set' : 'unset'}`).join(', ')})`)

  let hash
  try {
    hash = await contentHash(contentSource(env), {fetch, timeoutMs})
  } catch (error) {
    return build(`could not hash the content (${message(error)})`)
  }
  if (hash !== live.contentHash) return build(`content changed (${String(live.contentHash).slice(0, 12)} → ${hash.slice(0, 12)})`)

  const age = now - Date.parse(live.builtAt)
  if (!Number.isFinite(age)) return build(`${url.href} has no valid builtAt`)
  const hours = (age / 3_600_000).toFixed(1)
  if (age < 0) return build(`${url.href} has a builtAt still to come (${live.builtAt})`)
  if (age > MAX_AGE_HOURS * 3_600_000) return build(`last build is ${hours} h old (over ${MAX_AGE_HOURS} h)`)
  // so the 00:17 daily call builds after any build the day before, and dated content turns over on time
  const builtOn = azDay(now - age)
  if (builtOn !== azDay(now)) return build(`last build was on ${builtOn}, Arizona time (${hours} h ago); today is ${azDay(now)}`)

  return skip(`same commit, settings and content as the production build of ${live.builtAt} (${hours} h ago)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const {build: shouldBuild, reason} = await decide().catch((error) => build(`unexpected error (${message(error)})`))
  console.log(`[ignore-build] ${shouldBuild ? 'Building' : 'Skipping the build'}: ${reason}`)
  process.exit(shouldBuild ? 1 : 0)
}
