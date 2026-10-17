# Content data: fixes and enrichment

The data files in this folder are applied by `scripts/migrate/content/fixes.mjs`. That is the first content module `scripts/migrate/webflow-to-sanity.mjs` runs, before `reviews`, `local-facts` and `page-sections`.

| File | What it sets |
|---|---|
| `city-relations.json` | `location.name`, `cardBlurb`, `featuredServices` and `nearbyLocations` for the 10 cities; `siteSettings.homeCity.cardBlurb` for Mesa |
| `faqs.json` | `question`, `answer`, `topic`, `order` and `services` on the 28 `faq` documents, copied verbatim from the visible `/faq` page |
| `service-relations.json` | `priceRange` (3 services), `relatedServices` (21) and `relatedPosts` (21) |
| `post-services.json` | `relatedServices` on all 53 posts |
| `site-settings.json` | `heroQuotes`, `valueProps`, `capabilities`, `ctaBand`, `availabilityNote`, `googleBusinessProfileUrl`, `reviewSummary.reviewsUrl`, `rocLicenseUrl`, `addresses[].googleMapsUrl`, `addresses[].mapLinkText` |

The data files use slugs, not document IDs. The module turns each slug into a reference. The migration stops with an error naming the file and entry if any of these happens:

- a slug doesn't match a document;
- a list repeats a slug, or a city lists itself as nearby;
- a FAQ topic isn't in `FAQ_TOPICS` or an icon isn't an `ICON_OPTIONS` token (both lists are read from `studio/schemaTypes/shared/fields.ts`);
- a price has no published source;
- a converted FAQ answer's text or number of links differs from the HTML;
- **any title, H1, meta description or slug changes.** The module snapshots those fields before it runs and compares afterwards.

Every value comes from the live site as captured on 2026-10-13 (the discovery inventory), from documents already in the export, or from Search Console data. Each entry in the data files names its source.

## 1. City names (`location.name`)

`name` used to hold the full H1 ("Licensed Electrician in Gilbert, Arizona"), and that text showed up in breadcrumbs, `areaServed` and `serviceAreas`. It is now the bare city, taken from `cityNameForSeo` ("Gilbert, AZ" → "Gilbert"). The module checks that the data file agrees with `cityNameForSeo`.

Titles, H1s and meta descriptions don't change:
- titles come from `cityNameForSeo` or `seo.title`;
- H1s come from `heading`;
- meta descriptions come from `seo.description`.

The module stops if a city is missing `heading` or `cityNameForSeo`, because the old `name` was only a fallback for those two fields.

## 2. FAQs (`faqs.json`)

**Source of truth.** The visible `/faq` accordion copy, taken from the inventory's `faq.json` → `faqGroups`. The 28 `faq` documents had been built from the old FAQPage JSON-LD, and 26 of their answers were an older version. The old answers contradicted the visible page:
- hourly rate "$75 and $150" (visible: "$125 and $375");
- panel "$1,800 and $3,500" (visible: "$5,200 and $6,500");
- EV charger "$500 and $1,500" (visible: "$750 and $3,500");
- "over 7 years" (visible: "over 9 years").

`faqs.json` was generated from the inventory, so the question and answer HTML are character-for-character the visible copy, curly apostrophes included.

**Two edits by the owner's standing rules** (each listed in `migration/page-content/_omissions.json` with its reason): "What cities do you service?" drops "over 11 different" (no area count), and "Do you work on weekends or offer emergency service?" drops the "For true emergencies…" sentence. Every other word and link is the live copy. Prices in answers stay: the owner keeps prices where the business already published them.

**Matching.** Each visible question is matched to its existing document by question text, ignoring apostrophe style. Three questions were worded differently in the old JSON-LD; `legacyQuestion` records the old wording so the match still works. All 28 matched, so no document was created and every ID stays the same. A visible question with no document would get the ID `idFor('faq:visible:<question>')`.

**Answers.** Answers are converted with `ctx.toPortableText`, so their links keep working: 54 internal links, 2 `tel:` links and 4 external links (AZ ROC). Internal links are relative with no trailing slash. They are already written that way in the live copy, and `normalizeHref` enforces it. Three answers opened internal links in a new tab (`target="_blank"`): aluminum wiring, EV DIY and adding outlets. Those links now open in the same tab. External links keep their original attributes.

