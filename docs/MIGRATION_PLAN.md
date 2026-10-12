# Migration plan: Webflow → Astro + Sanity + Vercel

**Goal:** move thewireguyelectric.com off Webflow with zero loss of rankings, then use the new stack to publish more and better content.

**Principle:** at launch, change the platform and nothing else that Google scores. URLs, titles, meta descriptions, H1s and body copy stay identical. Improvements ship after launch, in batches, so any movement can be traced to its cause.

## Where things stand (this PR)

| Done | Evidence |
|---|---|
| Live site crawled: every URL's status, title, meta, H1–H3, JSON-LD, links, images | `migration/seo-baseline.json` (113 URLs) |
| Full CMS export (53 posts, 21 services, 10 cities, categories) plus forms and scripts | `migration/webflow-cms/` |
| Astro site rebuilt on the same URL structure (www, no trailing slash) | `web/` |
| Sanity content model mirroring Webflow, plus models for growth (projects, reviews, service × city, FAQs, redirects) | `studio/schemaTypes/` |
| Converter from Webflow to Sanity: HTML → Portable Text, images queued for re-hosting, broken links fixed | `scripts/migrate/webflow-to-sanity.mjs` |
| **Parity check passes: 0 errors.** All 105 live URLs keep identical title, meta description, H1 and a correct canonical | `scripts/seo/parity.mjs`, run in CI on every PR |

The parity check still warns about **body copy on 6 hand-designed pages**: `/about-us`, `/our-team`, `/contact-us`, `/careers`, `/commercial-electrician` and `/services`. Their copy lives in Webflow's designer, not the CMS. It's archived in `migration/live-snapshots/` and gets rebuilt as Sanity page sections in Phase 2.

## What the audit found on the live site

These are fixed in the new build:

- **No canonical tags on any page** (0 of 105). The new site emits a self-referencing absolute canonical on every indexable page.
- **Broken internal links:**
  - 39 links to `/estimate`, which 404s. The CMS posts link there.
  - Links to `/locations/mesa` and `/services/electrical-panels`, both 404.
  - One link to `/blog/...` instead of `/blog-posts/...`.

  All are rewritten at import and also 301-redirected.
- **Junk URLs in the sitemap that return 200:** `/checkout`, `/paypal-checkout`, `/order-confirmation`, `/search`, plus 9 indexable `/product/*` and `/category/*` pages (Webflow e-commerce filler). The utility pages now 404. The product and category pages 301 to `/services`.
- **Missing structured data:** blog posts had no `BlogPosting`, service pages had no `Service`, city pages had nothing. All now get a connected `@graph`, with the business entity, breadcrumbs and page-type schema.
- **Duplicate H1s:** on `/services-categories/*` and one blog post.
- **Missing alt text:** most images have none. Studio now requires alt text on every image.
- **Weight and third-party scripts:** jQuery, the Webflow runtime, WebFont loader, reCAPTCHA on every page, and 2 Elfsight widgets are gone. Fonts are self-hosted.
- **A third-party "SEObot" banner script** embedded in one blog post. Removed.

Deliberate changes:
- The self-serving `aggregateRating` in the homepage schema is removed, because Google never shows stars for a business's own ratings. The rating stays visible on the page.
- The `/blog` list is no longer paginated by query string.

## Phases

### Phase 1: Accounts, data and decisions

| Item | Status |
|---|---|
| Webflow 301 redirects | **None existed** (confirmed by the owner). No legacy rules to carry over. |
| Search Console data | Pulled through OpenSEO (16 months, 107 URLs): `migration/seo-equity/gsc-pages-16mo.tsv`. 11 misspelled URLs that Google has seen and that 404 today now 301 to the right posts. |
| Sanity project | **Created:** "The Wire Guy Electric" (`qhi2uf0l`, dataset `production`), in the Celaya Ventures org. All 134 documents imported, with 83 images re-hosted on Sanity's CDN. The build output has zero references to Webflow's CDN. |
| Sanity Studio hosting | **Waiting on a token.** Create one in sanity.io/manage → project → API → Tokens with "Deploy Studio" permission, save it as GitHub secret `SANITY_AUTH_TOKEN`, then run the "Deploy Sanity Studio" workflow. Alternatively, run `pnpm --filter studio deploy` from a machine logged in to Sanity. |
| Vercel | **Waiting on access.** The Pro team ("celaya-ventures") isn't reachable through the current Vercel connection. Either reconnect the connector with access to that team, or import the repo in the dashboard (steps below). |
| Scottsdale office | A real, appointment-only office with its own Google Business Profile. It's modeled as its own `Electrician` entity on `/locations/scottsdale` (linked to the main business), and shown in the footer as "by appointment". **To do:** enter the exact Google Business Profile name in Studio → Site settings → Addresses, and point that profile's website link at `/locations/scottsdale`. |
| Form delivery | `/api/contact` delivers to Formspark (`FORMSPARK_FORM_ID`), any webhook (`LEAD_WEBHOOK_URL`, e.g. Zapier → Housecall Pro) and/or email (Resend). Configure at least one before launch. |
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

