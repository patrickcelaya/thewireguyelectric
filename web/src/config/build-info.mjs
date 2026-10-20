// /build-info.json: the commit, content and settings a build was made from. The Ignored
// Build Step (web/scripts/ignore-build.mjs) compares it with what a new build would use and
// skips production builds that would change nothing.
//
//   sha          the commit: VERCEL_GIT_COMMIT_SHA, else `git rev-parse HEAD`
//   contentHash  sha256 of every published Sanity document's `_id:_rev`, sorted (any publish,
//                unpublish or delete changes it); with the local dataset, of the NDJSON file
//   builtAt      when the build started (ISO 8601)
//   content      where the content came from: "sanity:<project>/<dataset>" or "local:<file>"
//   indexable    SITE_INDEXABLE, which switches every page's robots meta, robots.txt and GA
//   delivery     which lead destinations /api/contact has (FORMSPARK_FORM_ID, LEAD_WEBHOOK_URL,
//                RESEND_API_KEY, LEADS_TO_EMAIL): true or false for each, never a value or a
//                hash of one, since the file is public
//
// astro.config.mjs takes the hash before anything reads content, so a publish that lands
// mid-build shows up as a change on the next check instead of being recorded as built.
//
// No dependencies (node built-ins and fetch only): ignore-build.mjs imports this module
// before Vercel installs packages.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'

const API_VERSION = '2026-10-01'
/** The dataset the site builds from when no Sanity project is configured (lib/sanity.ts). */
const LOCAL_DATASET = new URL('../../../migration/sanity-import/production.ndjson', import.meta.url)
const LOCAL_LABEL = 'local:migration/sanity-import/production.ndjson'
// perspective=published already leaves out drafts and release versions; the filter keeps them
// (and system documents, which a token may see) out whatever the API defaults become
const PUBLISHED = '*[!(_id in path("drafts.**")) && !(_id in path("versions.**")) && !(_id in path("_.**"))]{_id, _rev}'

const sha256 = (data) => createHash('sha256').update(data).digest('hex')

/**
 * Where the content comes from, decided as lib/sanity.ts decides it: Sanity when a project ID
 * is set, else the local dataset.
 * @param {Record<string, string | undefined>} env
 */
export function contentSource(env) {
  const projectId = env.PUBLIC_SANITY_PROJECT_ID
  if (!projectId) return {kind: 'local', label: LOCAL_LABEL, file: LOCAL_DATASET}
  const dataset = env.PUBLIC_SANITY_DATASET || 'production'
  return {kind: 'sanity', label: `sanity:${projectId}/${dataset}`, projectId, dataset, token: env.SANITY_API_READ_TOKEN || undefined}
}

/** The variables that turn on a lead destination in /api/contact (pages/api/contact.ts). */
export const DELIVERY_VARS = ['FORMSPARK_FORM_ID', 'LEAD_WEBHOOK_URL', 'RESEND_API_KEY', 'LEADS_TO_EMAIL']

/**
 * The build settings that change the output, as /build-info.json records them. A deployment's
 * functions keep the env vars it was built with, so adding a form destination needs a build.
 * @param {Record<string, string | undefined>} env
 */
export function buildSettings(env) {
  return {
    content: contentSource(env).label,
    indexable: env.SITE_INDEXABLE === 'true',
    // presence only: changing the value of a variable that is already set is not detected
    delivery: Object.fromEntries(DELIVERY_VARS.map((name) => [name, Boolean(env[name])])),
  }
}

/**
 * sha256 of the published content: the sorted `_id:_rev` pairs from Sanity's API (not the CDN,
 * which can lag a publish), or the bytes of the local NDJSON.
 * @param {ReturnType<typeof contentSource>} source
 * @param {{fetch?: typeof fetch, timeoutMs?: number}} [options]
 */
export async function contentHash(source, {fetch = globalThis.fetch, timeoutMs = 20_000} = {}) {
  if (source.kind === 'local') return sha256(await readFile(source.file))
  const url = new URL(`https://${source.projectId}.api.sanity.io/v${API_VERSION}/data/query/${source.dataset}`)
  url.searchParams.set('query', PUBLISHED)
  url.searchParams.set('perspective', 'published')
  url.searchParams.set('returnQuery', 'false')
  const res = await fetch(url, {headers: source.token ? {authorization: `Bearer ${source.token}`} : {}, signal: AbortSignal.timeout(timeoutMs)})
  if (!res.ok) throw new Error(`Sanity answered ${res.status}`)
  const {result} = await res.json()
  if (!Array.isArray(result)) throw new Error('Sanity returned no result')
  // _id never contains ":", so sorting the pairs sorts by _id; plain < keeps it locale-independent
  const pairs = result.map((doc) => `${doc._id}:${doc._rev}`).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return sha256(pairs.join('\n'))
}

/** @param {Record<string, string | undefined>} env */
function commitSha(env) {
  if (env.VERCEL_GIT_COMMIT_SHA) return env.VERCEL_GIT_COMMIT_SHA
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim() || null
  } catch {
    return null
  }
}

/**
 * Everything /build-info.json records, taken now. Never throws: a hash that cannot be taken is
 * recorded as null, which makes the next Ignored Build Step check build.
 * @param {Record<string, string | undefined>} env
 */
export async function readBuildInfo(env) {
  const builtAt = new Date().toISOString()
  const source = contentSource(env)
  let hash = null
  try {
    hash = await contentHash(source)
  } catch (error) {
    console.warn(`[build-info] no content hash (${error instanceof Error ? error.message : error}); the next production deploy will build`)
  }
  return {sha: commitSha(env), contentHash: hash, builtAt, ...buildSettings(env)}
}

/**
 * Writes /build-info.json into the build output (the Vercel adapter copies it to
 * .vercel/output/static afterwards).
 * @param {Awaited<ReturnType<typeof readBuildInfo>>} info
 * @returns {import('astro').AstroIntegration}
 */
export function buildInfoFile(info) {
  return {
    name: 'build-info',
    hooks: {
      'astro:build:done': async ({dir, logger}) => {
        await writeFile(new URL('build-info.json', dir), `${JSON.stringify(info, null, 2)}\n`)
        logger.info(`build-info.json: commit ${info.sha?.slice(0, 7) ?? 'unknown'}, content ${info.contentHash?.slice(0, 12) ?? 'unknown'} (${info.content}), indexable ${info.indexable}`)
      },
    },
  }
}