**Topics.** Each visible `/faq` group gets its own topic, so a FAQ section that pulls by `topic` (ordered by `order`) rebuilds that group exactly as shown today.

| Visible group | Topic | `order` | Also shown on |
|---|---|---|---|
| The most common questions | General | 0–2 | all 21 service pages (the 3 generic FAQs) |
| Customers frequently ask | Company | 3–8 | `/our-team` (the same 6 questions) |
| Pricing And Cost Questions | Pricing | 9–12 | |
| Panel and Electrical System Questions | Panels | 13–16 | |
| Safety and Code Questions | Safety | 17–20 | |
| Service-Specific Questions | Services | 21–24 | |
| Hiring and Trust Questions | Hiring | 25–27 | |

Topics follow the visible groups because a FAQ document can hold only one topic. The task brief proposed subject topics ("EV chargers", "Lighting", "Troubleshooting", "Permits"), but that would split the visible groups: "Why does my breaker keep tripping?" sits under Safety on the page, and "Do I need a permit…" sits under Panels. Using the group topics keeps `/faq` intact. The schema added General, Services and Hiring for this reason (see `docs/CONTENT_MODEL.md`), and the inventory's page-builder mapping uses the same values. The subject link to services lives in `services` instead.

The `/our-team` FAQs and the 3 generic FAQs on service pages are the same documents with identical visible copy. `shownOn` in `faqs.json` records where each question appears.

**`services`** is set only where the answer is clearly about specific services. General questions get none.

| Question | Services |
|---|---|
| Lighting design help | custom-lighting, recessed-lights-installation |
| Panel cost | panels |
| Recessed cost | recessed-lights-installation |
| EV cost | ev-charger-installation |
| Signs the panel needs upgrading | panels |
| 100 vs 200 amp | panels |
| Whole-house surge protector | panels (it is installed at the panel; this follows the hub map until a surge page exists) |
| Inspection frequency | electrical-safety-inspections |
| Signs of bad wiring | electrical-troubleshooting |
| Aluminum wiring | electrical-remodels, electrical-safety-inspections |
| Breaker tripping | electrical-troubleshooting |
| EV DIY | ev-charger-installation |
| Recessed type | recessed-lights-installation |
| Recessed install time | recessed-lights-installation |

"Can you add outlets or circuits?" gets no service. It is residential work, and the only outlet and circuit pages (`outlets-and-switches`, `dedicated-circuits`) are commercial.

**Note for templates:** `web/src/pages/[page].astro` currently builds the `/faq` FAQPage node from `getFaqs()`, which returns every faq document. That is now correct, because the documents match the visible page. The redesign should still build it from `collectPageFaqs(page)`, as `CONTENT_MODEL.md` §1.7 says.

## 3. Service prices (`priceRange`)

A price is set only where the live site publishes a figure for that exact service. `asOf` is 2026-10-13, the date the copy was captured. `note` says what the range covers and where it is published.

| Service | Range | Published on |
|---|---|---|
| panels | $5,200–$6,500 (standard 200-amp like-for-like). The note adds the published full-service replacement range, $6,400–$8,750 | `/faq` and the `/services/panels` body. The same figures appear in the electrical-remodels and new-construction-wiring bodies and in the panel cost post |
| recessed-lights-installation | $1,050–$1,750 (six LED cans, existing room) | `/faq` |
| ev-charger-installation | $750–$3,500 (Level 2, home) | `/faq` |

Not priced:
- **`electrical-upgrades`:** it is the commercial panel, feeder and service page, and the published figures are for a home's 200-amp panel.
- **Surge protection:** `/faq` publishes $300–$600, but there is no surge service document.
- **Hourly rate:** `/faq` quotes it as other electricians' rates.

**Conflicting figures elsewhere on the live site.** These are left as they are and flagged for the owner:
- EV: the `/services/ev-charger-installation` body says "Tesla Wall Connector … $650 to $1,800" and "NEMA 14-50 … $450 to $1,200". Both start below the `/faq` $750. The older `level-1-vs-level-2` post says $600–$2,500, plus a "200 A panel upgrade" at "$1,800 to $2,500".
- Recessed: `/blog-posts/recessed-lighting-installation-phoenix` says 6 lights on a finished ceiling cost "$1,400 and $2,200". `/faq` says $1,050–$1,750.
- Surge: `/blog-posts/whole-house-surge-protector-guide-arizona` says $400–$800. `/faq` says $300–$600.