- Import into Sanity and build from Sanity, not the local dataset.
- Run the parity crawl **against the preview URL** (`--allow-noindex`), with 0 errors.
- Curl matrix: `/x/` → `/x` in one hop, `/x.html`, http → https, apex → www, and every legacy redirect.
- Test forms end to end, GA4 events (`phone_call_click`, `generate_lead`) and call tracking if used.
- Check that no rich text or image still points at `*.webflow.io` or `website-files.com`:

  ```bash
  grep -r "website-files.com" web/.vercel/output/static | wc -l   # must be 0 once images are imported
  ```

### Phase 4: Cutover (launch day)

Pick a date outside a Google core-update rollout (check the [Search Status Dashboard](https://status.search.google.com/)) and outside the summer peak. **Early to mid November** or **January** are good windows.

**One week before:**
- Lower the DNS TTL to 300 s.
- Freeze Webflow CMS edits. Re-run `pnpm seo:baseline` and the converter to pick up any last changes, then re-import.

**Launch:**
1. In Vercel, add `www.thewireguyelectric.com` as primary and `thewireguyelectric.com` → redirect to www. Confirm SSL.
2. Set `SITE_INDEXABLE=true` on **Production only** and redeploy.
3. Switch DNS to Vercel.
4. Verify:
   - `curl -sI https://www.thewireguyelectric.com/` gives 200 with no `x-robots-tag`;
   - `/robots.txt` allows crawling;
   - `/sitemap.xml` lists 95 URLs.
5. Run the parity crawl against production, without `--allow-noindex`. It must report 0 errors.
6. **Search Console:**
   - URL-inspect and request indexing for the homepage and the top 20 pages;
   - resubmit `/sitemap.xml`;
   - check that site verification still works. It moves from the meta tag to Sanity settings; also verify a DNS TXT Domain property.
7. **Bing Webmaster Tools:** resubmit the sitemap.
8. Test a form submission and a `tel:` click on mobile.

**Rollback:** keep the Webflow site plan active for 30+ days. To roll back, point DNS back to Webflow. No content is lost, because Sanity holds everything.

### Phase 5: First 90 days

- **GSC Page indexing:** daily in week 1, then weekly. Watch Not found, Excluded by noindex, Duplicate without canonical, and crawl stats.
- **Vercel logs:** scan for 404s with referrers or Googlebot hits. Add a Redirect document for anything legitimate.
- **Rankings:** compare 28 days against the prior 28 days and against last year. Investigate any page down more than 5 positions for 2 weeks, using its baseline record.
- Only after the dust settles (4–6 weeks): start the growth roadmap in [`SEO_STRATEGY.md`](SEO_STRATEGY.md).

## Architecture decisions

| Decision | Why |
|---|---|
| **Static output (SSG) + rebuild on publish** | Fastest possible pages and nothing to break at request time. Fewer than 200 pages build in under a minute. ISR adds cache-invalidation complexity for no SEO gain. |
| **URLs: `trailingSlash: 'never'`** | Matches Webflow. The `@astrojs/vercel` adapter forces `build.format: 'directory'` and emits Vercel's `trailingSlash: false` routing (verified in `.vercel/output/config.json`: `/x/` → 308 → `/x`). Canonicals are built from the route path, never `Astro.url`. |
| **Indexing off by default** | Pages are `noindex` and `robots.txt` blocks crawling unless `SITE_INDEXABLE=true`, so previews, branch domains and the pre-launch production deployment can't compete with the live site. Vercel also adds `X-Robots-Tag: noindex` to previews. |
| **Redirects in code + Sanity, flattened at build** | Legacy rules live in `web/src/config/redirects.mjs`. Editor-managed rules are `Redirect` documents. Chains are collapsed to one hop, and loops fail the build. |
| **Images on Sanity's CDN** | `auto=format` (AVIF/WebP), responsive `srcset`, explicit width and height (no CLS). Not double-processed through Vercel Image Optimization. |
| **Standalone Studio** (not embedded) | Sanity's recommended monorepo shape: the site bundle stays lean, and the Studio auto-updates independently. |
| **Slug-change guard** | Changing a published page's slug warns the editor unless a redirect from the old URL exists. |
| **Live titles frozen at import** | Imported docs store the exact live title or description as an SEO override only where the template wouldn't reproduce it, so parity holds and new content stays DRY. |
