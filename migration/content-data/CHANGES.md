# Content changes for the redesign

Prepared 2026-10-13. Nothing here is live yet. It is what the new site will show once the dataset in `migration/sanity-import/production.ndjson` is imported into Sanity.

**Ground rules we kept:**
- Every page title, H1, meta description and URL is unchanged. These are what Google ranks today, and an automated check confirmed none of them moved.
- Every word on the new pages is your own live copy, a record already in the CMS, or a fact from a public source we cite. We did not write new claims, prices, reviews, stats or credentials.
- Where we made a judgment call, it's in the **Please confirm** list below.

---

## Please confirm

These need your answer before launch. Each one says what the site shows today and what we did.

### Prices
1. **Your site quotes different prices for the same jobs.** We used the `/faq` figures everywhere new: the price table on `/services` and the price range stored on each service page. Please confirm them, or give us one set to use everywhere.

   | Job | `/faq` (used) | Elsewhere on the live site |
   |---|---|---|
   | Level 2 EV charger | $750–$3,500 | EV charger page: Tesla Wall Connector $650–$1,800; NEMA 14-50 $450–$1,200. Level 1 vs Level 2 post: $600–$2,500 |
   | Six recessed lights | $1,050–$1,750 | Recessed lighting post: $1,400–$2,200 |
   | Whole-house surge protector | $300–$600 | Surge protector post: $400–$800 |

   Panel prices agree everywhere: $5,200–$6,500 for a standard 200-amp panel, and $6,400–$8,750 for a full service replacement.

   **Answered 2026-10-19 ("Always go with the higher amounts", decision D16):** wherever two pages priced the same job differently, both now show the higher range. Six recessed lights read $1,400–$2,200 and a whole-house surge protector $400–$800 on `/faq`; the Level 1 vs Level 2 post reads $750–$3,500 for a Level 2 charger installed. The full list, old and new, is D16-01 … D16-11 in `migration/content-edits/decisions.json`.
2. **No price table anywhere.** Per your note of Oct 13, prices only appear where you already publish them, inside the `/faq` answers. The `/services` price table we had drafted is gone, and service pages have no price modules. The ranges stay stored on each service in Sanity (hidden) in case you ever want them.
### Your address
- **The Mesa street address shows only in the footer** (and in the search-engine data, which keeps your name/address/phone consistent for local SEO). It no longer appears in the Contact Us or Careers page content, office cards, maps or directions links. In Studio this is the new "Show only in the footer" switch on the address.

### Reviews and quotes
3. **Hero quotes.** "Went above and beyond, great prices too!", "Could not be more pleased!" and "Excellent, polite and timely service!" (home page), and "On time and stayed on schedule", "Clear pricing and communication" and "Reliable electricians for our business" (`/commercial-electrician`). None of these matches the 50 reviews your reviews widget shows. Are they from real reviews? If you can name the reviewers, we'll link each quote to its review.
4. **Review count.** Site settings and your business description say "380+ Google reviews". Your BrightLocal widget says "333 Total Reviews". Which number is current?
5. **Your reviews widget seems to have stopped updating.** It shows only 50 reviews, and the newest is from 2026-02-26. We imported 46 of them as real, crawlable reviews, word for word. An export from your Google Business Profile, which needs your login, would bring in newer and older reviews.
6. **Four Yahoo reviews were not imported**, because the review type has no "Yahoo" source. Only Matt K. (2025-12-18) is a full review that appears nowhere else. Should we add Yahoo as a source so his review can show?
7. **A featured review mentions a price.** Christopher Demetral writes "The $195 charge felt very fair." Keep it featured, or un-feature it? Either way it still shows on the Tempe and ballast-replacement pages.
8. **Three homeowner outlet reviews** (CathySiegel, Syl G, Brady staples) are tagged to the Outlets & Switches page, which is written for commercial customers. Keep the tags, or remove them?

