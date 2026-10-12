import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'qhi2uf0l',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  // Hosted at https://<studioHost>.sanity.studio after `pnpm --filter studio deploy`.
  studioHost: process.env.SANITY_STUDIO_HOST ?? 'thewireguyelectric',
  deployment: {autoUpdates: true},
  typegen: {
    path: '../web/src/**/*.{ts,astro}',
    schema: 'schema.json',
    generates: '../web/src/sanity.types.ts',
  },
})
