import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'qhi2uf0l',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  // Hosted at https://<studioHost>.sanity.studio after `pnpm --filter studio run deploy`.
  studioHost: process.env.SANITY_STUDIO_HOST ?? 'thewireguyelectric',
  // The hosted Studio's application id (printed by the first deploy, 2026-10-20), so later deploys don't ask for it.
  deployment: {appId: 'vzs6dw1589c9e0ytrj786rmr', autoUpdates: true},
  typegen: {
    path: '../web/src/**/*.{ts,astro}',
    schema: 'schema.json',
    generates: '../web/src/sanity.types.ts',
  },
})
