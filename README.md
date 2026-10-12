# The Wire Guy Electric: website

The marketing site for [thewireguyelectric.com](https://www.thewireguyelectric.com), being moved off Webflow to **Astro** (static site) + **Sanity** (CMS) on **Vercel**.

The prime directive of this migration is **no SEO loss**: every URL, title, meta description and H1 that ranks today is carried over exactly. That's enforced by an automated parity check against a crawl of the live site. After launch, the content model is built for scaling service, city and cost-guide pages the right way.

- Migration plan and launch checklist: [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md)
- SEO strategy and content roadmap: [`docs/SEO_STRATEGY.md`](docs/SEO_STRATEGY.md)
- Full SEO research with sources: [`docs/research/seo-research-2026-10.md`](docs/research/seo-research-2026-10.md)

## Repository layout

```
web/        Astro site (deployed to Vercel; Vercel root directory = web)
studio/     Sanity Studio (deployed to <host>.sanity.studio)
scripts/
  seo/      crawl.mjs (SEO crawler), parity.mjs (old vs new diff), serve-build.mjs (local Vercel emulator)
  migrate/  webflow-to-sanity.mjs (Webflow export → Sanity NDJSON)
migration/
  webflow-cms/      Raw Webflow CMS export (API JSON + CSV) and forms/scripts metadata
  live-snapshots/   Published HTML of the static pages (source for porting their copy)
  seo-baseline.json Crawl of the live site on 2026-10-12: the parity target
  seo-equity/       Redirect candidates and SEO-equity notes
  sanity-import/    Generated Sanity dataset (production.ndjson) + stable ID map
docs/               Plans, strategy, research
```

## Getting started

Requires Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev            # site at http://localhost:4321
pnpm dev:studio     # Studio at http://localhost:3333 (needs a Sanity project, see below)
```

With no Sanity project configured, the site builds from `migration/sanity-import/production.ndjson` (the converted Webflow content), using the same GROQ queries evaluated locally. Everything works before Sanity exists.

### Environment variables

`web/.env` (see `web/.env.example`):

| Variable | Purpose |
|---|---|
| `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET` | Read content from Sanity instead of the local dataset |
| `SANITY_API_READ_TOKEN` | Only for a private dataset |
| `SITE_INDEXABLE` | **Set to `true` only on the Vercel Production environment, at cutover.** Anything else renders `noindex` and a blocking `robots.txt`. |
| `RESEND_API_KEY`, `LEADS_TO_EMAIL`, `LEADS_FROM_EMAIL` | Delivery for the estimate/careers forms (`/api/contact`) |

`studio/.env` (see `studio/.env.example`): `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`.

## Content migration

```bash
node scripts/migrate/webflow-to-sanity.mjs                  # regenerate migration/sanity-import/production.ndjson
cd studio && npx sanity dataset import ../migration/sanity-import/production.ndjson production --replace
```

The import downloads every image from Webflow's CDN into Sanity (`_sanityAsset`), so nothing depends on Webflow afterwards. Document IDs are stable across re-runs (`id-map.json`), so the import can be repeated safely until launch. The script also fixes the broken internal links found on the live site (`/estimate`, `/locations/mesa`, ...) and normalizes absolute links to relative paths. See `migration/sanity-import/report.json`.

## SEO parity check

```bash
pnpm seo:baseline                                     # re-crawl the live Webflow site (only before launch)
SITE_INDEXABLE=true pnpm build
node scripts/seo/serve-build.mjs &                    # serve web/.vercel/output like Vercel does
node scripts/seo/crawl.mjs --base http://localhost:4321 --paths-from migration/seo-baseline.json --out migration/seo-candidate.json
node scripts/seo/parity.mjs                           # exits 1 on any SEO regression
```

To check a real Vercel preview, crawl its URL instead (add `--allow-noindex`, since previews are noindexed). CI runs the local version on every pull request.

## How content gets to the live site

The site is fully static. Publishing in Sanity fires a webhook to a Vercel deploy hook, which rebuilds the site in about a minute. Redirects are managed as `Redirect` documents in Studio and applied at build time.
