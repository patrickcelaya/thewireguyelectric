# SEO Playbook: The Wire Guy Electric rebuild (Webflow → Astro + Sanity + Vercel)

Researched 2026-10-12. Evidence tags: **[strong]** = primary docs or large studies. **[moderate]** = credible industry studies or surveys. **[weak]** = anecdote. A ⚠ marks guidance that has changed or gone out of date since 2024.

## 0. What the live site does today (checked 2026-10-12)

These are the parity targets. Do not change them at launch.

- **Host:** `www`. The apex 301s to www.
- **No trailing slash:** `/locations/gilbert/` 301s to `/locations/gilbert`.
- **No `rel=canonical`** on any page sampled.
- **JSON-LD on the homepage only:** `Electrician` with `aggregateRating` 5.0/380, **two addresses** (Mesa 85205 and Scottsdale 85260), 11 `areaServed` cities, ROC 365306, and `sameAs` (FB/IG/Yelp/BBB).
- **The sitemap includes junk** that returns 200: `/checkout`, `/paypal-checkout`, `/order-confirmation`, `/search`, `/services-categories/*`.
- **There is no `/locations/mesa`.** The homepage is the Mesa page.
- **H1s use `style="opacity:0"`** (Webflow animations). Images are served from `cdn.prod.website-files.com`.
- **Blog cannibalization:** about 6 posts on "breaker tripping", 3 on "flickering lights", 3 on "panel upgrade signs".
- **Repo:** Astro 7.3.8 and `@astrojs/vercel` 11.0.14. Sanity already has `redirect`, `serviceLocation` (`/locations/<city>/<service>`) and `seo.noIndex`. **`@astrojs/sitemap` is not installed.**

---

## 1. Platform migration without losing rankings

