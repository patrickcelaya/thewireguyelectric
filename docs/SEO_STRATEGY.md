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
  - `FAQPage` where FAQs are visible.
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

## After launch: the growth roadmap

Start 4–6 weeks after launch, once Search Console shows the migration has settled. Change one variable at a time.

### 1. Deepen the 21 service pages (weeks 4–8)

Each service page becomes the hub for its topic. For each page:

- **Who it's for, and when to call.** Include safety triggers: burning smell, hot panel, tripping under load.
- **The process,** in real steps (permit, utility coordination with SRP or APS, inspection).
- **An honest price range** with what drives it. Use the `priceRange` field, and date it.
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
