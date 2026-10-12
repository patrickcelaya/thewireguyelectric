# SEO equity: thewireguyelectric.com (Webflow → Astro + Sanity)

Prepared 2026-10-12.

> **No Ahrefs or GSC data was retrieved.** Every Ahrefs MCP endpoint returned `Insufficient plan`, including the free ones, because the connected Ahrefs plan has no API v3 access. GSC was only reachable through Ahrefs, so it was unavailable too. This file therefore has no traffic, ranking, keyword, backlink, DR or competitor numbers. Everything below is either **measured** (live crawl, HTTP checks, Webflow CMS export) or labelled **judgment**.

## Files

| File | Source | What it holds |
|---|---|---|
| `../seo-baseline.json` | `scripts/seo/crawl.mjs` against the live site | **The parity baseline.** Every URL's status, title, meta, H1–H3, JSON-LD, links and images |
| ahrefs-access-log.json | Ahrefs MCP | Every call made, all failed; 0 units used |
| live-onpage-baseline.json | Live crawl, 114 URLs | Title, meta description, H1s, robots, canonical and word count |
| live-url-variants.json | curl | How http, apex, slash, case, index.html, query and old-slug variants respond |
| internal-broken-links.json | Live HTML | Internal links to URLs that 404 |
| webflow-cms-nonsitemap-urls.json | CMS export + curl | CMS URLs not in the sitemap, with live status |
| redirect-candidates.json | Derived | Pattern rules and URL redirects |

## Measured facts

- 99 sitemap URLs: 13 pages, 53 posts, 21 services, 10 locations, 2 service categories.
- 15 more URLs return 200 without being in the sitemap: `/posts-categories/*` ×3 (noindex), `/product/*` ×6 and `/category/*` ×3 (indexable template filler), `/index.html`, `/401`, `/404`.
- **0 of 114 pages have a canonical tag.** Query strings return 200 with no canonical.
- http→https, apex→www and trailing-slash→none already 301 (apex over http takes 2 hops). Mixed case returns 404.
- `/services/hanging-lights`: the CMS export holds a 2026-08-18 draft, but the live page is the 2024-09-19 version. Migrate the live version.

## Priority URL tiers (provisional: not data-ranked)

| Tier | URLs | Rule |
|---|---|---|
| 1 (93) | `/`, about-us, our-team, faq, careers, contact-us, blog, services, commercial-electrician, all 21 `/services/*`, all 10 `/locations/*`, all 53 `/blog-posts/*` | Keep URL, title, H1, meta description and copy identical to the baseline at launch; `pnpm seo:parity` enforces this |
| 2 (6) | `/search`, `/checkout`, `/paypal-checkout`, `/order-confirmation`, `/services-categories/{commercial,residential}` | Keep the services-categories pages; 301 the rest |

Re-rank Tier 1 once Ahrefs or GSC data is in.

## Redirect list (all 301; external-link counts UNKNOWN)

Pattern rules:
- http and apex → `https://www` (Vercel domain settings)
- `/x/` → `/x` (Astro `trailingSlash: 'never'`, which the Vercel adapter maps to Vercel's `trailingSlash: false`)
- `/index.html` → `/`
- `/blog/:slug` → `/blog-posts/:slug`
- `/blog?f384d0a1_page=N` and `/services?6dcb6eb7_page=N`: Webflow pagination params. The new pages serve the same content at the bare URL with a canonical, so these consolidate without a redirect.

URL redirects (implemented in `web/src/config/redirects.mjs`):

| Source | Target | Reason |
|---|---|---|
| /estimate | /contact-us | 404, linked from 38 blog posts; contact-us is the "Free Electrical Estimate" page |
| /locations/mesa | / | 404, linked from 3 posts; the homepage is the Mesa page (alternative: build a real Mesa page) |
| /services/electrical-panels | /services/panels | 404, linked from 2 posts |
| /blog/ev-charger-hardwired-vs-plug-in-phoenix | /blog-posts/ev-charger-hardwired-vs-plug-in-phoenix | 404, linked from 1 post |
| /product/* (6) and /category/* (3) | /services | 200 today, indexable Webflow template filler |
| /checkout, /paypal-checkout, /order-confirmation, /search | / | Webflow e-commerce/utility pages |
| 4 archived 2023 posts | Topical equivalents | Low confidence: unknown whether they were ever public |

**Still missing:** the redirects already configured in Webflow (Site settings → Publishing → 301 redirects). The API only exposes them on Enterprise plans, so they must be copied by hand.

## Content observations (judgment)

- There is no `/locations/mesa` page, even though Mesa is home base.
- There are no service × city pages.
- Possible cannibalization: breaker tripping (6 posts), panels (5), EV (4), flickering lights (3), surge protection (2). Don't merge these during the migration; decide with GSC data afterwards.

## Data gaps and how to close them

- **Ahrefs:** the plan has no API access. Export CSVs from the web UI: Top pages, Organic keywords, Best by links, Broken backlinks, Backlinks, Referring domains, Competitors.
- **GSC:** export Performance (Pages and Queries, last 16 months) and Links → Top linked pages.
- **Historical URLs:** web.archive.org is blocked from the build sandbox. Run the CDX query locally: `https://web.archive.org/cdx/search/cdx?url=thewireguyelectric.com/*&collapse=urlkey&output=json`
- **Existing Webflow 301 rules:** copy from Site settings → Publishing.
