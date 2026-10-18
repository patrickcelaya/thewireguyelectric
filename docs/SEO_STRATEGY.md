# SEO strategy: The Wire Guy Electric

Distilled from [`research/seo-research-2026-10.md`](research/seo-research-2026-10.md), which has about 50 cited sources, and the live-site audit in [`MIGRATION_PLAN.md`](MIGRATION_PLAN.md).

## The honest version

A faster platform alone won't move rankings much. Page speed is a modest signal. What protects rankings is **parity at launch**. What grows them is:

1. **One genuinely useful page per service.** This is Whitespark's #1 local-organic factor.
2. **Real local proof:** jobs, photos, reviews and local specifics. Cloned city pages don't count.
3. **Google Business Profile strength:** category, reviews, hours, photos. GBP is also the top cited source in Google's AI answers for local queries.
4. **Internal links that tie it together.**

The new stack makes all four cheap to do well and consistently.

## Already built into the new site

- Self-referencing canonicals everywhere (the live site has none).
- One JSON-LD `@graph` per page, all tied to a single `Electrician` entity (`#business`) built from the NAP in Site Settings:
  - `WebSite`, `WebPage` and `BreadcrumbList`;
  - `Service` on service and city pages;
  - `BlogPosting` on posts;
  - `JobPosting` on careers;
  - `FAQPage` where FAQs are visible, each question marked up on one page only: shared questions on /faq, a city's or post's own questions on that page.
- Visible breadcrumbs, related services and posts, other service areas, and previous/next post. Internal links are generated from content relationships, not hand-maintained.
- The ROC license number shown prominently near the top of the homepage and linked to the state lookup. Arizona ROC advertising rules expect it on the homepage, not just the footer.
- A sticky mobile Call / Free Estimate bar, tracked `tel:` clicks (`phone_call_click`), and form leads (`generate_lead`) in GA4.
- No layout shift from images, lazy-loaded below-the-fold media, YouTube click-to-play facades, and almost no third-party JS.
- Studio guardrails:
  - required alt text;
  - title and description length hints;
  - a slug-change → redirect warning;
  - a `noIndex` switch documented as "never on a page that ranks";
  - Redirect documents.

## Shipped with the launch (October 2026)

The owner asked for SEO work, and for every trace of AI-written filler to go, before launch rather than after. Each change below was researched, then checked by a second reviewer; only accepted or amended items shipped. The homepage title and H1, and the titles and H1s of the Tier 1 posts, did not change.