## 4. Related services and posts (`service-relations.json`, `post-services.json`)

### Service → related services (3–4 each)

- **Commercial services** use the "Related Services" list from their own live body, in the same order. `commercial-service` has no such section, so it uses the first four commercial services its body links to.
- **Residential services** use, in order:
  1. services the body already links to;
  2. hub siblings from `docs/SEO_STRATEGY.md` §2 and seo-requirements §4. Hubs: Lighting = recessed, LED, custom, fixtures; Panels = panels + electrical-upgrades; Remodels = remodels + new construction;
  3. same-category services that fit the topic.

  Two residential services also link their commercial counterpart, as the hub map asks: `panels` → `electrical-upgrades` and `electrical-troubleshooting` → `commercial-electrical-troubleshooting`.

### Service → related posts (0–5 each)

Posts are drawn, in order of preference, from:
1. the service's own live "Related Reading" list;
2. posts whose body links to the service;
3. the hub map's posts for that hub;
4. Search Console pointers (gsc-queries §4.3). Examples: the Tesla-vs-ChargePoint post ranks 2–5 and can pass authority to the EV page; the panel page gets the "replace list" posts (FPE/Zinsco, hot to the touch, 7 signs).

Two posts in live "Related Reading" lists aren't live documents and are skipped: `the-benefits-and-efficiency-of-lighting` and `upgrading-your-electrical-panel`.

Every post is written for homeowners, so commercial services get posts only where:
- the service's own description names the post's subject:
  - `commercial-electrical-troubleshooting` ("repeat trips … overheating terminations") → the breaker and hot-panel posts;
  - `outlets-and-switches` ("GFCI protection") → the GFCI posts;
- the hub map places the service in the hub:
  - `electrical-upgrades` → the panel cost, cutting-corners and hot-panel posts (seo-requirements §4: "+ `/services/electrical-upgrades` for commercial");
  - `led-lights` → the recessed-lighting and landscape-lighting posts. `docs/SEO_STRATEGY.md` §2 puts LED in the Lighting hub, and both posts make the LED case this page sells (LED vs. halogen/incandescent energy use and lifespan, LED-only fixtures, exterior LED). The ceiling-fan post, the third Lighting post, has nothing on LED and is left out;
- a post links the service: `dedicated-circuits` ← the kitchen-remodel post. The mini-split post was added because dedicated-circuits names HVAC compressor loads.

Every service page shows at least three guides (QA, 2026-10-17: an empty or thin "Helpful guides" block leaves a hub page without its spokes). Services with no post on their own subject take the closest posts by topic, each sharing something the service page itself says:
- the lighting services take Lighting posts: `hanging-lights` → recessed lighting, flickering lights (its page: "buzzing or flicker at low levels") and the ceiling-fan post (rated support); `storefront-lights` → the landscape and outdoor lighting posts and the monsoon post ("sideways rain through monsoon season"); `ballast-replacement-fluorescent-lighting` → the two flickering-light posts ("Flickering tubes") and recessed lighting (the LED case); `led-lights` adds flickering lights;
- `commercial-service` → the hot-panel post ("Hot spots and loose connections at panels"), the breaker post ("Breakers tripping repeatedly") and the safety tips;
- `tenant-improvements` → cutting corners on panel upgrades ("Panels and subpanels", "Inspection-ready work"), the hot-panel post and the safety tips;
- `emergency-exit-lights` → the safety tips, the heat post ("Arizona heat shortens it") and the pre-sale inspection post;
- `outlets-and-switches` and `dedicated-circuits` add the breaker post (overloaded circuits, "nuisance tripping").

Several residential services also list fewer than 5 posts, because their hub has fewer.

### Post → related services (all 53)

The first service is the primary hub service from the hub map (seo-requirements §4, which spells out the `docs/SEO_STRATEGY.md` §2 table post by post). Further services are added only when:
- the hub map names them: casita → new-construction-wiring;
- the post body already links them:
  - `dryer-outlet-for-ev` → panels;
  - `generator-interlock-in-arizona` → troubleshooting;
  - `bathroom-or-garage-outlets-not-working-heres-how-to-fix` → panels;
  - `ceiling-fan-installation-cost-arizona` → recessed;
  - `landscape-lighting-installation-cost-phoenix` → custom-lighting;
  - `pool-pump-electrical-requirements-arizona` → panels;
  - `kitchen-remodel-electrical-circuits-arizona` → panels, dedicated-circuits;
  - `cost-to-rewire-house-arizona` → inspections, panels;
