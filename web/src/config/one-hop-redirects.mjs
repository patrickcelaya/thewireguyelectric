// Keeps every legacy redirect one hop, with or without a trailing slash.
//
// The Vercel adapter writes the trailing-slash rule (`/x/` → 308 → `/x`) ahead of the
// redirects, so `/locations/mesa/` took two hops: 308 to `/locations/mesa`, then 301 to
// `/`. After the adapter has written .vercel/output/config.json (it runs first: Astro puts
// the adapter at the head of the integrations), this moves the 301s in front of that rule
// and lets each one match an optional trailing slash, so both spellings go straight to
// the final page.
import {readFile, writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'

const SLASH_RULE = '^/(.*)/$'

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
        const routes = config.routes ?? []
        const slash = routes.findIndex((r) => r.src === SLASH_RULE)
        if (slash < 0) return
        const isRedirect = (r) => r.status === 301 && r.headers?.Location && typeof r.src === 'string' && r.src.endsWith('$')
        const redirects = routes.filter(isRedirect).map((r) => ({...r, src: r.src.replace(/\/\?\$$|\$$/, '/?$')}))
        config.routes = [...routes.slice(0, slash).filter((r) => !isRedirect(r)), ...redirects, ...routes.slice(slash).filter((r) => !isRedirect(r))]
        await writeFile(file, JSON.stringify(config, null, 2))
        logger.info(`${redirects.length} redirects now match with or without a trailing slash, ahead of the slash rule`)
      },
    },
  }
}