| Area | What changed | Where it's recorded |
|---|---|---|
| Filler removed | 649 of the 655 verified edits: 77 on the homepage, the page-builder pages and shared interface text; 83 on service pages; 59 on city pages; 430 on posts. Six were held back: Steven Taylor's quote, which may only lose words and would lose its meaning (D2); three written for the unpublished hanging-lights draft (D10); two that repeated template edits already made. The published hanging-lights copy, which only started shipping after the review (D10), lost its stock lines in 16 further edits written to the review's own rules. Gone: stock benefit lines, "not X but Y" turns, signposts, slogan closers, emoji. Kept: every fact, number, link, safety warning and call to action. Tier 1 posts lost filler sentences and a few lines were tightened (61 edits); no heading, fact or number changed, and their links only gained the verified internal links. City bodies now carry each city's own utility and permit facts instead of a template with the name swapped | `migration/content-edits/`, applied by `scripts/migrate/content/content-edits.mjs`; every replaced live string has a reason in `_omissions.json` |
| Copy decisions | Plain homepage headings and CTA band (D1); unattributed quote snippets removed from the commercial hero (D3); no emergency wording (D4); estimate CTAs → /estimate, typos and run-on words fixed, the Ahwatukee body split into paragraphs (D5); four factual fixes: the car's onboard charger, line voltage, Mountain America Stadium, the NFPA link (D6); hanging lights ships its published copy (D10), without its stock lines | `migration/content-edits/README.md` |
| Titles, metas and H1s: wave 1 | 60 approved changes on 37 pages. Service titles and H1s use the words people search ("panel upgrade", "EV charger installation"); post and category metas are rewritten where their click rate trailed similar pages; five cities (Gilbert, Tempe, Queen Creek, Apache Junction, Fountain Hills) get "Electrician in {City}, AZ \| Free Estimates \| The Wire Guy" and a meta naming their own neighbourhoods and services. The Google review count reads 560+ (the Mesa profile showed 567 on 2026-10-17) | `migration/seo-intentional-changes.json`: the parity gate accepts exactly these values and fails on any other change |
| Structured data | One connected graph per page. Mesa (missing before) and the 10 service areas are City entities with their Wikipedia and Wikidata pages. The business carries its ROC credential, services, founder, map URL, the Google profile pins as geo, and 7 verified profiles as sameAs; the Scottsdale office has its own geo and profiles (its hours wait for the owner's answer on staffing). Service pages have no prices or offers (owner rule). City pages list their services; posts point to their hub service; /careers has an HTML job description, an identifier and the 4 years of experience it asks for. Share images are photos the page shows, the crew portrait where a page has none, and image files are named for what they show. `pnpm seo:schema` in CI fails on a regression | `web/src/lib/schema.ts`, `web/src/data/places.json`, `scripts/seo/check-structured-data.mjs` |
| Internal links | Related articles are picked by the service a post supports, not by date, so every post now appears somewhere. Hub links read the way people search ("See our electrical troubleshooting service"). Service pages show up to five guides. 124 verified in-body links with no change to the words (71 post → service, 28 city → service, 15 post → post, 10 service → post), and one link retargeted to /services/panels. Two closing links the review wanted on a service page stay on /estimate (D5) | `web/src/lib/cms.ts`, the content pipeline |
| Citations on the site | sameAs for the business (Facebook, Instagram, Yelp, BBB, the Mesa Google profile, LinkedIn, Nextdoor) and for the Scottsdale office (its Google profile and Yelp). The ROC lookup links roc.az.gov. The off-site fixes are the owner's list in [`LAUNCH_RUNBOOK.md`](LAUNCH_RUNBOOK.md#off-site-fixes-for-the-owner) | Site settings, through the content pipeline |
| Technical | `X-Robots-Tag: noindex` on every host but www, so the `.vercel.app` aliases stay out of the index; the live site's clickjacking headers; `/x/index.html` → `/x`; `/favicon.ico`. Pages and posts carry a modified date only when their content changed materially: 5% of the words replaced, a heading added or removed, or the FAQs changed (66 documents dated 2026-10-17, 24 of them posts; a reworded heading alone, such as a retitled closing call to action, dates nothing, so ten posts with 0.6–3.5% of their words changed keep their dates; the Tier 1 hot-weather post keeps its date. Two Tier 1 posts, the GFCI outlets post and the afternoon flicker post, are dated because their quick answer box now shows the approved meta in place of the old one) | `web/src/config/one-hop-redirects.mjs`, `scripts/migrate/content-dates.mjs` |

## Deferred, and when

| Item | When | Why |
|---|---|---|
| **Wave-2 city titles and metas:** Chandler, Scottsdale, Ahwatukee, San Tan Valley, Phoenix (approved, not deployed) | Decide on **Thursday 2026-11-19**, 4 weeks after the 2026-10-22 launch. Ship that week if wave 1's click rate on its core searches is not worse than wave 2's at similar positions | A control group: if the new pattern hurts, only half the cities are affected and the cause is clear. Ahwatukee, the best-converting city, is the natural control. The values wait in the allowlist as "approved change not deployed yet" warnings; their metas take the review count current on the day they ship |
| **The nine city closing links to the homepage** | Shipped at launch, to /estimate (D5) | The link review had deferred them to protect the homepage's inbound links. If the homepage slips in the first weeks, check these first |
| **Image sitemap** (ST-16) | Not doing | Images live on cdn.sanity.io, and Google accepts cross-domain image sitemap entries only when both domains are verified in Search Console; this one can't be. Google finds the images in the pages. Revisit only if images move to the site's own host |
| **Post quick-answer boxes** | From 2026-12-03 (6 weeks after launch) | A post without a quick answer shows its excerpt in the quick-answer box; several are filler. Twelve already show their approved meta there (the excerpt was set to it at launch, launch review CQ-5). Write a 40–60 word `quickAnswer` per post from its own facts; the metas stay |
| **Rewrites and merges:** `level-1-vs-level-2-ev-chargers` (an SEO-tool article with price tables that disagree), `common-electrical-issues-in-scottsdale-homes` (thin once the filler is out), the 6 breaker-tripping and 3 flickering-lights posts | From 2026-12-03, guided by Search Console | Rewriting many posts at launch would blur the migration's signal, and consolidation needs post-launch data |
| **Links to competitors' blogs** (7-signs' [1]–[9] markers, can-hot-weather's sentence links) | With those rewrites | A link-policy decision, not a copy edit |
| **Category page descriptions** | With the growth roadmap | Both category pages show their meta as the visible lede; an owner-approved description fixes both |
| **`llms.txt`** | Not doing | The live file is wrong (Phoenix, emergency service, links that 404) and Google ignores it. The URL 404s after launch |
| **New parity baseline** | After wave 2 ships | Re-crawl production (`pnpm seo:baseline`) so the gate protects the new values |
| **San Tan Valley permit note** | January 2027 | Pinal County's agreement for the new town runs through 2026-12-31 |
| **Dated wording:** "over 9 years" (business FAQ), "2026" in the hot tub meta | January 2027, or when re-priced | Goes stale |

## What Search Console says (last 16 months, via OpenSEO)

`migration/seo-equity/gsc-pages-16mo.tsv`

- **The pages that pay the bills today** are informational posts and the homepage:
  - `/blog-posts/can-hot-weather-cause-your-circuit-breaker-to-trip`: 1,348 clicks, average position 5.5
  - `/` (homepage): 1,316 clicks
  - `/blog-posts/diy-electrical-work-in-arizona`: 942 clicks
  - `/blog-posts/permit-for-electrical-work`: 279 clicks

  These are Tier 1. Their URLs, titles and H1s don't change at launch; their bodies lost filler (61 edits), and the hot-weather post's one-paragraph citation now links only "nuisance tripping".
- **City pages have huge demand and almost no clicks.** Each has 15k–90k impressions, but CTR is only 0.1–0.4%:

  | City page | Impressions | Avg position |
  |---|---|---|
  | Scottsdale | 90k | 15 |
  | Gilbert | 86k | 7.7 |
  | Chandler | 84k | 12 |
  | Tempe | 67k | 10.7 |
  | Phoenix | 71k | 38 |

  This is the single biggest growth lever. Give each city page real local proof (jobs, reviews, utility and permit specifics). The click-through titles and descriptions ship in two waves, measured against each other: five cities at launch, five on 2026-11-19 (see [Deferred, and when](#deferred-and-when)).
- **Service pages are weak:** most rank 18–50, and EV charger installation sits at position 33 with 38k impressions. They're thin today. Deepening them (step 1 below) is the second lever.
- **Brand and navigation pages** (`/about-us`, `/our-team`, `/faq`) rank around position 4 with 55k–64k impressions but almost no clicks. These are mostly brand-query sitelinks, so they're less of a lever.

## After launch: the growth roadmap

Start 4–6 weeks after launch, once Search Console shows the migration has settled. Change one variable at a time.

### 1. Deepen the 21 service pages (weeks 4–8)

Each service page becomes the hub for its topic. For each page:

- **Who it's for, and when to call.** Include safety triggers: burning smell, hot panel, tripping under load.
- **The process,** in real steps (permit, utility coordination with SRP or APS, inspection).
- **What drives the price**, without a price: the owner's rule (October 2026) keeps prices off service pages. Prices live in the cost guides and on `/faq`, and the service page links to its cost guide.
- **2–4 real jobs,** using the `project` documents, and relevant reviews.
- **3–6 FAQs** taken from what customers actually ask.
- **Links:** to its cost guide, its problem posts, and the cities where it's in demand.

Add **Generator** and **Surge protection** service pages if those services are offered. Blog posts already target both, but there's no service page for them to link to.

### 2. Hubs and clusters around existing URLs

Keep every existing URL. Link each post to its hub service page early, with a descriptive anchor.

| Hub | Service page(s) | Existing posts to cluster |
|---|---|---|
| Panels and upgrades | `/services/panels`, `/services/electrical-upgrades` | 7 signs, do-you-need, cost, hot-to-touch, FPE/Zinsco, cutting corners |
| EV charging | `/services/ev-charger-installation` | installing, L1 vs L2, hardwired vs plug-in, Tesla vs ChargePoint, dryer outlet |
| Lighting | recessed, LED, custom, fixtures | recessed in Phoenix, landscape cost, ceiling fan cost |
| Troubleshooting | `/services/electrical-troubleshooting` | 6 breaker posts, 3 flicker posts, outlets, half the house out |
| Arizona-specific | (cross-hub) | heat, monsoon, AC disconnect, mini-split, pool pump, swamp-cooler conversion |

**Consolidate the cannibalizing clusters** 6+ weeks after launch, guided by Search Console data. There are 6 posts on breaker tripping and 3 on flickering lights. Merge the weaker posts into the strongest one and 301 the rest.

### 3. Cost guides

Cost guides are the most linkable and highest-converting content type for a contractor. Each one gets:

- ranges by scenario (e.g. 100A→200A swap, meter-base replacement, 400A service for EV + solar);
- cost drivers, including permit and utility steps;
- 2–3 dated real jobs;
- "Updated <month year>" and "Reviewed by <licensed electrician>".

Re-price them twice a year. Start with the panel upgrade guide (it exists; deepen it), then EV charger, standby generator, recessed lighting and whole-house rewire.

### 4. Service × city pages (weeks 4–12, gated)

The model exists: `serviceLocation`, at `/locations/<city>/<service>`. Its route isn't built yet, on purpose. Google's doorway and scaled-content policies target city-swap pages. Use the swap test: if you can replace "Gilbert" with "Chandler" and the page is still true, don't publish it.

- **Publish gate:** a page is built only if it has at least 1 real project in that city, at least 2 reviews from that city, the utility set, and at least 250 words of city-specific copy.
- **Pace:** 2–4 pages a week, starting with the top 4–5 services in the 5–6 cities with the most leads, about 20–30 pages. Expand only where Search Console shows "service + city" impressions. **Never generate all 231 combinations.**
- **Mesa:** decide whether to keep the homepage as the Mesa page (current setup, with `/locations/mesa` 301 → `/`) or build a dedicated Mesa page. Don't change this during the migration.

### 5. Projects (job showcase)

Every completed job with photos is potential content: a `project` with the city, neighborhood, services, problem → fix, photos, and price band. Projects feed service pages, city pages and service × city pages. This is the "first-hand experience" Google's guidance keeps pointing to, and competitors can't copy it.

### 6. E-E-A-T and authorship

- Real author and reviewer bios (`teamMember`) with license, years in the trade and photo. Add a byline and "Reviewed by" to posts.
- Only real job photos. No stock photos on service or city pages.
- Honest `updatedAt`. Bump it only when content materially changes.

## Off-site: where much of local ranking happens

- **Google Business Profile:**
  - Accurate primary category (Electrician) and additional categories.
  - All predefined services checked.
  - Hours that match the site. "Open at time of search" is now a top-5 local-pack factor.
  - Weekly photos and posts.
  - GBP website link stays on the homepage.
- **Reviews:** a steady flow (74% of consumers want reviews from the last 3 months), with a personal reply to every review. Never incentivize reviews.
- **NAP consistency and citations:** Yelp, BBB, Angi, Nextdoor, **Bing Places** and **Apple Business Connect**. ChatGPT leans on Bing and Yelp.
- **Sister brands:** cross-link where it helps the customer (e.g. "breaker trips when the AC runs" → The Cooling Guy). Each brand keeps its own phone number and GBP.
- **Local mentions:** "best electrician in Mesa" lists, local press, sponsorships, suppliers and builder partners.

## AI search (AI Overviews, AI Mode, ChatGPT, Perplexity)

Google says no special markup or `llms.txt` is needed: AI features run on core ranking plus GBP. What helps everywhere:

- consistent entity facts;
- answer-first structure (the question, then the answer in 1–2 sentences, then detail);
- first-hand detail;
- dated pricing;
- presence on the sources AI engines cite (GBP, Yelp, BBB, Bing).

`robots.txt` allows all crawlers, including the AI search bots. If Vercel Firewall's "AI Bots" managed rule is enabled, set it to log or allow, not block.

## Measurement

- **Search Console:**
  - Performance by page group (services, cities, posts, cost guides).
  - Page indexing.
  - The new Generative AI performance report.
- **GA4:** `generate_lead` and `phone_call_click` by landing page. That's the metric that matters.
- **Rank tracking** for the core "service + city" terms, with the local pack tracked separately (a geo-grid tool).
- **Vercel Speed Insights** for real-user Core Web Vitals. The site has too little traffic for CrUX data at URL level.

## Don't bother

- FAQ markup for rich results: Google stopped showing them in May 2026. Keep the visible FAQs for people and AI.
- Rating markup on your own business: it's ineligible for stars, and markup for ratings that aren't visible can draw a manual action.
- `llms.txt`, "AI schema", or rewriting for chatbots.
- Sitemap `priority` and `changefreq`: Google ignores them.
- Keyword-stuffed GBP names, city microsites, or mass-generated city pages.
- Title-length or word-count targets.
