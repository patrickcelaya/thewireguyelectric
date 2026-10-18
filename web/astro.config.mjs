// @ts-check
import {defineConfig} from 'astro/config'
import vercel from '@astrojs/vercel'
import {loadEnv} from 'vite'
import {LEGACY_REDIRECTS, SHORT_LINKS, flattenRedirects, loadPostSlugs, loadSanityRedirects, postRedirects} from './src/config/redirects.mjs'
import {oneHopRedirects} from './src/config/one-hop-redirects.mjs'
import {buildInfoFile, readBuildInfo} from './src/config/build-info.mjs'

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

const sanity = {
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_READ_TOKEN,
}
// Fingerprint the content before anything below reads it (lib/seo.ts reads SITE_INDEXABLE from process.env only)
const buildInfo = await readBuildInfo({...env, SITE_INDEXABLE: process.env.SITE_INDEXABLE})
const sanityRedirects = await loadSanityRedirects(sanity)
const postSlugs = await loadPostSlugs({...sanity, localDataset: new URL('../migration/sanity-import/production.ndjson', import.meta.url)})

export default defineConfig({
  // The canonical origin. Every canonical, sitemap and og:url is built from this,
  // so previews and local builds still point search engines at production.
  site: 'https://www.thewireguyelectric.com',
  // Webflow served URLs without a trailing slash; keep it that way. The Vercel
  // adapter turns this into Vercel's `trailingSlash: false`, which 308s /x/ → /x.
  trailingSlash: 'never',
  output: 'static',
  adapter: vercel(),
  // after the adapter: every redirect matches with or without a trailing slash, in one hop;
  // /build-info.json for the Ignored Build Step (scripts/ignore-build.mjs)
  integrations: [oneHopRedirects(), buildInfoFile(buildInfo)],
  redirects: flattenRedirects({...LEGACY_REDIRECTS, ...SHORT_LINKS, ...postRedirects(postSlugs), ...sanityRedirects}),
  prefetch: {prefetchAll: false, defaultStrategy: 'hover'},
  image: {domains: ['cdn.sanity.io']},
  vite: {
    build: {
      // The browsers the CSS is written for (Vite's "baseline widely available"). Without
      // targets the CSS minifier assumes the newest syntax and folds animation-timeline
      // into the animation shorthand, which browsers reject, so every scroll-driven
      // animation (reveals, the lit statement, the process wire) silently never runs.
      cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari16.4'],
    },
  },
})