**Google's guidance [strong]:**
- **Same URLs, new host:** follow the [hosting-change guide](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes) (updated 2025-12-10). Test on a `noindex` temp host, lower the DNS TTL at least a week ahead, remove blocks, and flip DNS. Expect *"a temporary drop in Googlebot's crawl rate immediately after the launch"*, then a recovery over the following days.
- **Any URL that changes:** follow the [site move with URL changes guide](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes) (updated 2026-08-20). Use server-side 301/308s, no chains, and keep redirects *"generally at least 1 year"*. Medium sites *"can take a few weeks or more"* to settle.
- **Status semantics** ([status codes](https://developers.google.com/search/docs/crawling-indexing/http-network-errors), [redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects)):
  - 301 and 308 are "strong" signals. 302 and 307 are "weak".
  - An instant meta refresh counts as permanent.
  - Googlebot follows at most 10 hops.
  - *"All 4xx errors, except 429, are treated the same."*
- **How long fluctuations last:** Google gives no figure for a same-URL replatform. Practitioners typically see 2–6 weeks of volatility when templates or internal links change **[weak]**. Keep template and nav changes minimal at launch.
- **Launch timing:** avoid ranking-update windows so a drop can be attributed. Recent cadence ([Status Dashboard](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)):
  - Core updates: Mar, Jun, Dec 2025 and Mar 27, May 21 2026.
  - Spam updates: Aug 2025, and Mar, Jun, Aug, Sep 24 2026 (13.5 days).
  - Also avoid the AZ summer peak.

**Pre-launch parity checklist:**
1. **Build the URL inventory** from the union of the Webflow sitemap, GSC pages with impressions (16 months), GA4 landing pages, Ahrefs linked URLs, and **Webflow's existing 301 list**. Export that list, or old backlinks break.
2. **Classify each URL** as keep (200 at the identical path), 301 (one hop), or 404 (the junk above, unless it has links or traffic).
3. **Diff old against new** with `seo:baseline` and `seo:parity`. Compare:
   - status and final URL;
   - title, meta, H1, robots;
   - canonical (absolute, www, no slash);
   - body word count, with nothing lost from accordions;
   - **inbound internal links per URL** (new ≥ old);
   - JSON-LD, alt text, OG tags.
4. **Import the exact Webflow titles, metas and H1s** into Sanity. Improve them later, in batches.
5. **Rewrite imported rich text** that still points at `*.webflow.io` or `website-files.com`. `grep` the build output for zero hits.
6. **`404.astro` must return a real 404.** No template may render empty pages, which Google treats as soft 404s.
7. **Verify GSC with DNS TXT** (Domain property).

**Launch day:**
- Make `www` primary in Vercel Domains and redirect the apex to it. Confirm SSL before the swap.
- Run the curl matrix: every variant must reach its 200 in **one hop**:

```bash
for u in https://thewireguyelectric.com/services/panels https://www.thewireguyelectric.com/services/panels/ \
  https://www.thewireguyelectric.com/services/panels.html http://www.thewireguyelectric.com/services/panels \
  https://<project>.vercel.app/services/panels; do curl -sI "$u" | grep -iE '^(HTTP|location|x-robots-tag)'; done
```

- Crawl the full inventory on production.
- Confirm production has no `x-robots-tag` and no `noindex`, and that `robots.txt` is correct.
- In GSC: live-test the top 20 URLs, resubmit the sitemap, and request indexing for key pages. In Bing Webmaster Tools: submit the sitemap and ping IndexNow.
- Test forms, call tracking and GA4.
- **Keep Webflow for 30+ days** so you can roll back.

**Post-launch monitoring (90 days):**
- **GSC Page indexing,** daily in week 1, then weekly: watch Not found, Excluded by noindex, and Google-chosen canonical.
- **Crawl stats:** host status, the 3xx/4xx share, and response time.
- **Vercel Observability or a log drain** for 404s with referrers or Googlebot hits. Add 301s where needed, and verify Googlebot by reverse DNS.
- **Compare rankings 28 days against the prior 28 days and against last year.** Diff any page that is down more than 5 positions for 2 weeks against the baseline.
- **Track the local pack separately.** Migrations rarely move it.

**Failure modes and guardrails:**

| Failure | Guardrail on this stack |
|---|---|
| Wrong canonical | Build it from `site` plus the slug. Never use `Astro.url`, which includes `.html` under `build.format:'file'` ([Astro](https://docs.astro.build/en/reference/configuration-reference/#buildformat)). Test in CI. |
| Slash duplicates | Astro defaults to `trailingSlash:'ignore'`. Set both Astro and Vercel (§7). |
| `noindex` leak | A staging custom domain loses Vercel's automatic noindex (§7). A stray Sanity `noIndex`. A copied `Disallow: /`. CI fails if any sitemap URL is noindexed or disallowed. |
| Lost internal links | Webflow related-posts blocks and footer links. Compare inbound counts and generate links from Sanity references. |
| Changed titles/H1s | Import the exact values. |
| JS-only content | All content in the initial HTML; no `client:only` for copy. Static Astro also fixes the `opacity:0` H1s. |
| Image URL changes | Unavoidable and low value. Keep alt text and Sanity [vanity filenames](https://www.sanity.io/docs/apis-and-sdks/image-urls). Download assets before cancelling Webflow. |
| Lost schema | Port the homepage JSON-LD and improve it (§5). |
| `robots.txt` | Never block `/_astro/`. Never copy staging rules to production. |
| Redirect chains | Webflow A→B plus a new B→C: flatten to A→C at build time and fail the build on loops. |

**404 vs 410 vs 301 for junk:** Google treats 404 and 410 the same, and static Vercel can't easily serve a 410. Let junk 404 and drop it from the sitemap. Only 301 a junk URL if it has backlinks and a relevant target. Never 301 everything to the homepage: Google treats that as a soft 404.

---

## 2. Local ranking factors (2025–2026)

- **Whitespark [2026 Local Search Ranking Factors](https://whitespark.ca/local-search-ranking-factors/)** (2025-11-06, 47 experts) **[moderate]**:
  - **Local pack:** primary GBP category; proximity; keywords in GBP name; address in the city searched; *open at time of search* (new, #5); high rating; visible address; additional categories; number of reviews with text; pin placement.
  - **Local organic:** **a dedicated page per service (#1)**; geo-relevance of content; link authority; keywords in the GBP landing page title and H1/H2s; **site-wide internal linking (#6)**; niche focus.
  - **Rising since 2023:** GBP predefined services (81→22) and hours (85→21). Reviews and behavioural signals gained. Citations dipped. "Title length" was rated a myth.
- **BrightLocal [Consumer Review Survey 2026](https://www.brightlocal.com/research/consumer-review-survey/)** (n=1,002) **[moderate]**:
  - 31% require 4.5★ or higher (17% in 2025). 74% want reviews from the last 3 months.
  - 80% prefer businesses that reply to every review, but 50% dislike templated replies.
  - Google usage is 71% (83% in 2025) and Apple Maps 27%. 45% use AI tools to find local businesses.
- **How the website feeds GBP and the pack:**
  - Keep the GBP link pointed at the **homepage** (the Mesa page, with the most authority). Don't change it during the migration **[weak]**.
  - Use title and H1 = category + city.
  - Keep NAP identical across schema, footer, GBP, Yelp, BBB, Bing Places and Apple Business Connect.
  - **Resolve the Scottsdale address.** If it has a GBP, it must be a staffed real location with its own `/locations/scottsdale` landing page and LocalBusiness node. If not, drop it from schema ([GBP guidelines](https://support.google.com/business/answer/3038177) forbid virtual offices).
  - **Sister brands need their own phone numbers and GBPs.** Cross-link only where relevant (e.g. a breaker that trips when the AC runs).
- **GBP rules:**
  - Hide the address (service-area business).
  - Keep the service area to about a 2-hour drive. States and countries were banned on 2025-06-24 ([PPC Land](https://ppc.land/google-bans-countries-and-states-from-business-profile-service-areas/)).
  - No extra keywords in the name. Categories say what the business **is**.
  - List real hours, and 24/7 only if true.
- **Local Services Ads** ⚠:
  - Google Guarantee became the **Google Verified** badge. The money-back guarantee ended for services booked after 2025-12-07 ([Google](https://support.google.com/localservices/answer/7549288)).
  - LSA is migrating into Google Ads as pay-per-lead Performance Max from Aug 2026 through 2027 ([SEJ](https://www.searchenginejournal.com/google-is-bringing-local-service-ads-into-google-ads/582816/)) **[moderate]**.
  - Use LSA to cover cities where proximity keeps you out of the pack (Phoenix, Scottsdale, Fountain Hills). It doesn't lift organic rankings.

---

## 3. Service × city pages vs doorway pages

- **Policy [strong]:**
  - [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies) (updated 2026-08-28) define doorways to include *"multiple domain names or pages targeted at specific regions or cities that funnel users to one page."*
  - Scaled content abuse (March 2024) is *"many pages … generated for the primary purpose of manipulating search rankings,"* whether made by AI or by hand.
  - The Quality Rater Guidelines (Jan 2025) rate low-effort, auto-generated main content *Lowest* ([SEL](https://searchengineland.com/google-quality-raters-content-ai-generated-454161)).
- **Swap test:** replace "Gilbert" with "Chandler". If the page is still true, it's a doorway.
- **What makes a city page unique:**
  - Real jobs: subdivision, home age, panel brand, the fix, photos, price band.
  - Reviews from that city.
  - **Utility:** SRP serves most of Mesa, Tempe, Chandler, Gilbert and Queen Creek. APS serves much of Phoenix and Scottsdale. Boundaries can follow a single street ([OhmSnap](https://www.ohmsnap.com/blog/solar-panels-phoenix-guide-2026) **[weak]**: verify by address). Mesa also runs a city electric utility in parts of central Mesa (verify).
  - Permit office and inspection timing.
  - Housing stock: 1970s–80s aluminum wiring, FPE/Zinsco panels, 125A services.
  - HOA and solar notes.
- **How many and how fast** (judgement; there is no official cap):
  - Launch with parity only.
  - Weeks 4–12: 20–30 pages for the top 4–5 services × the 5–6 cities with the most leads, about 2–4 a week.
  - Then expand only where GSC shows "service + city" impressions. **Never all 231.**
- **Publish gate** (Sanity validation plus build filter): at least 1 `project` in the city, at least 2 city `review`s, `utility` set, and at least 250 words of city-specific body text. Pages that fail are **not built**, which is better than noindexing them.

**Template for `/locations/<city>/<service>`:**
1. **H1** "Electrical Panel Upgrades in Gilbert, AZ", a 2–3 sentence local intro, and call + form above the fold.
2. **Trust strip:** ROC #365306 (linked to the [ROC lookup](https://roc.az.gov/)), "licensed, bonded, insured", Google rating as linked text, years in business.
3. **"Recent panel jobs in Gilbert":** 2–4 project cards (problem → fix, photos, price band, inspection passed).
4. **"What's different in Gilbert":** utility and service-upgrade steps, permit timeline, local housing, solar/HOA notes.
5. **Local price range** plus cost drivers, linked to the cost guide.
6. **Reviews from Gilbert customers** (dated, by neighborhood). No rating markup.
7. **Process and 3–5 city-specific FAQs.**
8. **Links:**
   - up: the service page and the city hub;
   - across: 2–3 nearby cities and 2–3 other Gilbert services;
   - out: 2–3 guides.
9. **Schema:** `BreadcrumbList` + `Service` (`provider` → `#business`, `areaServed` → City). Never invent an address.

---

## 4. Content strategy

**Hubs built around existing URLs** (keep every URL):

| Hub | Service URL | Posts to cluster |
|---|---|---|
| Panels and upgrades | `/services/panels`, `/services/electrical-upgrades` | 7-signs, do-you-need, cost, hot-to-touch, FPE/Zinsco |
| EV charging | `/services/ev-charger-installation` | installing, L1 vs L2, hardwired vs plug-in, Tesla vs ChargePoint, dryer outlet |
| Lighting | recessed, LED, custom, fixtures | recessed-phoenix, landscape cost, ceiling-fan cost |
| Troubleshooting | `/services/electrical-troubleshooting` | breaker ×6, flicker ×3, outlets, half-house-out |
| Generators / Surge | **add new service pages** if offered | standby, interlock, surge ×2 |
| Arizona-specific | (cross-hub) | heat, monsoon, AC disconnect, mini-split, pool pump |

- **Cost guides:**
  - Show ranges by scenario (100→200A swap, meter-base replacement, 400A for EV plus solar), the cost drivers including permit and utility steps, and 2–3 dated real jobs.
  - Add "Updated <month year>" and "Reviewed by <licensed electrician>". Re-price twice a year.
  - Add EV, generator and recessed lighting cost guides.
- **Problem pages:** open with "Call now if…" safety triggers (burning smell, hot or buzzing panel). Then safe checks, likely AZ causes, what the electrician does, cost, and a CTA. Link to the HVAC sister company where the AC is the trigger.
- **Consolidate the breaker and flicker clusters 6+ weeks after launch** by merging and 301ing. Google: removing unhelpful content *"can help the good content"* perform, and site-wide recovery *"could take several months"* ([core updates](https://developers.google.com/search/docs/appearance/core-updates)) **[strong]**.
- **E-E-A-T you can verify:**
  - **ROC # in the homepage body.** AZ ROC policy 2021.02 says that when ads point to the site, the homepage must show the license number prominently, and the footer alone isn't enough ([AZ ROC](https://www.azroc.gov/news/changes-arizona-law-regarding-advertising-requirements-contractors)).
  - Real author bios with license and photo. A byline plus "Reviewed by" on every post.
  - Only real job photos. First-hand detail (models, inspection results).
- **Internal linking:**
  - Home → service hubs and city hubs.
  - Service → its published city pages, cost guide and problem pages.
  - City hub → its services, projects and reviews.
  - Each post → one service page early (descriptive anchor) plus a city where relevant.
  - Breadcrumbs everywhere and a lean footer. Generate all links from Sanity references.
- **Site-level quality:** the helpful content system was folded into core ranking in March 2024 ([Google](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)), and quality is judged on the site "overall". Thin, templated pages weigh on the whole domain. That is the main risk of scaling city pages **[strong]**.

---

## 5. Structured data in 2026

⚠ **Status changes:**
- **FAQ rich results stopped showing on 2026-05-07,** and the documentation was removed on 2026-06-15 ([changelog](https://developers.google.com/search/updates)).
- HowTo rich results ended in 2023, and the sitelinks search box in Nov 2024.
- Breadcrumbs appear on desktop only since Jan 2025.
- Review docs now ban *"fake or undisclosed incentivized reviews."*

| Type | Where | Google output | Notes |
|---|---|---|---|
| `Electrician` `@id:#business` | Home, About, Contact | Knowledge panel and entity; no rich result | Required: `name`, `address`. Recommended: `telephone`, `url`, `geo`, `openingHoursSpecification`, `priceRange` ([doc](https://developers.google.com/search/docs/appearance/structured-data/local-business)). Add `areaServed`, `sameAs`, ROC `identifier`. **Remove `aggregateRating`.** |
| `WebSite` | Home | **Site name** | `name`, `alternateName` |
| `BreadcrumbList` | All but home | Breadcrumbs (desktop) | Must match the visible breadcrumb. |
| `Service` + `areaServed` | Service pages | None | Entity only. `provider` → `#business`. |
| `BlogPosting` + `Person` | Posts | Article understanding | `Person` with bio `url`, `jobTitle`, `hasCredential`. Honest `dateModified`. |
| `VideoObject` | Pages where the video is the main content | Video features | `name`, `thumbnailUrl`, `uploadDate`. `creator` added Sep 2026. |
| `AggregateRating`/`Review` | **Not for your own business** | Ineligible, even *"through an embedded third-party widget"* ([doc](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)) | Marking up ratings not visible on the page risks a manual action. |
| `FAQPage` | Optional | ⚠ None | Keep visible FAQs for users and AI. |

Use one `@graph` with stable `@id`s generated from Sanity `siteSettings`, so NAP lives in one place. Only breadcrumbs, video and site name/logo produce SERP features. Everything else feeds entity understanding **[strong]**.

---

## 6. AI search visibility

- **Google [strong]:**
  - *"There are no additional requirements to appear in AI Overviews or AI Mode"* ([AI features](https://developers.google.com/search/docs/appearance/ai-features)).
  - The [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) (2026-07-10) says AI features are built on core ranking. It recommends unique first-hand content, supporting images and video, and **Google Business Profile** for local businesses.
  - It says not to bother with llms.txt (*"Google Search itself doesn't use them"*), chunking content, rewriting for AI, or chasing inauthentic mentions.
  - Search Console has **Generative AI performance reports** (2026-06-03; impressions only; partial rollout) ([Google](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)).
- **BrightLocal [local AI study](https://www.brightlocal.com/research/local-ai-visibility-study/)** (Sep 2026, ~200k searches) **[moderate]**:
  - GBP (google.com) supplies 28.6% of citations and leads in AI Mode and AIO.
  - Business websites supply 42% and Yelp 9.5%. ChatGPT leans on Yelp and Bing.
  - Answers overlap only 20–33% between repeat runs.
  - Service-area businesses are mentioned slightly less often than storefronts (29.4% vs 33.6%).
- **Whitespark AI factors:** "best of" lists, a page per service, industry prominence, and unstructured citations. Ahrefs found branded mentions correlate most with AIO visibility (correlation, not cause; [Ahrefs](https://ahrefs.com/blog/branded-web-mentions-visibility-ai-search/)) **[moderate]**.
- **What to do:**
  - Keep entity facts identical everywhere.
  - Complete Yelp, BBB, Angi, Nextdoor, **Bing Places** and **Apple Business Connect**.
  - Earn "best electrician in Mesa" lists and local press.
  - Answer first, then detail.
  - Date cost guides. Freshness evidence is **[weak]**.

| Token | Purpose | Recommendation |
|---|---|---|
| `Googlebot` | Search, including AIO/AI Mode | Allow |
| `Google-Extended` | Gemini training and grounding; *"does not impact a site's inclusion in Google Search"* ([Google](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers)) | Allow. Blocking it doesn't remove you from AIO. |
| `OAI-SearchBot` / `GPTBot` | ChatGPT search / training ([OpenAI](https://developers.openai.com/api/docs/bots)) | Allow search; training is optional |
| `PerplexityBot` | Search index, not training ([Perplexity](https://docs.perplexity.ai/guides/bots)) | Allow |
| `Claude-SearchBot` / `ClaudeBot` | Search / training ([Anthropic](https://support.claude.com/en/articles/8896518)) | Allow search |

- **`robots.txt`:** `User-agent: *` / `Allow: /` plus the sitemap line. Add per-bot `Disallow` groups only if the owner opts out of training.
- **User-triggered fetchers** (ChatGPT-User, Perplexity-User) may ignore `robots.txt`.
- **Set Vercel Firewall's AI Bots managed rule to allow or log** ([CLI docs](https://vercel.com/docs/cli/firewall)).
- **llms.txt:** Google Search ignores it, though Chrome's Lighthouse checks for it as an optional agent-readiness item ([SEJ](https://www.searchenginejournal.com/googles-llms-txt-guidance-depends-on-which-product-you-ask/575431/)). It has no proven effect on visibility in other engines **[weak]**. It's optional and low priority.

---

## 7. Technical SEO: Astro + Vercel + Sanity

**URL shape: match Webflow (www, no trailing slash).**

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://www.thewireguyelectric.com',
  trailingSlash: 'never',
  build: { format: 'file' },            // Astro: pair 'file' with 'never'
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
});
```
```json
// vercel.json
{ "cleanUrls": true, "trailingSlash": false,
  "redirects": [{ "source": "/:path*", "has": [{ "type": "host", "value": "<project>\\.vercel\\.app" }],
                  "destination": "https://www.thewireguyelectric.com/:path*", "permanent": true }],
  "rewrites": [{ "source": "/sitemap.xml", "destination": "/sitemap-index.xml" }] }
```

- **Vercel is the source of truth for slashes.** Astro says slashes on prerendered pages *"are handled by the hosting platform"* ([config](https://docs.astro.build/en/reference/configuration-reference/#trailingslash)).
  - `trailingSlash:false` 308s `/x/` to `/x`, and `cleanUrls` 308s `/x.html` to `/x` ([vercel.json](https://vercel.com/docs/project-configuration/vercel-json)). 308 = 301 for Google.
  - Never pair Astro `'always'` with Vercel `true` (or the reverse): that caused redirect loops (fixed in adapter 7.3.1).
  - Verify with curl on a preview, since the adapter writes Build Output API config.
- **The `/sitemap.xml` rewrite** keeps the URL GSC already knows.
- **Canonicals:** absolute and self-referencing, built from `site` plus the route. Omit them on noindex pages. No free-text canonical field for editors.
- **Sitemap:** install [`@astrojs/sitemap`](https://docs.astro.build/en/guides/integrations-guide/sitemap/) (v3.7.4).
  - `filter` out noindex and utility pages.
  - Set `serialize` → `lastmod` from Sanity `_updatedAt` (real changes only).
  - Google ignores `changefreq` and `priority`. Use `chunks` per section.
  - Check that the URLs come out without a slash.
- **Preview noindex: verified.** Vercel *"adds an `X-Robots-Tag: noindex` … to every Preview Deployment automatically"*, and also to the previous production deployment. **The exception: a custom domain assigned to a non-production branch gets no header** ([Vercel KB](https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines), 2026-10-02). For a `staging.` domain:
  - add a host-scoped `X-Robots-Tag: noindex` header;
  - keep Deployment Protection on;
  - don't `Disallow` it in `robots.txt`, because Google must crawl a page to see its `noindex`.
- **Redirects:**
  1. **Astro `redirects`** become real 301s with the Vercel adapter. **Without an adapter, a static build emits meta-refresh HTML** ([Astro](https://docs.astro.build/en/guides/routing/#redirects)).
  2. **`vercel.json`** allows at most **2,048** rules, with wildcards ([limits](https://vercel.com/docs/routing/redirects/configuration-redirects)).
  3. **Bulk redirects** are Pro/Enterprise only (1,000 included), with no wildcards and runtime edits ([docs](https://vercel.com/docs/routing/redirects/bulk-redirects)). You only need them past about 2k rules.
  - **Sanity flow:** `redirect` docs → fetched at build → **flattened** (A→B→C becomes A→C) → validated (no loops or duplicates, and no source that equals a live page, because pages beat redirects) → emitted. Vercel documents the same pattern with `vercel.ts` ([KB](https://vercel.com/kb/guide/managing-redirects-from-your-cms-using-vercel-bulk-redirects)).
- **Sanity slugs and SEO fields:**
  - Validate slugs against `^[a-z0-9]+(?:-[a-z0-9]+)*$` and require them to be unique.
  - **Lock the slug after publish.** If it changes, a document action auto-creates a `redirect`.
  - Store a `legacyUrl` for parity checks.
  - The existing `seo` object is right. Add a warning when `noIndex` is set on a document that has a `legacyUrl`.
- **Images:**
  - **Serve CMS images from the Sanity CDN** via `@sanity/image-url` with `auto=format`, a 3–5 width `srcset`, correct `sizes`, integer `w`, and `fit=max`.
  - AVIF is generated **asynchronously**: the first requests get WebP, and `fm` can't force AVIF ([Sanity](https://www.sanity.io/docs/apis-and-sdks/image-urls)).
  - Take width and height from the asset ID (`image-<id>-1600x900-jpg`) to prevent CLS.
  - The **LCP hero** gets `loading="eager" fetchpriority="high"`. Everything below the fold is lazy.
  - `og:image` uses `fm=jpg&w=1200&h=630&fit=crop`.
  - Use `<Image priority>` from `astro:assets` for local assets ([docs](https://docs.astro.build/en/reference/modules/astro-assets/#priority)).
  - Don't also run Sanity images through Vercel Image Optimization: it double-processes them and is metered.
- **Core Web Vitals:** LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 at p75 field data, unchanged in 2026 ([web.dev](https://web.dev/articles/vitals)).
  - INP risk comes from third-party JS: chat, review embeds, tag managers, call tracking.
  - Low traffic means no URL-level CrUX data, so add RUM (Speed Insights or `web-vitals`).
  - CWV is a modest ranking signal; the bigger payoff is conversions **[moderate]**.
- **View transitions and prefetch:**
  - `<ClientRouter />` makes routing SPA-style and **enables `prefetchAll`** ([Astro](https://docs.astro.build/en/guides/prefetch/)). Analytics, call-number swapping and form scripts must then re-initialize on every navigation, and soft navigations pile INP/CLS onto the landing URL.
  - Prefer CSS `@view-transition { navigation: auto; }` or nothing. Prefetch on hover/tap only.
- **Rebuild on publish:**
  - A Sanity [GROQ webhook](https://www.sanity.io/docs/content-lake/webhooks) (published docs only: `!(_id in path("drafts.**"))`; relevant `_type`s; create/update/delete) calls a Vercel [Deploy Hook](https://vercel.com/docs/deploy-hooks).
  - Build with `useCdn:false` and `perspective:'published'`.
  - **Prefer full static plus a deploy hook over ISR.** ISR covers only on-demand routes ([adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/#isr)) and adds invalidation complexity for no SEO gain.

---

## 8. Conversion elements that also help SEO

- **Click-to-call:**
  - Use real `tel:` links in the header and hero.
  - A ~56px **sticky mobile bar** (Call | Estimate) is fine. Google favours *"banners that take up only a small fraction of the screen"* over interstitials ([doc](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials)).
  - No entry pop-ups.
  - Call tracking: keep the real number in the HTML and schema, and swap it with JS for visitors only.
- **Trust badges** as static HTML:
  - ROC # with a lookup link;
  - BBB;
  - licensed, bonded, insured;
  - since 2017, family-owned;
  - Google rating as linked text.
- **Reviews:**
  - Render first-party testimonials from Sanity (collected with consent) as static HTML.
  - **Don't cache Google reviews through the Places API.** Its terms allow caching only place IDs and require attribution ([policies](https://developers.google.com/maps/documentation/places/web-service/policies)).
  - Any third-party widget is lazy-loaded behind a facade, below the fold.
  - No rating markup.
- **Forms:**
  - 3–4 fields: name, `type="tel" autocomplete="tel"`, ZIP, and an issue select.
  - Show a callback promise.
  - Honeypot plus Turnstile or BotID rather than a visible CAPTCHA, with server-side validation.
  - A noindex thank-you page with a GA4 `generate_lead` event.
  - Hours shown next to the CTA, matching GBP.

---

## Top 25 actions, ranked by impact

1. Keep every indexed URL identical (www, no slash). 301 any change in one hop, and port Webflow's 301 list.
2. Run the parity diff before DNS flips (title/H1/meta/canonical/body/internal links/schema).
3. Set Astro `trailingSlash:'never'` + `build.format:'file'` and Vercel `cleanUrls` + `trailingSlash:false`, then verify with curl.
4. Add the CI noindex/robots guard, and a host-scoped noindex for any custom staging domain.
5. Generate route-based absolute canonicals, never from `Astro.url`.
6. Keep the GBP link on the homepage with identical NAP. Resolve the Scottsdale address and the sister-brand phone numbers.
7. Deepen all 21 service pages (Whitespark's #1 organic factor). Add Generator and Surge pages if offered.
8. GBP hygiene: category, predefined services, accurate hours, photos.
9. Steady review flow, with personal replies to every review.
10. ROC # prominent in the homepage body. Author and reviewer bios.
11. Launch with parity, then 20–30 gated service×city pages over weeks 4–12.
12. Dated, real-data cost guides (panels, EV, generators, rewiring, recessed).
13. Hub-and-spoke internal linking from Sanity references, plus breadcrumbs.
14. JSON-LD `@graph`. Remove the self-serving `aggregateRating`.
15. `@astrojs/sitemap` with honest `lastmod`, `/sitemap.xml` kept working, junk removed, and resubmission to GSC and Bing.
16. 90-day monitoring (GSC indexing and crawl stats, Vercel 404 logs).
17. Download all Webflow assets. Sanity CDN images with width/height and a priority LCP image.
18. Near-zero third-party JS. RUM for CWV.
19. Sticky call bar, a 4-field form, and conversion tracking.
20. Directory and citation coverage (Yelp, BBB, Angi, Nextdoor, Bing Places, Apple Business Connect), plus "best of" lists and local press.
21. AI crawler policy: allow the search bots, and set Vercel's AI Bots rule to allow.
22. Slug lock, auto-redirect on slug change, chain flattening, and a deploy hook.
23. Launch outside core-update windows and summer peak, with TTL lowered a week ahead.
24. Merge the breaker and flicker blog clusters 6+ weeks after launch.
25. Job walk-through videos on dedicated pages with `VideoObject`.

## Myths / don't bother

- **FAQPage schema for rich results:** the feature is gone (May 2026). Keep the visible FAQs.
- **llms.txt, chunking for AI, "AI schema", AI rewrites:** Google says it doesn't use them.
- **410 for "faster removal":** all 4xx except 429 are treated the same.
- **Sitemap `changefreq` and `priority`:** ignored by Google.
- **Self-serving review stars or rating markup on widgets:** ineligible and risky.
- **Keyword-stuffed GBP name:** it ranks, but it breaks the guidelines and invites suspension.
- **231 city×service pages, city microsites, or exact-match domains:** doorway or scaled-content abuse.
- **Blocking Google-Extended to stay out of AIO:** it doesn't control AIO.
- **Buying mentions or list spots:** Google says inauthentic mentions don't help.
- **Title-length or word-count targets:** Whitespark calls title length a myth, and Google says there is no ideal page length.
- **"Astro alone will boost rankings":** speed is a modest signal. Parity protects rankings; content, GBP and reviews grow them.
- **Changing the GBP landing page, URLs and content all at launch:** change one variable at a time.