### Team and photos
9. **About Us now shows current bios from `/our-team`.** The old About Us copy disagreed with `/our-team`. For example, Steven had 12 years and a "fiance", Cody was Owner/Service Manager, Cade was Lead Technician with about 6 years, and Wade was Service Tech with a "wife". Please confirm the `/our-team` versions are current.
10. **New team profiles.** Blake Thompson (Service Tech), Brandon Connelly (Service Tech) and Stephanie Langford (Dispatcher) appear on `/our-team` but had no profile record. We created profiles with just the name, role and photo the page shows.
11. **The van door in Blake's, Brandon's and Stephanie's photos shows ROC#340400.** Your license on the site is ROC #365306. Should we crop the photos, or is 340400 also yours?

### Links and wording we changed
12. **Two links went to the wrong place, and we fixed them.** On About Us, "See all services" went to `/contact-us`; it now goes to `/services`. On `/commercial-electrician`, the "Panel Upgrades" card went to commercial troubleshooting (and its photo to EV chargers); it now goes to Electrical Upgrades.
13. **We dropped the "🟢 Active Now" line** on `/our-team` and `/services`, because it isn't true outside office hours. Those pages now show your other live line, "Free estimates available". Say the word if you want it back.
14. **Trust strip labels are new short wording built from your own facts:** "30+ years of combined experience" (About Us), "2-year warranty on services we provide" (`/faq`), "Flat-rate pricing with no hidden fees" (the Contact Us description) and "Free estimates available". Please confirm the wording is fine. **Warranty answered 2026-10-19 (decision D17):** no term is stated anywhere; the site says only "Our work comes with a warranty." (the `/faq` answer, the service pages' at-a-glance facts, `/estimate` and the homepage card "We come back if anything's wrong").
15. **Punctuation.** The Chandler tile ended with a stray comma, so we changed it to a period. The Mesa tile had no period, so we added one.
16. **"Wiring Solutions"** in the home page checklist doesn't link to any service. Should it link to Electrical Remodels, New Construction Wiring, or nothing?

### Services you might offer
17. **People search for these, but you have no page for them.** Do you offer:
    - surge protector installs (you already quote a price on `/faq`);
    - emergency or same-day service;
    - low-voltage or smart-home work;
    - work on mobile and manufactured homes (searched in Apache Junction)?

    If so, each deserves its own page.

### City facts
18. **Neighborhoods people search for that your copy doesn't name yet** (not added):
    - Mesa: Superstition Springs, Leisure World, Alta Mesa, Cadence at Gateway, East Mesa
    - Gilbert: Higley
    - Chandler: Chandler Heights, Sun Lakes
    - Scottsdale: Kierland, Grayhawk
    - Phoenix: Desert Ridge, Laveen
    - Fountain Hills: Fort McDowell, Hidden Hills, Rio Verde
    - Apache Junction: Gold Canyon, Mountain Brook

    Tell us which ones you serve and we'll add them.
19. **Phoenix ZIP codes.** The Phoenix page lists 45 ZIP codes. A few have another city in their postal name: 85310 (Glendale), 85353 (Tolleson) and 85086 (Anthem area). Show all 45? Laveen (85339) is just outside our rule, so it isn't listed. Add it if you work there.
20. **Spellings.**
    - "Jacobs Ranch": property listings write "Jacob's Ranch".
    - "Center Court": listings call it "Center Court at Ahwatukee".
    - "Cimmarron": the double m matches the listings.
    - "Fountain Park District": this is an area, not a subdivision.
    - Phoenix: the tile says "Biltmore" and the page says "Biltmore Area".

    Please confirm.
21. **Landmarks in your city pages that are actually in a neighboring town** (copy not changed):
    - Desert Botanical Garden (Fountain Hills page) is in Phoenix.
    - Schnepf Farms (San Tan Valley page) is in Queen Creek.
    - Gold Canyon Golf Resort (Apache Junction page) is in Gold Canyon.
    - Talking Stick Resort (Scottsdale page) is on Salt River Pima-Maricopa Indian Community land.

    Worth a look before the copy is reused.
22. **San Tan Valley permits.** Pinal County handles permits for the new Town of San Tan Valley under an agreement that runs through 2026-12-31. The permit note will need updating in January 2027.

---

## What changed

### 1. The nine main pages are now built from editable sections
Home, About Us, Our Team, Careers, FAQ, Contact Us, Services, Blog and Commercial each now have a list of page sections that your team can edit in Sanity, such as a hero, team, FAQs, city tiles, reviews, gallery, contact form and closing call to action. Every live sentence, heading, button and link was carried over word for word. An automated check found 100% of the live copy on all nine pages. Anything deliberately left out has a reason recorded in `migration/page-content/_omissions.json`: form placeholders, broken widgets and Webflow leftovers.

New on these pages, built only from your existing copy and records:
- **Home and Commercial:** a real-photo gallery replaces the broken photo feed. Reviews now show as text Google can read, instead of the widget. Home also gets the three general FAQs.
- **About Us, Our Team, Services and Blog:** the shared closing banner, "We're ready to work for you" with "Get a Free Estimate".
- **Contact Us and Services:** city tiles and three FAQs each. Services also gets the price table (see confirm item 1).
- **About Us and Contact Us:** trust strips (see confirm item 14).
- **Services:** every service listed once under Residential or Commercial. This replaces the hidden tabs, where every card was in the page twice.

### 2. FAQs now match what visitors see
The 28 FAQ records had been built from the page's hidden structured data, which held an **older version** of most answers with outdated prices. Google was being told different prices from the ones on the page:

| Question | Old (hidden) | Now (matches the page) |
|---|---|---|
| Hourly rate | $75–$150 | $125–$375 |
| Panel replacement | $1,800–$3,500 (full service $3,500–$5,500) | $5,200–$6,500 (full service $6,400–$8,750) |
| Recessed lights | $800–$1,500 | $1,050–$1,750 |
| EV charger | $500–$1,500 | $750–$3,500 |
| Years in business | "over 7 years" | "over 9 years" |

All 28 answers are now exactly the visible `/faq` copy, with their links (54 internal, 2 phone, 4 to your AZ ROC license). The FAQ structured data in the built site now carries the current prices. Five questions changed to their visible wording, such as "panel **replacement** cost" and "recessed **can** lighting". Each FAQ is filed under its visible group, so the `/faq` page rebuilds in the same order, and FAQs about a specific service are linked to that service.

### 3. City pages
- **Names:** each city record is now just the city ("Gilbert" instead of "Licensed Electrician in Gilbert, Arizona"), so breadcrumbs and service-area lists read cleanly. Page titles and H1s are unchanged.
- **Local facts, each with a cited public source** (details and 39 citations in `docs/research/local-facts.md`):

  | City | County | ZIPs | Electric utility | Neighborhoods (all from your own copy) |
  |---|---|---|---|---|
  | Ahwatukee | Maricopa | 3 | SRP | Foothills Club West, Mountain Park Ranch, Lakewood, Desert Foothills, Center Court |
  | Apache Junction | Pinal | 2 | SRP | Superstition Foothills, Ironwood Estates, Cimmarron, Jacobs Ranch, Renaissance Point |
  | Chandler | Maricopa | 6 | SRP, APS | Ocotillo, Fulton Ranch, Downtown Chandler, Sun Groves, Andersen Springs |
  | Fountain Hills | Maricopa | 1 | SRP | Fountain Park District, SunRidge Canyon, Eagle Mountain, North Heights, Firerock |
  | Gilbert | Maricopa | 6 | SRP, APS | Power Ranch, Val Vista Lakes, Seville, Morrison Ranch, Agritopia, The Islands |
  | Phoenix | Maricopa | 45 | APS, SRP | Arcadia, Biltmore, Ahwatukee, North Phoenix, Central City, Downtown Phoenix |
  | Queen Creek | Maricopa | 2 | SRP | Queen Creek Marketplace Area, Sossaman Estates, Montelena, Ironwood Crossing, Hastings Farms |
  | San Tan Valley | Pinal | 3 | SRP | Johnson Ranch, San Tan Heights, Copper Basin, Morning Sun Farms, Pecan Creek |
  | Scottsdale | Maricopa | 9 | SRP, APS | North Scottsdale, DC Ranch, McCormick Ranch, Gainey Ranch, Old Town Scottsdale |
  | Tempe | Maricopa | 4 | SRP, APS | Downtown Tempe, South Tempe, The Lakes, North Tempe, Maple-Ash |
  | Mesa (home page) | Maricopa | – | SRP, City of Mesa | Eastmark, Las Sendas, Red Mountain Ranch, Dobson Ranch |

  Each city also gets a short note on who issues electrical permits, and its map coordinates. Queen Creek and Apache Junction straddle two counties: each lists its main county, and its permit note mentions the other.
- **Featured services (6–8 per city)**, ordered by what people in that city actually search for, from Search Console.
- **Nearby cities**: neighbors that share a border first.
- **Tile blurbs**: the five cities with a home page tile (Scottsdale, Phoenix, Gilbert, Chandler, Tempe) keep their tile text. Mesa's tile text moved to Site settings.

### 4. Services and blog posts
- **Price ranges** on three services, all from `/faq` and dated 2026-10-13: Panels $5,200–$6,500, Recessed Lights $1,050–$1,750, EV Chargers $750–$3,500. See confirm item 1.
- **Related services** (3–4) on all 21 service pages, and **related posts** on 15. Six commercial services have no related posts, because none of your 53 posts covers their subject. We did not force weak links.
- **Every blog post** now points to the service it supports, such as the panel cost post pointing to Panels. This builds the internal links that help those service pages rank.

### 5. Reviews
46 real Google reviews from your BrightLocal widget, copied word for word with the reviewer's name, date and star rating. Eight are marked as featured. Thirteen are linked to the service they mention, and one of those, which says "here in Tempe", is also linked to its city. All 46 are 5-star.

### 6. Team and careers
- Three new team profiles (confirm item 10).
- The job description for the open position is now the copy visible on `/careers`. Before, the page and the job-listing data Google reads said different things.

### 7. Site-wide settings
Values your team edits once and the whole site uses, all copied from the live site:
- the home hero quotes;
- the three "No BS pricing / Amazing Quality / Client Satisfaction" cards;
- the "Electrician solutions tailored to your needs" checklist;
- the closing banner;
- your office-hours note, with no 24/7 claim;
- your Google Business Profile link (also used as the reviews link);
- the AZ ROC license lookup link;
- a Google Maps link for each office (Mesa and Scottsdale).

### 8. Photos
16 real company photos were added to your Sanity media library (crew, vans, job photos), plus five job photos already there. Each has a written description (alt text) for accessibility and image search. They replace the stock photos and the broken photo feed.

### New and retitled service pages (2026-10-19, decision D18)

- Three new pages: `/services/whole-home-rewiring`, `/services/hot-tub-pool-spa-electrical` and `/services/whole-house-surge-protection`. Every sentence restates your own posts, `/faq` answers or the sourced local facts; none shows a price (each links its cost guide). They are in the Services menu, on `/services`, in the sitemap, and linked from their posts.
- Retitled, same URLs: `/services/fixture-replacements` is "Ceiling Fan & Light Fixture Installation" (menu: "Ceiling Fans & Light Fixtures") with a new ceiling fan section; `/services/exterior-electrical` is "Landscape & Outdoor Lighting Installation" (menu: "Landscape & Outdoor Lighting") with a new landscape lighting section.

## What did not change
- Every page title, H1, meta description and URL (105 live URLs checked).
- The body copy of every service, city and blog post page.
- Your business name, address, phone, hours, license number and founding year.

---

## For the team: how this was checked

Checked 2026-10-13 on the output of the full migration (`node scripts/migrate/webflow-to-sanity.mjs`):

| Check | Result |
|---|---|
| Migration | 204 documents: 21 services, 10 locations, 53 posts, 28 FAQs, 46 reviews, 9 team members, 9 pages, 1 job, 1 site settings, 5 categories and 21 image assets. No dangling references. Re-running gives byte-identical output. |
| Stable IDs | `id-map.json` only gained 49 keys (46 reviews and 3 team members). No existing ID changed and no document was removed. |
| `scripts/migrate/verify-content.mjs` | 100% of live copy and links found on all 9 pages, or listed in `_omissions.json`. It still fails on the old dataset and on deliberately broken copies. |
| FAQs | All 28 answers equal the visible `/faq` copy, with the same link targets and order. No outdated price is left in any FAQ. Every FAQ a page section uses exists, and the `/faq` topics rebuild all 28 questions in live order. |
| Reviews | All 46 review texts are character-for-character in the saved widget HTML. |
| Schema, new `scripts/migrate/validate-dataset.mjs` | Every document, section and field matches the Studio schema: no unknown fields, no wrong types, no disallowed array items or list values, and no reference to a missing or wrong-type document. Every section image has an asset and alt text. Tested against a deliberately broken copy, where it caught all 12 planted faults. |
| `sanity documents validate --file` | 0 errors and 71 warnings. The warnings are all "alt text recommended" on the main image of 50 posts and 21 services, which came from Webflow without alt text (see follow-ups). |
| Real queries | Running `web/src/lib/queries.ts` `getPage()` on all 9 pages against the new dataset returned all 290 section values and every referenced FAQ, service, city and team member. |
| Studio | `tsc --noEmit` passes and `sanity build` passes. |
| Web | `astro check` gives 0 errors and 0 warnings. `SITE_INDEXABLE=true` build passes; it was built from this local dataset, with `PUBLIC_SANITY_PROJECT_ID` unset. |
| SEO parity (current templates) | 0 errors and 0 warnings across 124 crawled URLs. The 119 info rows are new JSON-LD types (95) and URLs that 404 or redirect on purpose (24). The `/faq` FAQPage data now carries the current prices. |
| Spot checks against sources | All 13 values matched their source. Census 2020 (Apache Junction ZIP 85119 is 49.6% of the ZIP's land; Fountain Hills is in Maricopa County). USGS GNIS (Gilbert 33.3528, -111.7890). The Town of Fountain Hills utility page (SRP). Tempe's Permit Center (applications through the Citizen Access Portal). Live snapshots: the McCormick Ranch and Chandler tiles, the recessed price on `/faq`, Blake Thompson's role, the Google profile link, and the Contact Us description. The saved widget HTML (Jennifer Kirsten's review). One photo's alt text against the photo itself. |

### Follow-ups (not owner questions)
- **Alt text missing on imported images.** 50 post and 21 service main images came from Webflow without alt text. This is a warning, not an error. Someone should write alt text after looking at each image.
- **Mesa facts waiting for schema fields.** Mesa's ZIPs, coordinates and permit note are researched (`migration/local-facts/mesa.json`), but the home-city schema has no fields for them yet.
- **Import includes image records.** The import file contains 21 `sanity.imageAsset` records for photos already in Sanity. `sanity dataset import` checks they belong to qhi2uf0l/production and that their URLs resolve (all 21 do), then replaces them unchanged.
- **Template dependencies** (owned by the design workstream):
  - The careers "Apply Now" button targets the section key `apply-now`, so templates must render each section's key as its HTML id.
  - "(Full-time)" comes from the job's employment type.
  - The `/faq` FAQPage data should be built from the page's own FAQ sections (`collectPageFaqs`).
- **Build mode.** `web/.env` points the site at the live Sanity project. Until this dataset is imported there, build with `PUBLIC_SANITY_PROJECT_ID=` (empty) to see the new content.

---

## Open questions before launch (2026-10-17)

Added after the launch review. Launch is planned for Thursday 2026-10-22; the steps are in `docs/LAUNCH_RUNBOOK.md`. As above, each question says what the site shows and what we did.

### Settled since the list above
- **Item 3, hero quotes:** the three quotes on `/commercial-electrician` are gone. None matches a review, and showing them as reviews risks the FTC rule on fake reviews. The home page's three are still there (question 26).
- **Item 4, review count:** your Mesa Google profile showed 5.0 from 567 reviews on 2026-10-17. The site now says "560+" wherever it gives a count.
- **Item 11** becomes question 23.
- **Item 21, landmarks:** the Fountain Hills page no longer names the Desert Botanical Garden (it is in Phoenix). The other three are kept, worded as "near" or "the area around".
- **Stadium name:** the Tempe page said "Sun Devil Stadium"; it now says Mountain America Stadium, the name since 2023 (ASU's own announcement).

### Licence and business details
23. **Which ROC licence is active?** The site, the FAQ and Nextdoor show ROC #365306. The van door in three team photos, your Facebook intro, Instagram bio, Yelp description, Manta listing and BuildZoom show 340400, and people search for "the wire guy electric roc 340400". We kept 365306 everywhere, and nine new city meta descriptions name it. Please look up both at roc.az.gov and tell us which is current, or which goes with which kind of work.
24. **Legal name.** A copy of the state business register shows "THE WIRE GUYS ELECTRIC LLC" (filed 2025-06-19). The footer, the search-engine data and BBB say "The Wire Guy Electric LLC". Please check the company that holds your licence at ecorp.azcc.gov.
25. **Scottsdale office hours.** Google, Apple Maps and Bing show it open Monday to Friday, 9 to 5. The Scottsdale page says "Office visits by appointment only." Is it staffed 9 to 5? Until you answer, the search-engine data gives that office no hours. Either way, the Google profile and the page should end up saying the same thing.

### Claims on the site
26. **Home page hero quotes.** "Went above and beyond, great prices too!", "Could not be more pleased!" and "Excellent, polite and timely service!" are still shown with stars (live copy). None matches a review. Are they real? If you can name the reviewers, we'll link them; otherwise we'd cut them.
27. **"Trusted by 100+ Arizona businesses"** on `/commercial-electrician`. We kept it because the live page shows it word for word. Is the number right?
28. **Free inspections and same-day service.** The monsoon post offers "free post-storm safety inspections" and a "free safety check". The surge-protection and breaker posts (and the breaker post's search description) say "same-day service available". We kept all three. We did change "Emergency troubleshooting" to "Electrical troubleshooting" in the monsoon post, since you don't offer an emergency line.
29. **Prices in the Level 1 vs Level 2 charger post.** It prices a 200-amp panel upgrade at $1,800–$2,500, against $5,200–$6,500 everywhere else, and its two tables disagree (Level 1: $80–$180 and $300–$600; Level 2 installed: $400–$1,700 and $600–$2,500). **Answered 2026-10-19 (D16, the higher figure):** the panel reads $5,200–$6,500, Level 1 $300–$600, and Level 2 installed $750–$3,500 (the `/faq` figure); the installation-only line ($400–$1,700) is a part of that total and stays. Which figures are right, or should the post be rewritten? We fixed one fact in it: the car's onboard charger, not the Level 1 charger, turns AC into DC.
30. **Claims in posts we kept but can't source:**
    - "the #1 cause of summer tripping" and "30–50° hotter" (hot-weather breaker post);
    - "a 53% return on investment" and "can void your homeowner's insurance" (7 signs post);
    - "Phoenix has the strictest enforcement in the Valley" (generator interlock post; the post is gone since decision D15, 2026-10-19);
    - the quote attributed to City of Phoenix Code Enforcement (DIY post);
    - "one of the most documented hazards" (hardwired vs plug-in EV post);
    - "+15–20% home value" and "a 50% return" from "multiple real estate studies" (landscape lighting post);
    - "September" in the back-to-school post (East Valley schools start in late July or early August).

    Confirm, give us a source, or we'll remove them.
31. **Steven Taylor's quote on `/our-team`** is the stock paragraph ("the name you can trust … your dependable partner in all things electrical"). A quote under his name may only lose words, and nothing meaningful is left if it does. Approve it, give us his own words, or we cut it.
32. **Hanging lights.** The page now shows its published 2024 copy, not the 2026-08-18 rewrite that sits unpublished in Webflow. The published copy reads like stock text ("perfect for businesses looking to enhance their ambiance", "meticulous attention to detail"). Should we use the rewrite instead, or have this copy reviewed?
33. **Smaller copy points:**
    - The home page team intro names Emma with her photo and a link (live copy), although your rule is that Emma appears only as a status line. Keep it?
    - "Over 9 years" in the "tell me more about your business" FAQ goes stale in 2027. "Since 2017" would not.
    - "Done right the first time." is now both a home page section heading and one of the card titles below it. Keep both, or give the section another heading?

### Hiring and lead delivery
34. **The job posting closes on 2026-11-18.** The site removes it, and its Google for Jobs listing, the next morning. Extend it or close it? Google also recommends a pay range; the site shows none unless you give one.
35. **Résumé uploads (FlowDrive).** The careers form keeps your FlowDrive upload. Please confirm the FlowDrive account is active and not tied to the Webflow plan you will cancel, and that thewireguyelectric.com is in its allowed sites.
36. **Form delivery (Formspark).** Leads go to a Formspark form you create (steps in the runbook). Leave "Allowed domains" empty and buy the one-time 50,000-submission bundle: either mistake turns every lead into a "please call us" message.
