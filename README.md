# The Wire Guy Electric: website

The marketing site for [thewireguyelectric.com](https://www.thewireguyelectric.com), being moved off Webflow to **Astro** (static site) + **Sanity** (CMS) on **Vercel**.

The prime directive of this migration is **no SEO loss**: every URL, title, meta description and H1 that ranks today is carried over exactly. That's enforced by an automated parity check against a crawl of the live site. After launch, the content model is built for scaling service, city and cost-guide pages the right way.

- Migration plan and launch checklist: [`docs/MIGRATION_PLAN.md`](docs/MIGRATION_PLAN.md)
- SEO strategy and content roadmap: [`docs/SEO_STRATEGY.md`](docs/SEO_STRATEGY.md)
- Full SEO research with sources: [`docs/research/seo-research-2026-10.md`](docs/research/seo-research-2026-10.md)

## Repository layout

```
web/        Astro site (static, deployed to Vercel; Vercel root directory = web)
  src/layouts/SiteLayout.astro   the one layout: <head> + SEO, header, footer, call bar, JSON-LD @graph
  src/pages/                     routes (see "How pages are built")
  src/components/                site/ (chrome), ui/ (atoms), sections/ (page sections), PageBuilderPage, Seo, PortableText
  src/lib/                       queries.ts (GROQ), types.ts, schema.ts (JSON-LD), seo.ts, image.ts, site.ts (NAP helpers) ...
  src/styles/                    tokens.css, core.css (every page) + one layer per page type (home, inner, cms, post, pages, atlas)
  src/scripts/                   site.ts: the one small progressive-enhancement script
studio/     Sanity Studio (schemaTypes/ = the content model)
scripts/
  seo/      crawl.mjs (SEO crawler), parity.mjs (old vs new diff), serve-build.mjs (local Vercel emulator)
  migrate/  webflow-to-sanity.mjs (Webflow export → Sanity NDJSON) and its content/ modules, validate-dataset.mjs,
            verify-content.mjs, legacy-image-map.mjs
  valley/   relief.py (the valley map's relief asset)
migration/
  webflow-cms/      Raw Webflow CMS export (API JSON + CSV) and forms/scripts metadata
  live-snapshots/   Published HTML of the static pages (source for porting their copy)
  page-content/     The live pages' visible copy and links, which verify-content.mjs checks the sections against
  content-data/     Sourced data the migration applies (FAQs, relations, local facts, CMS template content); README explains each
  seo-baseline.json Crawl of the live site on 2026-10-12: the parity target
  seo-equity/       Redirect candidates and SEO-equity notes
  sanity-import/    Generated Sanity dataset (production.ndjson) + stable ID map
docs/               Design system, content model, plans, strategy, research
.claude/skills/     OpenSEO skills (from every-app/open-seo@89e5a00); they use the OpenSEO connector
```

## How pages are built

Every page renders the round-5 design on `SiteLayout` from Sanity content (`docs/DESIGN_SYSTEM.md` is the reference for components, CSS and rules; `docs/CONTENT_MODEL.md` for the content).

| Route | Built by | Content |
|---|---|---|
| `/` | `pages/index.astro` → `SectionRenderer` | the `index` page document's sections |
| `/about-us`, `/our-team`, `/careers`, `/faq`, `/contact-us`, `/commercial-electrician` | `pages/[page].astro` → `PageBuilderPage` → `SectionRenderer` | each page document's sections |
| `/services`, `/blog` | `pages/services.astro`, `pages/blog.astro` → `PageBuilderPage` | the page document, plus every service or post when it has no list yet |
| `/services/[slug]`, `/locations/[slug]`, `/blog-posts/[slug]`, `/services-categories/[slug]`, `/posts-categories/[slug]` | the route file, composing the CMS template sections (`docs/DESIGN_SYSTEM.md` §13) | the service, location, post or category document |
| `/estimate` | `pages/estimate.astro` (code route: the form is the page) | Site settings, reviews and FAQs |
| `/404`, `/sitemap.xml`, `/robots.txt`, `/api/contact` | their route files | |

Each page keeps the live site's title, meta description, H1, canonical and URL; `scripts/seo/parity.mjs` enforces it. Templates render nothing for empty data, so a page also builds from a dataset that lacks newer fields.

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
| `FORMSPARK_FORM_ID` | Deliver estimate/careers form leads (`/api/contact`) to a Formspark form |
| `LEAD_WEBHOOK_URL` | Also/instead POST each lead as JSON to a webhook (e.g. Zapier → Housecall Pro) |
| `RESEND_API_KEY`, `LEADS_TO_EMAIL`, `LEADS_FROM_EMAIL` | Also/instead email each lead via Resend |

Lead forms: setup, the Formspark settings that silently reject every lead, the résumé upload and how to test: [docs/FORMS.md](docs/FORMS.md).

`studio/.env` (see `studio/.env.example`): `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET`.

## Content migration

```bash
node scripts/migrate/webflow-to-sanity.mjs                  # regenerate migration/sanity-import/production.ndjson
cd studio && npx sanity dataset import ../migration/sanity-import/production.ndjson production --replace
```

The import downloads every image from Webflow's CDN into Sanity (`_sanityAsset`), so nothing depends on Webflow afterwards. Document IDs are stable across re-runs (`id-map.json`), so the import can be repeated safely until launch. The script also fixes the broken internal links found on the live site (`/locations/mesa`, `/services/electrical-panels`, ...), sends links worded as a free estimate to `/estimate` and normalizes absolute links to relative paths. See `migration/sanity-import/report.json`.

Content changes go through the pipeline, never by editing the NDJSON: edit a module in `scripts/migrate/content/` (`fixes`, `reviews`, `local-facts`, `page-sections`, `cms-templates`, applied in that order) or its data in `migration/content-data/`, regenerate, then check:

```bash
node scripts/migrate/webflow-to-sanity.mjs
node scripts/migrate/validate-dataset.mjs   # every document, section and field matches the Studio schema
node scripts/migrate/verify-content.mjs     # every live string and link is in the sections (or in _omissions.json with a reason)
node scripts/migrate/legacy-image-map.mjs   # after an import that adds images: Webflow URL → Sanity asset map
```

## SEO parity check

```bash
pnpm seo:baseline                                     # re-crawl the live Webflow site (only before launch)
PUBLIC_SANITY_PROJECT_ID= SITE_INDEXABLE=true pnpm build   # the local dataset; drop the first variable to build from Sanity
node scripts/seo/serve-build.mjs &                    # serve web/.vercel/output like Vercel does
node scripts/seo/crawl.mjs --base http://localhost:4321 --paths-from migration/seo-baseline.json --out migration/seo-candidate.json
node scripts/seo/parity.mjs                           # exits 1 on any SEO regression
```

To check the real Vercel deployment, crawl https://thewireguyelectric.vercel.app instead. It sits behind Vercel Authentication, so export `VERCEL_AUTOMATION_BYPASS_SECRET` (Project → Settings → Deployment Protection → Protection Bypass for Automation) and add `--allow-noindex`, since the site is noindexed until launch. CI runs the local version on every pull request.

## How content gets to the live site

The site is fully static. Publishing in Sanity fires a webhook to a Vercel deploy hook, which rebuilds the site in about a minute. Redirects are managed as `Redirect` documents in Studio and applied at build time.

The webhook fires once per changed document, so a bulk change (a dataset import, a script patching many documents) sends one deploy-hook call per document. Two safeguards keep that from becoming one production build per document:

- **Vercel → Project → Settings → Build and Deployment → On-Demand Concurrent Builds: "Run up to one build per branch".** Hook calls that arrive during a build are collapsed into a single follow-up build. The Pro default ("Run all builds immediately") builds every call in parallel.
- **Before a bulk import**, set the project's Ignored Build Step to `[ "$VERCEL_GIT_COMMIT_SHA" = "$VERCEL_GIT_PREVIOUS_SHA" ]` (skips rebuilds of an already-deployed commit; git pushes still deploy). Clear it once the webhook's delivery log in sanity.io/manage is empty, then trigger one deploy.
