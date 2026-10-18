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
  src/config/                    redirects, the one-hop redirect rewrite, build-info.mjs (/build-info.json)
  scripts/                       ignore-build.mjs: the Vercel Ignored Build Step, and its tests
studio/     Sanity Studio (schemaTypes/ = the content model)
scripts/
  seo/      crawl.mjs (SEO crawler), parity.mjs (old vs new diff), serve-build.mjs (local Vercel emulator),
            check-structured-data.mjs + check-places.mjs (`pnpm seo:schema`: every page's JSON-LD and share tags)
  migrate/  webflow-to-sanity.mjs (Webflow export → Sanity NDJSON) and its content/ modules, validate-dataset.mjs,
            verify-content.mjs, legacy-image-map.mjs
  launch/   verify.mjs (launch-day checks), indexnow.mjs (IndexNow submission)
  valley/   relief.py (the valley map's relief asset)
migration/
  webflow-cms/      Raw Webflow CMS export (API JSON + CSV) and forms/scripts metadata
  live-snapshots/   Published HTML of the static pages (source for porting their copy)
  page-content/     The live pages' visible copy and links, which verify-content.mjs checks the sections against
  content-data/     Sourced data the migration applies (FAQs, relations, local facts, CMS template content); README explains each
  content-edits/    The launch copy pass: verified AI-slop edits and the lead's copy decisions, applied by content/content-edits.mjs
  seo-baseline.json Crawl of the live site on 2026-10-12: the parity target
  seo-equity/       Redirect candidates and SEO-equity notes
  sanity-import/    Generated Sanity dataset (production.ndjson), stable ID map, content-dates.json (the "updated" dates'
                    baseline) and legacy-assets.json (the Sanity asset documents that replace Webflow's CDN images)
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

Every image references the Sanity asset the first import made from its Webflow file, and the NDJSON carries those asset documents (`legacy-assets.json`), so the dataset imports again without Webflow's CDN, also after the Webflow plan is cancelled. Document IDs are stable across re-runs (`id-map.json`), so the import can be repeated safely until launch. The script also fixes the broken internal links found on the live site (`/locations/mesa`, `/services/electrical-panels`, ...), sends links worded as a free estimate to `/estimate` and normalizes absolute links to relative paths. See `migration/sanity-import/report.json`.

Content changes go through the pipeline, never by editing the NDJSON: edit a module in `scripts/migrate/content/` (`fixes`, `reviews`, `local-facts`, `page-sections`, `cms-templates`, applied in that order) or its data in `migration/content-data/`, regenerate, then check:

```bash
node scripts/migrate/webflow-to-sanity.mjs
node scripts/migrate/validate-dataset.mjs   # every document, section and field matches the Studio schema
node scripts/migrate/verify-content.mjs     # every live string and link is in the sections (or in _omissions.json with a reason)
node scripts/migrate/legacy-image-map.mjs   # after an import that adds images: Webflow URL → Sanity asset map and asset documents
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

### Ignored Build Step: build only when something changed

**Vercel → Project → Settings → Build and Deployment → Ignored Build Step → Custom: `node scripts/ignore-build.mjs`.** Vercel runs it in the root directory (`web/`) before installing packages; exit 1 builds, exit 0 cancels the deployment. It stays on for good. It replaces the old `[ "$VERCEL_GIT_COMMIT_SHA" = "$VERCEL_GIT_PREVIOUS_SHA" ]` guard, which also cancelled every Sanity publish and the same-commit redeploy that turns indexing on.

Every build writes `/build-info.json` (`web/src/config/build-info.mjs`):

| Field | Value |
|---|---|
| `sha` | the commit |
| `contentHash` | sha256 of every published Sanity document's `_id:_rev`, sorted; with the local dataset, of the NDJSON. Taken before the build reads any content, so a publish during a build counts as a change |
| `builtAt` | when the build started |
| `content`, `indexable` | the content source (`sanity:qhi2uf0l/production`) and `SITE_INDEXABLE` |
| `delivery` | whether each lead destination `/api/contact` reads is set: `FORMSPARK_FORM_ID`, `LEAD_WEBHOOK_URL`, `RESEND_API_KEY`, `LEADS_TO_EMAIL`. `true` or `false` only, never a value or a hash of one (the file is public) |

The script compares it with what this deployment would build, in this order:

1. A preview (`VERCEL_ENV` is not `production`): build.
2. `https://$VERCEL_PROJECT_PRODUCTION_URL/build-info.json` can't be read (a network error, a 404, Vercel's login page, bad JSON): build. It sends `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET` when that variable is set and the host is a `.vercel.app` alias, and then follows no redirect (a 3xx builds). A custom domain never gets the secret: from T-2 the apex is the production URL while DNS still points at Webflow.
3. Another commit (`VERCEL_GIT_COMMIT_SHA`): build.
4. Another content source or `SITE_INDEXABLE` value: build. This is what lets the launch redeploy through.
5. A lead destination added or removed (one of the `delivery` variables set or unset): build. A deployment's functions keep the variables it was built with, so this is what lets the redeploy after adding `FORMSPARK_FORM_ID` through.
6. Another content hash, read from Sanity's API (not the CDN, which can lag a publish): build.
7. The live build was made on an earlier day in Arizona, is more than 20 hours old, or has a `builtAt` still to come: build.
8. Otherwise: skip. The deployment shows as Canceled and the live build stays.

What it relies on, and what happens without it. Every unknown builds, so a wrong guess costs one extra build, never a stale site:

- `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_GIT_COMMIT_SHA` are system variables available at build time. Vercel's docs say the Ignored Build Step can read those, provided **Settings → Environment Variables → Enable access to System Environment Variables** is ticked. Without them it builds every time.
- `VERCEL_PROJECT_PRODUCTION_URL` is the shortest production domain: the `.vercel.app` alias today, the apex once the custom domains are added (T-2). The apex redirects to www and the script follows the redirect, without the bypass header.
- `VERCEL_AUTOMATION_BYPASS_SECRET` exists only while a Protection Bypass for Automation secret does. While Deployment Protection covers the production alias ("All deployments", before launch), revoking it makes build-info.json unreadable and every deploy builds. After launch the production domains are public under Standard protection, so revoking it changes nothing.
- `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`, `SANITY_API_READ_TOKEN`, `SITE_INDEXABLE` and the four `delivery` variables are the project's own variables, read the way the build reads them. If the step ever ran without them, the content source comparison would differ and it would build every time.

**After changing the value of a variable that is already set** (a new `FORMSPARK_FORM_ID`, a new `RESEND_API_KEY`, `LEADS_FROM_EMAIL`) **or any other environment variable**, the step would cancel a same-commit redeploy: only whether the `delivery` variables are set is compared. Redeploy from **Deployments → ⋯ → Redeploy** with **Use project's Ignore Build Step** unticked. Adding or removing one of the four needs only a plain redeploy.

`pnpm --filter web test` runs its tests (CI does too): every branch against a mock server standing in for production and Sanity.

**Bulk changes.** The webhook fires once per changed document, so a dataset import or a script patching many documents sends one deploy-hook call per document. Keep **Vercel → Project → Settings → Build and Deployment → On-Demand Concurrent Builds: "Run up to one build per branch"**: calls that arrive during a build collapse into one follow-up build, which the step skips if the first build already had the final content. The Pro default ("Run all builds immediately") starts every call at once, before any of them has published a new build-info.json, so each one would build.

### Daily rebuild

`.github/workflows/daily-rebuild.yml` calls the deploy hook every day at 00:17 Arizona time, so what the build computes from the date stays current: a job opening past its closing date drops off /careers along with its JobPosting, and the footer year turns over on 1 January. (The office open/closed line is worked out in the visitor's browser from the published hours and needs no rebuild.) The Ignored Build Step lets the call build when the live build was made on an earlier Arizona day, so the call builds once a day whatever else was built the day before, and a later call the same day is skipped. A job past its closing date (compared by the Arizona date) therefore leaves at the call just after midnight.

It is optional, and does nothing until the repository has the secret:

1. Vercel → Project → Settings → Git → Deploy Hooks: create a hook on the production branch.
2. GitHub → Settings → Secrets and variables → Actions → New repository secret: `VERCEL_DEPLOY_HOOK_URL` = the hook URL.
3. Actions → Daily rebuild → Run workflow, once: the log should read "Deploy hook answered 200" (or 201), and a deployment should appear in Vercel.

Scheduled workflows run from the default branch.

## Launch tooling

`scripts/launch/verify.mjs` checks a deployment the way launch day needs. It covers:

- apex → www and http → https, each in one hop;
- `/x/` → `/x` for every sitemap path;
- every legacy, post and Sanity redirect, with and without a trailing slash, and removed URLs answering 404;
- robots.txt, the sitemap's 96 URLs and their lastmod;
- 200, no noindex and one www canonical on every sitemap page;
- GA on every page;
- `GET /api/contact` answering 405 with `Allow: POST` and an empty POST answering 400;
- at least one lead destination set for the build, read from `build-info.json`'s `delivery` (without one every form answers 503);
- the parity crawl.

It exits 1 on any failure and writes a JSON report.

```bash
node scripts/launch/verify.mjs --base https://www.thewireguyelectric.com          # launch day, after DNS: repeat until it exits 0
node scripts/launch/verify.mjs --base https://thewireguyelectric.vercel.app --allow-noindex   # the preview (export VERCEL_AUTOMATION_BYPASS_SECRET)
PUBLIC_SANITY_PROJECT_ID= node scripts/launch/verify.mjs --base http://localhost:4321          # serve-build.mjs, local-dataset build
```

`--allow-noindex` reports a blocking robots.txt, noindex, the missing GA tag and a build with no lead destination as INFO, for a build before launch. A few hygiene checks only warn: the frame headers the live site sends, `/x/index.html` → `/x`, `/favicon.ico`, `/build-info.json`, and on www, that the `.vercel.app` alias is not an indexable duplicate. Expected redirects come from Sanity unless `PUBLIC_SANITY_PROJECT_ID` is set; set it empty for a local-dataset build. The script's header lists the options for skipping a group.

`scripts/launch/indexnow.mjs` submits the sitemap to IndexNow, which reaches Bing, Yandex, Seznam, Naver and Yep (Google does not take part). The key is public by design. It lives in `web/public/5177a4ccdcf3567e8a2b870a351c63a9.txt`, served from the site root, and the script checks that the live file answers with the key before sending anything. Run it once verify.mjs passes on www, and again after a batch of content changes:

```bash
node scripts/launch/indexnow.mjs --dry-run              # check the key file, show what would be sent
node scripts/launch/indexnow.mjs                        # every sitemap URL
node scripts/launch/indexnow.mjs --since 2026-10-20     # only URLs whose lastmod is on or after a date
node scripts/launch/indexnow.mjs --from http://localhost:4321 --dry-run   # before launch, against serve-build.mjs
```

A 200 or 202 means accepted; 202 means the engine is still validating the key. To rotate the key, replace the file: its name and its content are both the key.
