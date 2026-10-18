# Migration plan: Webflow → Astro + Sanity + Vercel

**Goal:** move thewireguyelectric.com off Webflow with zero loss of rankings, then use the new stack to publish more and better content.

**Principle:** at launch, change the platform and nothing else that Google scores. URLs, titles, meta descriptions, H1s and body copy stay identical. Improvements ship after launch, in batches, so any movement can be traced to its cause.

**Exception (2026-10-17):** the owner asked for the SEO work and the removal of AI-written filler before launch. Those changes ship with the launch: every one was verified first, Tier 1 titles and H1s stay frozen, and the parity gate accepts only the approved values (`migration/seo-intentional-changes.json`). Half the city titles are held back as a control group. See [`SEO_STRATEGY.md`](SEO_STRATEGY.md#shipped-with-the-launch-october-2026).

## Where things stand (this PR)

| Done | Evidence |
|---|---|
| Live site crawled: every URL's status, title, meta, H1–H3, JSON-LD, links, images | `migration/seo-baseline.json` (124 URLs: 105 answer 200, 19 answer 404; 99 are in the live sitemap) |
| Full CMS export (53 posts, 21 services, 10 cities, categories) plus forms and scripts | `migration/webflow-cms/` |
| Astro site rebuilt on the same URL structure (www, no trailing slash) | `web/` |
| Sanity content model mirroring Webflow, plus models for growth (projects, reviews, service × city, FAQs, redirects) | `studio/schemaTypes/` |
| Converter from Webflow to Sanity: HTML → Portable Text, images queued for re-hosting, broken links fixed | `scripts/migrate/webflow-to-sanity.mjs` |
| **Parity check passes: 0 errors.** All 105 live URLs keep identical title, meta description, H1 and a correct canonical | `scripts/seo/parity.mjs`, run in CI on every PR |

The launch itself is run from [`LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md): who does what, day by day, with the exact settings.

## What the audit found on the live site

These are fixed in the new build:

- **No canonical tags on any page** (0 of 105). The new site emits a self-referencing absolute canonical on every indexable page.
- **Broken internal links:**
  - 39 links to `/estimate`, which 404s. The CMS posts link there. `/estimate` is now a real page (the Free Estimate form), so those links work as written.
  - Links to `/locations/mesa` and `/services/electrical-panels`, both 404.
  - One link to `/blog/...` instead of `/blog-posts/...`.

  The last two kinds are rewritten at import and also 301-redirected.
- **Junk URLs in the sitemap that return 200:** `/checkout`, `/paypal-checkout`, `/order-confirmation`, `/search`, plus 9 indexable `/product/*` and `/category/*` pages (Webflow e-commerce filler). The utility pages now 404. The product and category pages 301 to `/services`.
- **Missing structured data:** blog posts had no `BlogPosting`, service pages had no `Service`, city pages had nothing. All now get a connected `@graph`, with the business entity, breadcrumbs and page-type schema.
- **Duplicate H1s:** on `/services-categories/*` and one blog post.
- **Missing alt text:** most images have none. Studio now requires alt text on every image.
- **Weight and third-party scripts:** jQuery, the Webflow runtime, WebFont loader, reCAPTCHA on every page, and 2 Elfsight widgets are gone. Fonts are self-hosted.
- **A third-party "SEObot" banner script** embedded in one blog post. Removed.

Deliberate changes:
- The self-serving `aggregateRating` in the homepage schema is removed, because Google never shows stars for a business's own ratings. The rating stays visible on the page.
- The `/blog` list is no longer paginated by query string.

## Design (October 2026)

The first build rendered the published Webflow design itself (its compiled CSS, navbar, footer and page markup, generated from the live HTML snapshots), so SEO parity could be proven before any design changed. That port is gone. Every page now renders the owner-approved round-5 redesign on `web/src/layouts/SiteLayout.astro` (see `docs/DESIGN_SYSTEM.md`), from the same Sanity content, with the same titles, meta descriptions, H1s, canonicals, structured-data types and URLs. The parity check reports 0 errors and 0 warnings, and every page carries more words and internal links than the live one.

Deliberate differences from the live site:
- "All Services" lists every service. Webflow's list was capped at 16, which hid Panels, EV Chargers, Recessed Lighting, Troubleshooting and Remodels.
- The blog index lists every post, instead of 6 per page.
- Duplicate H1s are demoted to H2.
- The "Buy this Template" leftovers from the purchased Webflow template are removed.
- `/estimate` is a real, indexable page with the estimate form (it used to 404); every "Free Estimate" link goes there.

## Phases

### Phase 1: Accounts, data and decisions

| Item | Status |
|---|---|
| Webflow 301 redirects | **None existed** (confirmed by the owner). No legacy rules to carry over. |
| Search Console data | Pulled through OpenSEO (16 months, 107 URLs): `migration/seo-equity/gsc-pages-16mo.tsv`. 11 misspelled URLs that Google has seen and that 404 today now 301 to the right posts. |
| Sanity project | **Created:** "The Wire Guy Electric" (`qhi2uf0l`, dataset `production`), in the Celaya Ventures org. On 2026-10-17 the redesign's content (201 documents: page sections, 46 reviews, local facts, service answers) was imported with `--replace`, after a backup export of the previous dataset. Images are on Sanity's CDN; the build output has zero references to Webflow's CDN. |
| Sanity Studio hosting | **Waiting on a token.** Create one in sanity.io/manage → project → API → Tokens with "Deploy Studio" permission, save it as GitHub secret `SANITY_AUTH_TOKEN`, then run the "Deploy Sanity Studio" workflow. Alternatively, run `pnpm --filter studio deploy` from a machine logged in to Sanity. |
| Vercel | **Live preview.** Project `thewireguyelectric` in the celaya-ventures team, root directory `web`, with Sanity env vars set. Its production branch is still PR #1's branch (`claude/funny-goldberg-0idk0t`), so every push to it deploys to https://thewireguyelectric.vercel.app, noindexed and behind Vercel Authentication for all deployments (set to "All deployments" on 2026-10-13, because the default left the production `.vercel.app` address public; switch back at cutover). The parity check against this real deployment reports 0 errors. A "Protection Bypass for Automation" secret exists for the crawler; revoke it a week after launch. A Deploy Hook and the Sanity webhook that calls it are in place (README, "How content gets to the live site"); the hook builds one branch, so it is recreated for `main` at launch. |
| Scottsdale office | A real, appointment-only office with its own Google Business Profile. It's modeled as its own `Electrician` entity on `/locations/scottsdale` (linked to the main business), and shown in the footer as "by appointment". **To do:** enter the exact Google Business Profile name in Studio → Site settings → Addresses, and point that profile's website link at `/locations/scottsdale`. |
| Form delivery | `/api/contact` delivers to Formspark (`FORMSPARK_FORM_ID`), any webhook (`LEAD_WEBHOOK_URL`, e.g. Zapier → Housecall Pro) and/or email (Resend). Formspark is the launch destination; none is configured yet (the preview answers 503). Setup and its traps: [`FORMS.md`](FORMS.md). |
| Blog authors | None shown (owner's choice). Schema attributes posts to the business. |
| Design | **Refresh.** Guardrail: presentation can change freely, but URLs, titles, meta descriptions, H1s and body copy stay identical at launch. The parity check enforces this. |

**Vercel import (dashboard):**
1. vercel.com/new: switch to the celaya-ventures team and import `patrickcelaya/thewireguyelectric`.
2. Set Root Directory to `web`. The framework (Astro) is detected automatically.
3. Add environment variables: `PUBLIC_SANITY_PROJECT_ID=qhi2uf0l` and `PUBLIC_SANITY_DATASET=production`. **Do not** set `SITE_INDEXABLE` and **do not** add the domain yet.
4. Deploy, then create a Deploy Hook (Settings → Git → Deploy Hooks).
5. In Sanity (sanity.io/manage → API → Webhooks), add a webhook to that hook URL. Use filter `!(_id in path("drafts.**"))` and trigger on create, update and delete.

### Phase 2: Design and page build-out

- Rebuild the hand-designed pages as Sanity page sections, carrying over their copy word for word:
  - `/`
  - `/about-us`, `/our-team`
  - `/contact-us`, `/careers`
  - `/commercial-electrician`, `/services`, `/faq`

  Done means the parity check is clean, with no content warnings.
- Real job photos and hero images. Upload team photos and alt text.
- Lighthouse and Core Web Vitals budget: LCP < 2.5 s and INP < 200 ms on mobile, with a near-zero third-party JS budget.

### Phase 3: Pre-launch verification on a Vercel preview

Run on 2026-10-17 against the Sanity-backed preview and an indexable local build of PR #1 (`d3db0c6`):

| Check | Result |
|---|---|
| Content imported into Sanity; the preview builds from Sanity | Done (201 documents). The launch fixes are imported again at T-1 |
| Parity crawl against the preview (`--allow-noindex`) | 124 URLs: 0 errors, 0 warnings |
| Redirects: 80 legacy, misspelling and `/blog/` rules in one 301 each; `/x/` → `/x` in one 308 for 95 paths; query strings kept | Pass |
| `scripts/launch/verify.mjs --allow-noindex` on the preview (the redirect matrix, robots, sitemap, pages, form endpoint) | 18 passed, 0 failures (parity group run separately) |
| Indexable build: sitemap, canonicals, GA, structured data | 96 sitemap URLs, each with one www canonical; GA on every page; validator.schema.org 0 errors |
| No reference to `*.webflow.io`, `website-files.com` or `webflow.com` in any page, CSS or JS | None |
| Webflow changes since the 2026-10-12 baseline crawl | None: identical HTML on all 124 URLs, CMS unchanged |
| Forms end to end | Waiting for `FORMSPARK_FORM_ID` (the preview answers 503) |
| The launch fixes, merged (local indexable build of the integration branch, 2026-10-17) | Parity: 0 errors; the 60 approved title, meta and H1 changes on 37 pages, the 10 wave-2 values reported as pending, no Tier 1 title or H1 changed, and one word-count warning (`common-electrical-issues-in-scottsdale-homes`, -29% after its filler edits). `pnpm seo:schema`: 100 pages, 0 failures. Forms against mocked providers: 42/42 API and 27/27 browser checks. axe: 0 violations on 10 pages at 390 and 1440 px. Lighthouse mobile on home, Gilbert, panels and the hot-weather post: performance 98–99, SEO, accessibility and best practices 100, CLS at most 0.0001 |

Still to do before launch, each in [`LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md):
- **Replace the Ignored Build Step guard.** The same-commit guard from the README cancels any rebuild of an already-deployed commit: on 2026-10-17 it canceled at least 8 production deployments of `d3db0c6`. Left in place it would cancel the launch redeploy (leaving www noindexed) and every Sanity publish. The content-aware `node scripts/ignore-build.mjs` replaces it.
- Set **On-Demand Concurrent Builds** to "Run up to one build per branch".
- Set up Formspark and confirm the FlowDrive account.
- Back up Sanity, import the launch dataset, then freeze Studio edits: a `--replace` import overwrites any Studio edit made since the last one.
- Re-run `verify.mjs` and the parity crawl on the preview.

### Phase 4: Cutover (launch day)

**Date: Thursday 2026-10-22**, decided 2026-10-17. The [Search Status Dashboard](https://status.search.google.com/) showed no incident; the last ranking update (the September 2026 spam update) ended 2026-10-08, and the last core update on 2026-06-02. Re-check on launch morning, and postpone if a core update has started.

**Before** (runbook T-5 to T-1):
- Lower the www CNAME TTL from 14400 to 300 at least 4 hours before the switch. The apex A is already 300.
- Freeze Webflow: no edits and no publishing (a staged home page edit from 2026-10-12 would go live). The baseline needs no re-crawl: the 2026-10-17 drift check found no change.
- Add both domains in Vercel at T-2 (www primary, apex 301 to www), so any `_vercel` verification shows up early.

**Launch order** (steps L1–L15 in the runbook):
1. Vercel production branch → `main`.
2. `SITE_INDEXABLE=true` on **Production only**, while protection is still on all deployments.
3. Merge PR #1 into `main`. The merge is a new commit, so both the old guard and the new check let it build; confirm the log shows the build ran, not "Canceled".
4. Check that build on the protected alias. The alias always sends `X-Robots-Tag: noindex` (every host but www does), so check the page's robots tag reads `index, follow`.
5. Vercel Authentication → **Standard Protection**, or visitors on the real domain get a Vercel login.
6. DNS at WordPress.com: edit the apex A and the www CNAME in place to the values on the Vercel domain cards. Keep everything else: the 5 Google Workspace MX records, SPF, `google-site-verification` (it backs the Search Console Domain property), `openai-domain-verification`, `_domainconnect`, the `*` CNAME and the nameservers.
7. `node scripts/launch/verify.mjs --base https://www.thewireguyelectric.com` exits 0. It replaces the old three curl checks: apex → www, http → https, slashes, the 80 redirects, robots, a 96-URL sitemap, every page 200 and indexable with its canonical, GA, the form endpoint and the parity crawl with 0 errors.
8. Phone, form and email tests on a real phone.
9. `node scripts/launch/indexnow.mjs`.
10. **Search Console:** both properties still verified (the meta tag keeps its value, now served from Site settings; the DNS TXT covers the Domain property), sitemap submitted, indexing requested for the top pages. **Bing:** the live site has no Bing verification, so import the site from Search Console, then submit the sitemap. **GA4:** annotate the launch, mark the key events.
11. Recreate the deploy hook for `main`, and point the Sanity webhook and the `VERCEL_DEPLOY_HOOK_URL` repository secret at it.
12. Google Business Profile (Mesa): website → `https://www.thewireguyelectric.com/`.

**Rollback:** edit the two DNS records back (`198.202.211.1`, `cdn.webflow.com.`; TTL 300, about 5 minutes). Webflow keeps both domains and its paid plan for 30+ days, unpublished changes and all. No content is lost, because Sanity holds everything.

### Phase 5: First 90 days

- **Week 1:** Search Console Pages report daily (Not found, Excluded by noindex, Duplicate without user-selected canonical), then weekly. Vercel logs: 404s with referrers or Googlebot hits; add a Redirect document for anything legitimate. Formspark's Spam folder daily.
- **2026-10-29 (L+7):** revoke the Protection Bypass for Automation secret. Start the owner's off-site fixes (runbook).
- **2026-11-18:** the /careers job posting expires. The daily rebuild removes it on 2026-11-19 unless it is extended in Studio.
- **2026-11-19 (L+28):** wave-2 city titles, if wave 1 held up ([`SEO_STRATEGY.md`](SEO_STRATEGY.md#deferred-and-when)). Then re-crawl production into a new baseline (`pnpm seo:baseline`), so the parity gate protects the new values.
- **From 2026-11-21 (L+30): retire Webflow, in this order.** Export the form submissions; keep "Disable Webflow subdomain indexing" on; remove both custom domains; unpublish the `wire-guy.webflow.io` site (the indexing toggle needs a paid plan); only then cancel the plan. At WordPress.com delete the `proxy-ssl.webflow.com.` TXT and raise the two TTLs to 3600.
- **Rankings:** compare 28 days against the prior 28 days and against last year. Investigate any page down more than 5 positions for 2 weeks, using its baseline record. Judge from Search Console, not GA4: the new site loads GA once instead of twice, so GA numbers shift at launch.
- Only after the dust settles (4–6 weeks): start the growth roadmap in [`SEO_STRATEGY.md`](SEO_STRATEGY.md).

## Architecture decisions

| Decision | Why |
|---|---|
| **Static output (SSG) + rebuild on publish** | Fastest possible pages and nothing to break at request time. Fewer than 200 pages build in under a minute. ISR adds cache-invalidation complexity for no SEO gain. |
| **URLs: `trailingSlash: 'never'`** | Matches Webflow. The `@astrojs/vercel` adapter forces `build.format: 'directory'` and emits Vercel's `trailingSlash: false` routing (verified in `.vercel/output/config.json`: `/x/` → 308 → `/x`). Canonicals are built from the route path, never `Astro.url`. |
| **Indexing off by default** | Pages are `noindex` and `robots.txt` blocks crawling unless `SITE_INDEXABLE=true`, so previews, branch domains and the pre-launch production deployment can't compete with the live site. Vercel adds `X-Robots-Tag: noindex` to preview deployments, but not to the production `thewireguyelectric.vercel.app` alias; the build adds it to every host except www (`web/src/config/one-hop-redirects.mjs`). |
| **Production builds only when something changed** | The Ignored Build Step (`web/scripts/ignore-build.mjs`) compares the commit, the content source, `SITE_INDEXABLE`, which form destinations are set and a hash of Sanity's published documents with the live `/build-info.json`, and rebuilds when the last build is more than 20 hours old. Any doubt builds. With On-Demand Concurrent Builds set to "Run up to one build per branch", a burst of webhook calls costs one or two builds. |
| **Redirects in code + Sanity, flattened at build** | Legacy rules live in `web/src/config/redirects.mjs`. Editor-managed rules are `Redirect` documents. Chains are collapsed to one hop, and loops fail the build. |
| **Images on Sanity's CDN** | `auto=format` (AVIF/WebP), responsive `srcset`, explicit width and height (no CLS). Not double-processed through Vercel Image Optimization. |
| **Standalone Studio** (not embedded) | Sanity's recommended monorepo shape: the site bundle stays lean, and the Studio auto-updates independently. |
| **Slug-change guard** | Changing a published page's slug warns the editor unless a redirect from the old URL exists. |
| **Live titles frozen at import** | Imported docs store the exact live title or description as an SEO override only where the template wouldn't reproduce it, so parity holds and new content stays DRY. |
