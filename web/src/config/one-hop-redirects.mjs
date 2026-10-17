// Finishes the Vercel routes after the adapter has written .vercel/output/config.json (it
// runs first: Astro puts the adapter at the head of the integrations).
//
// 1. Keeps every legacy redirect one hop, with or without a trailing slash. The adapter
//    writes the trailing-slash rule (`/x/` → 308 → `/x`) ahead of the redirects, so
//    `/locations/mesa/` took two hops: 308 to `/locations/mesa`, then 301 to `/`. This
//    moves the 301s in front of that rule and lets each one match an optional trailing
//    slash, so both spellings go straight to the final page.
// 2. Sends every page's directory copy (`/services/panels/index.html`, which the static
//    output also answers) to the page itself in one 301, so no duplicate URL serves 200.
// 3. Adds the response headers every page sends: the clickjacking protection the live
//    site sends (X-Frame-Options SAMEORIGIN, CSP frame-ancestors 'self'), and
//    X-Robots-Tag: noindex on every host but www.thewireguyelectric.com (the
//    *.vercel.app aliases and previews stay out of the index even once the site is
//    indexable; www never matches). scripts/seo/serve-build.mjs answers as the www host.
import {readFile, writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'

const SLASH_RULE = '^/(.*)/$'
/** The production host: the only one search engines may index. */
const PRODUCTION_HOST = 'www.thewireguyelectric.com'

/** Headers on every response, before any other route (`continue`: routing goes on). */
const HEADER_ROUTES = [
  {
    src: '^/(.*)$',
    headers: {
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self'",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    continue: true,
  },
  // the host value is matched as a pattern; the plain name matches www whether it is read
  // as a pattern or as the exact host, so www can never be noindexed by this route
  {src: '^/(.*)$', missing: [{type: 'host', value: PRODUCTION_HOST}], headers: {'X-Robots-Tag': 'noindex'}, continue: true},
]

/** /<path>/index.html → /<path> (the root /index.html is a legacy redirect already). */
const INDEX_HTML_REDIRECT = {src: '^/(.+)/index\\.html$', headers: {Location: '/$1'}, status: 301}

/** @returns {import('astro').AstroIntegration} */
export function oneHopRedirects() {
  /** @type {URL} */
  let root
  return {
    name: 'one-hop-redirects',
    hooks: {
      'astro:config:done': ({config}) => {
        root = config.root
      },
      'astro:build:done': async ({logger}) => {
        const file = new URL('.vercel/output/config.json', root)
        if (!existsSync(file)) return
        const config = JSON.parse(await readFile(file, 'utf8'))
        const routes = (config.routes ?? []).filter((r) => !HEADER_ROUTES.some((h) => JSON.stringify(h) === JSON.stringify(r)))
        const slash = routes.findIndex((r) => r.src === SLASH_RULE)
        if (slash < 0) return
        const isRedirect = (r) => r.status === 301 && r.headers?.Location && typeof r.src === 'string' && r.src.endsWith('$')
        const redirects = [...routes.filter(isRedirect), INDEX_HTML_REDIRECT]
          .filter((r, i, all) => all.findIndex((o) => o.src === r.src) === i)
          .map((r) => ({...r, src: r.src.replace(/\/\?\$$|\$$/, '/?$')}))
        config.routes = [...HEADER_ROUTES, ...routes.slice(0, slash).filter((r) => !isRedirect(r)), ...redirects, ...routes.slice(slash).filter((r) => !isRedirect(r))]
        await writeFile(file, JSON.stringify(config, null, 2))
        logger.info(`${redirects.length} redirects now match with or without a trailing slash, ahead of the slash rule; headers on every response, noindex off ${PRODUCTION_HOST}`)
      },
    },
  }
}
