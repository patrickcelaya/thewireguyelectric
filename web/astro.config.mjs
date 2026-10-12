// @ts-check
import {defineConfig} from 'astro/config'
import vercel from '@astrojs/vercel'
import {loadEnv} from 'vite'
import {LEGACY_REDIRECTS, flattenRedirects, loadSanityRedirects} from './src/config/redirects.mjs'

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '')

const sanityRedirects = await loadSanityRedirects({
  projectId: env.PUBLIC_SANITY_PROJECT_ID,
  dataset: env.PUBLIC_SANITY_DATASET || 'production',
  token: env.SANITY_API_READ_TOKEN,
})

export default defineConfig({
  // The canonical origin. Every canonical, sitemap and og:url is built from this,
  // so previews and local builds still point search engines at production.
  site: 'https://www.thewireguyelectric.com',
  // Webflow served URLs without a trailing slash; keep it that way. The Vercel
  // adapter turns this into Vercel's `trailingSlash: false`, which 308s /x/ → /x.
  trailingSlash: 'never',
  output: 'static',
  adapter: vercel(),
  redirects: flattenRedirects({...LEGACY_REDIRECTS, ...sanityRedirects}),
  prefetch: {prefetchAll: false, defaultStrategy: 'hover'},
  image: {domains: ['cdn.sanity.io']},
})