- a service page's live body (its "Related Reading" list or an in-text link) links the post:
  - `federal-pacific-zinsco` ← inspections;
  - `why-your-lights-flicker` ← fixture-replacements;
  - `electrical-panel-hot-to-the-touch-arizona` ← troubleshooting;
  - `why-does-my-breaker-keep-tripping` ← panels;
  - `smart-thermostat-c-wire-arizona` ← new-construction-wiring;
  - `phoenix-monsoon-electrical-damage-…` ← exterior-electrical;
  - `aluminum-wiring-older-phoenix-homes` ← remodels.

One exception: `can-hot-weather-cause-your-circuit-breaker-to-trip` → panels. Neither page links the other, but the post is about the panel itself. It names the panel about ten times: a hot panel in a garage or in direct sun, conductors loosening in the panel, "The electrical panel feels hot to the touch" as a reason to call. It sits with the hot-to-the-touch post, which is in the panel hub.

Surge and generator posts sit under panels, as the hub map says ("until dedicated pages exist"). `/faq` lists generator installs among the services the company doesn't offer; the generator posts are about interlocks and standby units, which are wired at the panel.

`common-electrical-issues-in-scottsdale-homes` hubs on `/locations/scottsdale`, which can't be a `relatedServices` target, so its service is electrical-troubleshooting.

## 5. Cities (`city-relations.json`)

**featuredServices (6–8 per city).** These are ordered by the "Services in {City}" demand in gsc-queries §5: the per-city card order, the service × city demand table, and `gsc-data/service-city-pairs.json`. Each search intent is mapped to the service page that covers it:

| Search intent | Service page |
|---|---|
| repair (incl. GFCI/outlet repair) | electrical-troubleshooting |
| commercial | commercial-service |
| panels / breaker box | panels |
| EV | ev-charger-installation |
| rewiring / aluminum | electrical-remodels (the hub map's "Remodels & rewiring") |
| lighting | recessed-lights-installation |
| ceiling fans | fixture-replacements |
| inspection | electrical-safety-inspections |
| new construction | new-construction-wiring |
| pool & spa | exterior-electrical (its body lists "pool and spa equipment circuits") |

Some intents have no service page and get no card:
- "residential electrician" (a category, not a service);
- emergency / same-day (the business isn't 24/7);
- low voltage / smart home;
- generator / battery (`/faq`: generators not offered);
- mobile homes.

Fountain Hills, Ahwatukee, San Tan Valley and Apache Junction have too little city demand for six services. Their lists are filled with the residential services that have the most site-wide 16-month impressions and aren't already listed: EV 38,429, recessed 12,278, inspections 897. The `featuredEvidence` field for each city gives its numbers.

**nearbyLocations.** Cities that share a border come first. Ahwatukee is a Phoenix village, so it and Phoenix list each other. If a city has fewer than three bordering cities among the 10, the list is filled with the closest cities by straight-line distance between city centres. Mesa is left out because templates add it through the homepage. Gilbert's list, for example, is Chandler and Queen Creek (borders) plus Tempe (10.1 mi). The `nearbyEvidence` field for each city gives the basis.

**cardBlurb.** Only the five cities with a tile in the live homepage section "We proudly serve the entire valley!" have a blurb: Scottsdale, Phoenix, Gilbert, Chandler and Tempe. The same tiles appear on `/commercial-electrician`. The text is verbatim with two punctuation fixes:
- Chandler's tile ends with a stray comma ("…Downtown Chandler,"), now a period;
- Mesa's tile has no closing period, so one is added to match the others.

The other five cities have no tile copy and stay empty; nothing is written for them. Mesa's blurb goes into `siteSettings.homeCity.cardBlurb`. Existing `homeCity` fields are merged, not replaced, so `local-facts` can add neighborhoods and utilities on top.

## 6. Site settings (`site-settings.json`)

- **heroQuotes.** The three homepage hero quotes, verbatim without the curly quotation marks. Each has rating 5 because the live hero shows a five-star graphic beside it. None of the three appears in the 50 reviews the BrightLocal widget exposes, so no `review` is linked. They may come from older reviews among the 333; the owner should confirm.
- **valueProps.** The three homepage cards, verbatim: "No BS pricing", "Amazing Quality" and "Client Satisfaction", each with its live link. The Font Awesome icons are mapped to tokens: fa-plug → `plug`, fa-bolt → `bolt`, fa-lightbulb → `bulb`.
- **capabilities.** The six "Electrician solutions tailored to your needs" items, verbatim, all with the `check` icon:
  - Electrical Repairs → troubleshooting;
  - Custom Lighting Solutions → custom-lighting;
  - Panel Upgrades → panels;
  - Electric Vehicle Chargers → ev-charger-installation;
  - "+ More!" → a "View All Services" link to `/services` (the live label for that link elsewhere on the homepage);
  - "Wiring Solutions" stays unlinked, because no single service page matches it.
- **ctaBand.** "We're ready to work for you", "Get a Free Estimate" → `/contact-us`, and the status line "Free estimates available". The live 🟢 is decoration, which the design draws.
- **availabilityNote.** Two sentences from the visible `/faq` answer "Do you work on weekends or offer emergency service?":

  > Our regular office hours are Monday through Friday, 9 AM to 5 PM. If you have an urgent situation, give us a call and we'll do our best to accommodate you.

  The phone number ("at 602-769-7892") is dropped, because the note sits next to the phone number from Site settings and NAP lives only there. There is no 24/7 or emergency claim, and the module rejects one.
- **googleBusinessProfileUrl and reviewSummary.reviewsUrl:** `https://maps.app.goo.gl/j4qZJwx8ttVZo93w5`.
  - The live site links it from the footer of the blog-category pages.
  - The reviews module already uses it as every Google review's `sourceUrl`.
  - On 2026-10-13 it resolved to the Google Maps listing "The Wire Guy Electric" in Mesa (knowledge-graph id `/g/11f04d6xl_`).
  - The same footer's Google icon link (`maps.app.goo.gl/6qQ2iDaf8YGrdJuW8`) resolves to the same place, so it is the same profile. The one the reviews already cite is kept.
  - The live copy has no direct "all reviews" link; this listing is where the reviews are shown.
  - `sameAs` holds no Google URL (Facebook, Instagram, Yelp and BBB only). It is left alone; templates can add `googleBusinessProfileUrl` when they build `sameAs`.
- **rocLicenseUrl:** the AZ ROC contractor-search link that the live `/faq` answers use for "ROC #365306".
- **addresses[].googleMapsUrl.** The two links the live sitewide footer uses for each office address:
  - Mesa → `share.google/39FbblYQXkvLuozlw`, which resolves to the same `/g/11f04d6xl_` entity;
  - Scottsdale → `share.google/6sZyf6wyKExyHzHnF`, which resolves to "The Wire Guy Electric of Scottsdale" (`/g/11xgv_scn6`).
- **addresses[].mapLinkText.** The visible text of those two footer links, verbatim, because the owner asked for the footer addresses to read exactly as they do today:
  - "1321 N 65th St, Mesa, AZ 85205 - Mesa Location";
  - "8555 E Raintree Dr, Unit 117 Scottsdale, AZ 85260 - Scottsdale Location" (the live text has no comma after "Unit 117").

  The module checks that each text starts with its office's street address.

## 7. Questions for the owner

1. **EV, recessed and surge prices conflict across the live site** (§3). The `/faq` figures are used. Confirm them, or give one set to publish everywhere.
2. **Hero quotes:** confirm they come from real reviews, and name the reviewers if you can, so they can link to `review` documents.
3. **"Wiring Solutions"** has no service page. Should it link to `electrical-remodels`, `new-construction-wiring`, or nothing?
4. **Do you offer** the following? If so, they deserve service pages or cards:
   - surge protector installs (priced on `/faq`);
   - emergency or same-day service;
   - low-voltage or smart-home work;
   - work on mobile and manufactured homes (Apache Junction demand).

## 8. Testing

```sh
MIGRATE_OUT_DIR=/tmp/<scratch>/mig-fixes node scripts/migrate/webflow-to-sanity.mjs
```

A successful run means no dangling references, because the script exits on any. `report.json` → `fixes` summarises what changed:
- 10 cities;
- 28 FAQs updated, 5 renamed, 0 created, 0 unmatched;
- 3 services priced, 21 with related posts;
- 53 posts mapped.

Checked on 2026-10-13 against a run without this module. The only fields this module changes are:
- `faq`: question (5), answer (28), topic (28), services (14);
- `service`: priceRange (3), relatedServices (21), relatedPosts (21);
- `post`: relatedServices (53);
- `location`: name (10), cardBlurb (5), featuredServices (10), nearbyLocations (10);
- `siteSettings`: the fields in §6 plus `homeCity.cardBlurb`.

No title, H1, meta description or slug changes. Other checks on the output:
- every array item has a unique `_key`;
- every internal link in an FAQ answer resolves to a live route, relative and without a trailing slash;
- no internal FAQ link opens in a new tab.

A trial run with `MIGRATE_OUT_DIR` does not save new IDs to the committed `id-map.json`. Any document created by a module (none from this one today) gets a fresh ID on each trial run, until a normal run saves it.

## 9. CMS templates (`cms-templates.json`)

Applied by `scripts/migrate/content/cms-templates.mjs`, which runs last (after `page-sections`). It feeds the city, service and post templates (see `docs/DESIGN_SYSTEM.md` §13) and never touches a title, H1, meta description or slug.

| Key | What it sets | Source |
|---|---|---|
| `featuredPosts` | `post.featured` on 7 posts, so guide lists on city and service pages lead with them | Search Console, the Tier-1 posts by clicks |
| `serviceImages` | `service.mainImage` for `ev-charger-installation` and `electrical-troubleshooting`: the crew's own photos of that work in place of a stock image or a photo of tools (the asset must be in the dataset) | `migration/brand-photos` |
| `serviceAlts` | alt text for the services' own photos (all were empty; a replaced image carries its alt in `serviceImages`) | the asset audit and the brand-photos manifest |
| `atAGlance` | `service.atAGlance` facts for `panels` (most common job, panels installed, utility, permits), each with its supporting line (`detail`) | each fact quotes `evidence` that must appear word for word in the service body or the named `/faq` answer |
| `quickAnswers` | `service.quickAnswer` on all 21 services: the answer-first line of the page's "short version" (the Panels text is the round-5 mockup's) | each answer lists the body phrases it restates (`evidence`), which must appear word for word in that service's body; 25–60 words, no price |
| `bodyEdits` | the dollar ranges in four service bodies (Panels "What It Costs", EV charger, remodels, new construction) taken out, the rest of each sentence and every link kept; Panels gets the live city pages' flat-rate sentence | owner rule: prices stay inside FAQ answers and blog posts. Each `find` must match exactly once and not cut a link; the run fails if any service body still names a price |
| `bodyLinks` | the FPE/Zinsco post linked, by its title, from the Panels recall-list sign (round-5 mockup) | the block must match exactly once |
| `linkFixes` | "Schedule your estimate" in `recessed-lighting-installation-phoenix` → `/estimate` (an estimate link without "free", which the phrase rule misses) | must match exactly one link |
| `postCategories` | `post.category` = Lighting on the six posts whose titles are about lighting, so `/posts-categories/lighting` lists them | the post titles |
| `textFixes` | typing slips in a post body the live page carries too ("afternoon?The" in `can-hot-weather-cause-your-circuit-breaker-to-trip`) | the post itself; each `find` must occur exactly once in that post's text |
| `bodyRemovals` | two body blocks taken out: the Panels "Related Reading" item for the archived 2023 post (it redirects to `/services/panels`, so it linked the page to itself), and the screenshot of the retired Webflow homepage in `level-1-vs-level-2-ev-chargers-which-to-choose` (its heading and paragraphs stay) | the documents themselves; each removal names one block by its exact text or image URL and must match exactly once |

It also removes the SEO tool's tracking markers (`sbb-itb-…`) that the Webflow export carried into a post body as a heading of their own (`level-1-vs-level-2-ev-chargers-which-to-choose`). `report.json` → `cmsTemplates` lists what it set. The migration stops if a slug, an asset or a FAQ is missing, a replacement image has no alt, a fact's or answer's evidence is not in its source, an edit, link, text fix or removal does not match exactly once, or a service body still names a price.
