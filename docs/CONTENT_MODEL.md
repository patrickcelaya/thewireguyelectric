# Content model

How content for thewireguyelectric.com is structured in Sanity (project `qhi2uf0l`, dataset `production`), and what each field is for. Written for two readers:

- **Template builders** (Astro, `web/`), who need to know what a query returns and how to render it.
- **Editors** (Sanity Studio), who need to know what to type where.

**Source of truth:**
- Schema: `studio/schemaTypes/`. Page-builder sections are in `studio/schemaTypes/sections/`.
- Query shapes: `web/src/lib/types.ts`.
- Queries and fetchers: `web/src/lib/queries.ts`.

---

## 1. Rules every template and editor follows

1. **One H1 per page, and it never comes from a section.**
   - Static pages: the H1 is `page.heading`.
   - Services: `service.heading ?? service.name`.
   - Cities: `location.heading`.
   - Posts: `post.title`.
   - These strings match what Google has indexed today. Change them only as a deliberate SEO decision.
   - The hero section *shows* the page H1, and can highlight a few of its words (`headingAccent`), but has no heading of its own.
2. **Section headings are H2.** Anything inside a section (cards, FAQ groups, steps) is H3 or lower. CTA bands use H2, never H1.
3. **Empty means nothing.**
   - Every new field is optional.
   - A section whose content resolves to an empty list renders nothing: no heading, no wrapper.
   - Never fill a gap with placeholder copy.
4. **Never invent facts.** Reviews, prices, stats, neighborhoods, utilities, credentials and years in business come from:
   - the live site copy;
   - Sanity;
   - or a cited public source.

   Hero quotes are copied verbatim from real reviews. Prices carry the date they were checked.
5. **NAP lives only in Site settings.** Name, address, phone, email, hours, license, rating and review count come from `siteSettings`. Sections never store their own copy of these.
6. **Every image has alt text.**
   - Images in sections, projects and Site settings → Home city require it (an error in Studio).
   - Document main images (imported from Webflow, many still without alt), team photos, the logo and share images show a warning so old content can still be published.
   - Templates may render a card thumbnail with `alt=""` when the card title sits next to it (decorative).
7. **One FAQPage per page.**
   - Visible FAQs and FAQ structured data come from the same documents.
   - On page-builder pages, `collectPageFaqs(page)` returns every question shown across all FAQ sections. Build the single `FAQPage` node from that.
8. **No review markup about the business.** Reviews and ratings render as visible text only (no `Review` / `AggregateRating` JSON-LD).
9. **Model content, not looks.**
   - Types are named for what they are (`priceGuideSection`, not `tableBlock`).
   - The few presentational switches that exist are listed in their section below.
   - Icons are tokens (`bolt`, `shield`, …) that the design maps to artwork.

---

## 2. Document types

Field tables list the field name, its type, and what it is for. **New** marks fields added for the redesign.

### siteSettings (singleton, `_id: "siteSettings"`)

The single source of truth for the business entity. It feeds the header, footer, trust strip, CTA band, contact blocks and every page's LocalBusiness JSON-LD. Keep it identical to the Google Business Profiles.

**Groups:** Business, Trust & reviews, Shared copy, Navigation, SEO defaults, Tracking.

| Field | Type | Purpose |
|---|---|---|
| businessName, legalName, tagline, description | string / text | Entity names; description is used in schema |
| phone, phoneE164 | string | Display format "(602) 769-7892" and `tel:` format "+16027697892" |
| email | string | |
| addresses | postalAddress[] | Offices: Mesa HQ, and Scottsdale (own GBP, appointment-only). See **postalAddress** |
| openingHours | openingHours[] | Office hours (Mon–Fri 09:00–17:00) |
| emergencyService | boolean | Only true if after-hours emergency service is really offered |
| **availabilityNote** | text | **New.** An honest line on when people can reach the office and what happens with urgent requests. Shown near phone numbers and forms. Never implies 24/7 service |
| priceRange, foundingDate | string | "$$", "2017" |
| founders | ref teamMember[] | Owner(s), for schema `founder` |
| rocLicense | string | "365306" |
| **rocLicenseUrl** | url | **New.** Public AZ ROC lookup page. Every displayed license number links here |
| **googleBusinessProfileUrl** | url | **New.** The main (Mesa) GBP. Each office's own profile link is on its address (`googleMapsUrl`) |
| reviewSummary | {ratingValue, reviewCount, source, reviewsUrl} | Rating shown as visible text ("5.0 from 380+ Google reviews"). Keep it in sync with GBP |
| badges | string[] | Short trust claims, e.g. "Licensed, bonded & insured". Appended to the standard trust strip |
| **heroQuotes** | reviewSnippet[] | **New.** Shared hero quotes, used by city-page heroes and any template without its own |
| sameAs | url[] | Social and directory profiles for schema |
| serviceAreas | ref location[] | Cities for `areaServed`. The query adds `shortName` (bare city) because some location names still hold the full H1 |
| **homeCity** | object | **New.** Mesa is the homepage, so it has no `location` document. City lists show Mesa from here, linking to `/`. Fields: `name`, `cardBlurb`, `image` (alt required), `neighborhoods[]`, `county`, `utilityProviders[]` (same list as location) |
| sisterCompanies | linkItem[] | The Cooling Guy HVAC, The Water Guy Plumbing. Link only |
| logo, defaultOgImage | image (+alt) | Logo alt is the business name. The share image is 1200×630 |
| headerNav, footerNav, primaryCta | linkItem(s) | Navigation |
| **ctaBand** | callToAction | **New.** The site-wide closing band ("We're ready to work for you"). Templates use it; so does any CTA band section left without a heading |
| **valueProps** | featureItem[] | **New.** Shared "why us" cards ("No BS pricing", "Amazing Quality", "Client Satisfaction") |
| **capabilities** | featureItem[] | **New.** Shared "what we do" checklist ("Panel Upgrades" → its service, "+ More!") |
| titleSuffix, ga4MeasurementId, googleSiteVerification | string | SEO and tracking |

**Query:** `getSettings()` (also exported as `getSiteSettings()`, same memoized promise) returns everything, with references resolved:
- `founders` → `{name, role}`;
- `addresses[].locationSlug`;
- `serviceAreas` → `{name, slug, shortName, geo}`;
- `heroQuotes[].review` → Review;
- `valueProps[]` and `capabilities[]` with `service` → `{name, slug}`;
- `homeCity.image`.

### page

Standalone pages: `index` (home), about-us, our-team, careers, faq, contact-us, services, blog, commercial-electrician.

| Field | Type | Purpose |
|---|---|---|
| title | string | Breadcrumb label and title fallback |
| slug | slug | Path without the leading slash; `index` = `/`. Frozen |
| heading | string | **The page H1.** Matches the live H1 |
| intro | text | Meta description fallback |
| sections | pageSections | The page builder (§4). The production build (SITE_INDEXABLE=true) stops when a composed page has none: that is pre-redesign content (re-import the dataset first) |
| seo | seo | Meta title and description (frozen to the live values) |
| **updatedAt** | datetime | **New.** When the content last changed materially: the sitemap's `<lastmod>`. The migration stamps it when it changes the content materially (5% of the words, a heading or the FAQs, counted since the last date: `scripts/migrate/content-dates.mjs`); editors update it with real edits. Same field on service, location, serviceCategory and post |

**Query:** `getPage(slug)` returns the page with every section's references resolved and lists cleaned up (§5). `getPageSlugs()` returns all slugs.

### service (`/services/<slug>`)

| Field | Type | Purpose |
|---|---|---|
| name | string | H1 fallback, card title, link text |
| slug | slug | Frozen |
| category | ref serviceCategory | Residential or Commercial; breadcrumb |
| heading | string | Optional H1 override (empty on all 21 today, so the H1 is the name) |
| shortDescription | text | Lede under the H1, card text, meta description fallback |
| **quickAnswer** | text | **New.** The answer-first line of the "{Service}, the short version" block: what the service covers, 25–60 words, only what the body says, no prices (warns outside 25–60 words). Empty = a line about the business from Site settings |
| mainImage | image (+alt) | When it is one of the crew's job photos (no people), the hero shows it under the copper tint and the article shows it again in true colour halfway down, captioned "Our work: …" |
| body | richText | The article |
| **atAGlance** | glanceFact[] (`{label, value, detail}`) | **New.** Short facts for the "At a glance" block, e.g. Permits → "We pull the permit", with an optional supporting line (`detail`, round 5) such as "We schedule the inspection and make sure everything passes." Only confirmed facts |
| **signs** | string[] | **New.** "Signs you need this" checklist |
| priceRange | {low, high, note, **asOf**} | Typical price range. **New `asOf` (date)**: render "as of {month year}". Validation requires both prices and warns without a date. Feeds `AggregateOffer` only when low and high exist. Never rendered on the page (owner: no price modules; prices stay in FAQ answers and posts) |
| faqs | faqItem[] | Service-specific Q&As (inline). The page lists them, then the shared FAQs tagged with the service (price questions after the others, so the open first answer is never a price), then the General ones |
| relatedServices | ref service[] | "Related services". The query falls back to same-category services |
| relatedPosts | ref post[] | "Helpful guides". The query falls back to posts that reference this service; the page fills the block to three with posts supporting the service, then the most-read guides, so it is never empty |
| order | number | Listing order (lower first) |
| seo | seo | |

**Queries:**
- `getServices()` returns summaries in site order.
- `getService(slug)` returns the full document, adding `atAGlance`, `signs`, `priceRange.asOf`, and `reviews` (reviews tagged with this service, featured first, max 6).

### serviceCategory (`/services-categories/<slug>`)

| Field | Purpose |
|---|---|
| name, slug | "Residential" / "Commercial". The H1 is `heading ?? name` |
| heading | Optional H1 override |
| description | richText intro (empty today) |
| seo | |

**Query:** `getServiceCategories()` returns each category with its services.

### location (`/locations/<slug>`): a city page

Mesa is **not** a location (see `siteSettings.homeCity`). Never create a Mesa location: it would generate `/locations/mesa`, which must redirect to `/`.

| Field | Type | Purpose |
|---|---|---|
| name | string | Should be the bare city ("Gilbert"). Some still hold the full H1. Queries expose `shortName`, derived from `cityNameForSeo`, for chips, breadcrumbs and cards |
| slug | slug | Frozen. `scottsdale` is the Scottsdale GBP landing page |
| cityNameForSeo | string | "Gilbert, AZ". Used in the title template |
| heading | string | The H1 |
| description | text | Lede and meta description fallback |
| **cardBlurb** | text | **New.** One line for city tiles, e.g. "North Scottsdale, DC Ranch, McCormick Ranch, and Gainey Ranch." |
| mainImage | image (+alt) | Tile and hero image |
| body | richText | City copy |
| geo | geopoint | City center (areaServed) |
| county | string | |
| zipCodes, neighborhoods | string[] | Quick facts, from public sources only |
| utilityProviders | string[] | One of `SRP`, `APS`, `City of Mesa`, `TEP`, `ED3`. **New:** "City of Mesa" (Mesa's municipal electric utility). Only list utilities confirmed from a public source |
| permitNotes | richText | Local permit and inspection specifics |
| featuredServices | ref service[] | "Electrical services in {City}" |
| **nearbyLocations** | ref location[] | **New.** Neighboring cities for "Other areas we serve". Empty = list all other cities |
| faqs | faqItem[] | City Q&As. The migration writes two from the sourced local facts, word for word from `permitNotes`: "Who provides electric service in {City}?" (the utility paragraph) and "Who issues electrical permits in {City}?" (the permit office). The page shows them under "{City} electrical questions", then three shared ones (permits in Arizona, free estimates, hidden fees); `permitNotes` shows as a note under the glance only when no question already carries it |
| seo | seo | |

**Swap test:** no city block may be produced by substituting the city name into shared copy. Per-city uniqueness comes from per-city data, or the block is hidden.

**Query:** `getLocations()` returns all cities, each with:
- `shortName`, `cardBlurb`;
- `nearbyLocations` (LocationSummary[]);
- `reviews`: reviews tagged with the city, featured first, max 6.

### serviceLocation (service × city)

Not routed in this PR. Fields: service, location, heading, intro, mainImage, body, faqs, seo. Publish one only when it has unique local substance.

### post (`/blog-posts/<slug>`)

| Field | Type | Purpose |
|---|---|---|
| title | string | The H1 |
| slug | slug | Frozen |
| excerpt | text | Card text and meta description fallback |
| **quickAnswer** | text | **New.** A 40–60 word answer-first summary shown above the body. It must not repeat the title. The first `relatedServices` entry is linked right after it ("Need help? See our …"). Falls back to `excerpt` when empty. Warns outside 40–60 words |
| mainImage | image (+alt) | |
| body | richText | |
| category | ref postCategory | The blog topic page (`/posts-categories/<slug>`, noindex) and `articleSection`. Set on the six lighting posts (migration/content-data/cms-templates.json) |
| author | ref teamMember | Show a Person byline only when set (the default byline is the business) |
| reviewedBy | ref teamMember | "Reviewed by {name}, {role}" only when set |
| publishedAt | datetime | Visible date |
| updatedAt | datetime | Set only for material updates (the migration uses the rule above). Shown as "Updated …" and used for `dateModified` |
| featured | boolean | Promotes the post in "featured first" lists |
| relatedServices | ref service[] | The hub service pages the post supports. **The first one is the primary service** |
| faqs | faqItem[] | Post Q&As |
| seo | seo | |

**Queries:**
- `getPosts()` returns summaries, newest first.
- `getPost(slug)` adds:
  - `quickAnswer`;
  - `reviewedBy` with `{name, role, slug, credentials, photo}`;
  - `relatedPosts`: up to 3 other posts that share a related service, newest first.

### postCategory (`/posts-categories/<slug>`, noindex)

`name`, `slug`, `description`, `seo`. **Query:** `getPostCategories()` returns each category with its posts.

### teamMember

| Field | Purpose |
|---|---|
| name, slug | Display name; slug used for anchors on /our-team |
| role | "Owner", "Office Manager", … |
| photo | Portrait (+alt "{Name}, {role} at The Wire Guy Electric") |
| bio | richText |
| credentials, yearsExperience | Show only when supplied |
| sameAs | Profile URLs |
| showOnTeamPage, order | Inclusion and order in team lists |

**Query:** `getTeam()` returns members (now with `slug`).

### faq (shared questions)

| Field | Purpose |
|---|---|
| question | |
| answer | richText. Answer in the first sentence. Visible text and FAQPage JSON-LD both come from here |
| topic | One of `General`, `Pricing`, `Panels`, `EV chargers`, `Lighting`, `Troubleshooting`, `Safety`, `Permits`, `Services`, `Company`, `Hiring`, `Commercial`. **New:** General, Services, Hiring (the /faq groups). FAQ sections can pull "every FAQ with topic X" |
| services | Related services |
| order | Sort order |

**Query:** `getFaqs(topic?)`.

### review

Real customer reviews, copied with attribution. Rendered as text, never as review markup.

| Field | Purpose |
|---|---|
| authorName | As published, e.g. "Jenny D." |
| rating | 1–5 |
| text | Verbatim |
| date | |
| source, sourceUrl | "Google" and a link to the review |
| location | City, for "What {City} customers say" |
| service | Service, for service pages |
| featured | Put first in lists |

The `Review` shape the queries return flattens the tags: `location` is the bare city name ("Gilbert"), `locationSlug`, `service` (service name) and `serviceSlug`.

**Queries:**
- `getReviews({location?, service?, featuredOnly?, limit?})`: `location` and `service` accept an `_id` or a slug. Featured first, then newest.

### project (real jobs)

| Field | Purpose |
|---|---|
| title, slug | |
| location | City |
| neighborhood | |
| services | |
| completedAt | |
| summary | |
| mainImage | Alt **required** |
| gallery | Images with alt **required** and an optional caption |
| body | |
| review | The customer's review of this job |

**Query:** `getProjects({location?, service?, limit?})` returns newest first; `location` and `service` accept an `_id` or a slug. Use it for "Recent jobs in {City}" and similar blocks (hidden until projects exist).

### jobOpening

`title`, `description` (richText), `employmentType`, `datePosted`, `validThrough`, `baseSalary {min, max, unit}`, `isOpen`. Each open job is visible on /careers **and** emitted as JobPosting. **Query:** `getOpenJobs()`.

### redirect

`source`, `destination`, `permanent`, `isEnabled`, `note`. Applied at build time as one-hop 301s. Add one whenever a live URL changes.

---

## 3. Object types

| Type | Fields | Used for |
|---|---|---|
| seo | title, description, ogImage (+alt, warning), noIndex | Meta tags (frozen to the live values) |
| richText | Blocks (normal, h2–h6, blockquote; bullet/numbered lists; bold/italic/sup/sub/underline; `link` {href, openInNewTab}), `figure` (image + alt + caption), `table`, `videoEmbed`, `callToAction` | Bodies of services, cities, posts, FAQ answers |
| **textWithMentions** | Paragraph blocks with bold/italic, `link` {href} and **`teamMemberMention` {member → teamMember}** | Team intro body. Mentioned names render with the person's photo and link to /our-team |
| callToAction | heading, text, label, href, **statusText** (new) | CTA bands, Site settings → CTA band, inline CTAs |
| linkItem | label, href | Buttons and links |
| **featureItem** | title, text, icon, service (ref), link (linkItem) | Value props and capability checklists. When `service` is set, the title links to that service |
| **reviewSnippet** | text, review (ref), rating | Short hero quotes from real reviews |
| faqItem | question, answer | Inline Q&As on services, cities and posts |
| postalAddress | label, streetAddress, addressLocality, addressRegion, postalCode, geo, googleMapsUrl, **mapLinkText** (new), gbpName, locationPage, phone, appointmentOnly, footerOnly | Offices in Site settings. `mapLinkText` is the footer link's wording to the office's Google Business Profile, verbatim from the live footer ("8555 E Raintree Dr, Unit 117 Scottsdale, AZ 85260 - Scottsdale Location"); empty = the formatted address. `footerOnly` (the Mesa home address): footer and structured data only |
| openingHours | days[], opens, closes | Hours in Site settings |
| table | caption, rows[{cells[]}], hasHeaderRow | Rich-text tables |
| videoEmbed | url, title | YouTube or Vimeo facade |

**Icon tokens:** `bolt`, `bulb`, `plug`, `panel`, `evCharger`, `wrench`, `check`, `shield`, `badge`, `star`, `dollar`, `clock`, `calendar`, `clipboard`, `document`, `home`, `building`, `users`, `heart`, `thumbsUp`, `phone`, `pin`.

---

## 4. Page-builder sections (`page.sections`)

There are 21 section types: the 12 original ones (extended, nothing renamed) and 9 new ones. In Studio they are grouped:
- **Intro:** hero, trust strip, team intro.
- **Copy:** text, image + text, features, highlights, process steps, quote.
- **Lists:** services, service areas, blog posts, team, photo gallery, price guide, job openings.
- **Proof:** reviews, FAQs.
- **Contact:** contact form, office locations, CTA band.

Studio blocks publishing a page with more than one hero, and warns when the hero isn't first.

Each entry lists the stored fields, then **Returns:** what `getPage()` gives the renderer (type names from `web/src/lib/types.ts`).

**Shared conventions:**
- `eyebrow` is a short label rendered as a `<p>` above the heading.
- `headingAccent` is words of the heading to highlight. Studio warns if they don't appear in the heading.
- `cta` is a linkItem button.
- A city reference on a section (reviews filter, gallery photo) is returned as `{name, slug}` where `name` is the bare city ("Gilbert"), not the stored `location.name`.

### heroSection (Hero): `HeroSection`

The top of the page. **It renders the page H1 from `page.heading`; it has no heading of its own.**

| Field | Purpose |
|---|---|
| eyebrow | e.g. "established in 2017" (outside the H1) |
| headingAccent | **New.** Words of `page.heading` to highlight, e.g. "top choice" |
| text | The paragraph under the H1 |
| image | Photo, alt required |
| primaryCta, **secondaryCta** | Buttons. A button labelled "…Free Estimate…" always goes to the estimate page (`/estimate`, owner rule), whatever its stored href |
| **ctaNotes** | **New (round 5).** One or two short phrases under the buttons, e.g. "Free estimates and flat-rate pricing." and "No pressure and no obligation." (string[]) |
| showPhone | Adds a Call button (number from Site settings) |
| **trustLine** | **New.** One credentials line, e.g. "Licensed, bonded, and insured · ROC #365306" |
| showTrustBar | Show the standard trust strip with the hero |
| **reviewSnippets** | **New.** reviewSnippet[], up to 3 real quotes. Empty = none |
| heading | **Deprecated and ignored** (hidden unless it holds old data) |

**Returns:** `reviewSnippets[]` (always an array) with `review` resolved, and the image.

### richTextSection (Text)

`heading`, `body` (richText).

### mediaTextSection (Image + text)

`heading`, `body`, `image` (alt required), `imagePosition` (left/right, presentational), `cta`.

### servicesSection (Services list): `ServicesSection`

| Field | Purpose |
|---|---|
| **eyebrow**, heading, **headingAccent**, intro | |
| **layout** | `featured` (a few large cards), `grid` (compact directory) or `grouped` (every card under its category heading; replaces the hidden tabs on /services) |
| category | Only services in this category (ignored when services are picked) |
| services | Picked services, in order. Each entry is either a plain **reference** or a **`serviceCard`** `{service, title?, text?, image?}`, which keeps a card's own copy (e.g. "EV Chargers" / "We install or troubleshoot issues with all EV chargers…") while still linking to the service |
| **cta** | e.g. "View All Services" → /services |

**Returns:**
- `services: ServiceCard[]`, from the picked cards, else the category's services, else every service in site order. Each card is the service summary plus display `title` / `text` / `image` (overrides applied). Deleted services are dropped.
- For `grouped`: `groups: [{name, slug, heading, description, services}]`, in order of first appearance.

**Render:** card links use the service name, or append visually hidden text to "Read More".

### locationsSection (Service areas list): `LocationsSection`

| Field | Purpose |
|---|---|
| **eyebrow**, heading, **headingAccent**, intro | |
| **locations** | Picked cities in order. Empty = all cities. (The design lists them in the valley map's route order) |
| **includeHomeCity** | Default on. Lists Mesa first, linking to `/`, from `siteSettings.homeCity` |

**Returns:**
- `locations: LocationSummary[]` (`shortName`, `cardBlurb`, `neighborhoods`, `geo`, `mainImage`, …);
- `homeCity` (or null).

### reviewsSection (Reviews): `ReviewsSection`

| Field | Purpose |
|---|---|
| **eyebrow**, heading, **headingAccent** (round 5), **intro** | |
| reviews | Picked reviews |
| **location**, **service** | Filters used when nothing is picked |
| **limit** | Default 6; 0 = all. Only limits the automatic list: picked reviews are all shown |
| **cta** | e.g. "Get a Free Estimate Now" → /contact-us |

**Returns:** `reviews: Review[]`: every picked review in order, else the filtered reviews (featured first, then newest) with the limit applied. Empty = hide the section. Show the aggregate rating from Site settings as text if wanted; no review markup.

### faqSection (FAQs): `FaqSection`

| Field | Purpose |
|---|---|
| **eyebrow**, heading, **intro**, **image** | |
| faqs | Picked shared FAQs |
| topic | Or every FAQ with this topic |
| **groups** | `faqGroup[]` `{heading, faqs?, topic?}`: headed groups after the main list, e.g. the 5 topic groups on /faq. Group headings are one level below the section heading |

**Returns:** `faqs: FaqItem[]` and `groups[].faqs`, all resolved; deleted FAQs are dropped.

**Render:** native `<details>`/`<summary>` with answers in the HTML. **Schema:** one FAQPage per page from `collectPageFaqs(page)`.

### teamSection (Team): `TeamSection`

| Field | Purpose |
|---|---|
| **eyebrow**, heading, intro | |
| **members** | Picked people. Empty = everyone with "show on team page", in order |
| **showBios** | Default on |
| **cta** | e.g. "Our Team" → /our-team |

**Returns:** `members: TeamMember[]` (name, role, slug, photo, bio, credentials, yearsExperience). Use them for Person JSON-LD on /our-team.

### postsSection (Blog posts): `PostsSection`

| Field | Purpose |
|---|---|
| **eyebrow**, heading, **intro** | |
| **posts** | Picked posts. Each entry is a plain **reference** or a **`postCard`** `{post, label?, coverWords?, image?}` (round 5): the card's own topic pill, a few words set large on the cover ("Heat and breakers") and a real job photo for the cover (alt required). The post page keeps its own main image |
| **category** | Only this category (ignored when posts are picked) |
| **featuredFirst** | Featured posts ahead of newer ones |
| limit | Default 3; **0 = all** (/blog lists every post). Only limits the automatic list: picked posts are all shown |
| **layout** | **New (page conversions).** `cards` (default): one row of guide cards. `byService`: every post under the service it supports (its first related service, `post.relatedServices[0]`), each group linking to that service page, largest topics first: the /blog archive. Posts without a related service close the list under "More guides" |
| **cta** | |

**Returns:** `posts: PostCard[]`: every picked post in order (with `label`, `coverWords` and `cover` from a `postCard`), else the newest posts with the limit applied. Every post card (and every `PostSummary` from `getPosts()`) carries **`service`** `{name, slug}`: its first related service, or null.

### jobsSection (Job openings): `JobsSection`

`heading`, **`intro`** (new). **Returns:** `jobs: JobOpening[]` (open jobs, newest first). Hide the section when empty. Visible jobs must equal the JobPosting nodes: the template shows, and marks up, only jobs whose `validThrough` hasn't passed at build time (`web/src/lib/jobs.ts` `currentJobs`).

### contactSection (Contact form): `ContactSection`

| Field | Purpose |
|---|---|
| **eyebrow**, heading, text | e.g. "get in touch" / "Reach out to us today…" |
| **detailsHeading** | e.g. "We're Located in Mesa, Arizona and serve the entire Phoenix Valley" |
| **contactDetails** | Which Site settings details to show beside the form: `phone`, `email`, `offices`, `hours` |
| formType | `estimate` or `careers` |
| **formHeading** | "Start a request" / "Apply Now" |
| **submitLabel** | "Submit Request" |
| **successMessage** | Shown after submit. Only promise what the office does |

Values come from `getSettings()`. Form fields and labels are code.

### ctaSection (Call to action band): `CtaSection`

`cta` (callToAction). **Leave its heading empty to use `siteSettings.ctaBand`.**

**Returns:** `cta` = the section's CTA if it has a heading, else the site-wide band (or null → render nothing).

Render the heading as H2. Add the phone number and hours from Site settings. `statusText` is the short line near the button ("Free estimates available").

### trustBarSection (Trust strip, new): `TrustBarSection`

A row of short, verifiable facts.

`items: trustItem[]`, each `{fact, value, label, href, icon}`. `fact` is one of:
- `custom`: the value/label as typed, e.g. "2-year" + "warranty on services we provide";
- `reviews`: rating, count and reviews link from Site settings;
- `license`: "ROC #365306" + ROC lookup link;
- `founded`: "2017".

For facts from Site settings, `label` is optional wording beside the value.

**Leave `items` empty for the standard strip:** rating, license, year founded, then `siteSettings.badges`.

**Render:** call `resolveTrustItems(section.items, settings)`. It returns display-ready `ResolvedTrustItem[]` (value, label, href, icon, plus rating, reviewCount and source for reviews) and drops facts whose source value is missing. The same helper serves the template-level trust strip on service and city pages: call it with no items.

### featureGridSection (Features, new): `FeatureGridSection`

Reasons to choose us, or a checklist of what we do.

| Field | Purpose |
|---|---|
| eyebrow, heading, headingAccent, intro | e.g. "Electrician solutions tailored to your needs" (accent "your needs") |
| style | `cards` (title, text, optional link) or `checklist` (short items with a check mark). The one presentational switch |
| **image** | **Round 5.** Optional background photo (alt required), set behind the checklist in a warm tint. No people in it: words sit on top |
| siteList | Optional: `valueProps` or `capabilities`. Uses the shared list from Site settings instead of `items`, so copy stays identical everywhere |
| items | featureItem[] |
| cta | |

**Returns:** `items: FeatureItem[]`: the shared list when `siteList` is set, else the section's items. A `service` on an item is resolved to `{name, slug}`; link the title to `/services/<slug>`.

### teamIntroSection (Team intro, new): `TeamIntroSection`

A paragraph introducing the people, e.g. "At The Wire Guy Electric, Steven leads… Cody… Emma…".

| Field | Purpose |
|---|---|
| eyebrow, **heading**, **headingAccent** | Heading fields are round 5, e.g. "The family behind the trucks." |
| **showSummary** | **Round 5.** Start with one answer-first sentence about the business, written from Site settings at render time (name, ROC licence, home city, year founded), so nothing is typed twice |
| body | textWithMentions. Mark each name with a **Team member** annotation |
| **image** | **Round 5.** One real photo of the crew at work (alt required, optional caption shown on the photo). Not a portrait grid |
| people | Optional photo row. Empty = the people mentioned |
| cta | e.g. "About Us" → /about-us |
| **secondaryCta** | **Round 5.** A text link beside the button, e.g. "Meet the team" → /our-team |

**Returns:**
- `body` with each `teamMemberMention` mark definition carrying a resolved `member` `{_id, name, role, slug, photo}`. Render the marked text as a link to /our-team with the person's avatar.
- `people`: picked, else the mentioned people, de-duplicated in order.

### quoteSection (Quote, new): `QuoteSection`

A statement from the team, e.g. the owner's quote on /our-team.

`eyebrow` ("Since 2017"), `heading` (H2), `subheading` (H3), `quote` (required), `person` (ref teamMember: name, role, photo shown), **`review`** (round 5: ref review, instead of a person: a customer's words pulled out of their review; the quote must be an excerpt, word for word, which Studio checks; the reviewer's name, the review date and service and the link to our reviews are shown), `image` (alt required).

**Returns:** `person` (TeamMemberSummary) and `review` (Review), resolved.

### gallerySection (Photo gallery, new): `GallerySection`

Real photos of our own work only (no stock). Replaces the Elfsight feed.

| Field | Purpose |
|---|---|
| eyebrow, heading, headingAccent, intro | e.g. "Recent photos of our work" |
| images | `galleryImage[]`: an image with **alt (required)**, caption, optional `service` and `location` (city) refs |
| projects | Picked projects (main photo, title, city) |
| cta | e.g. Instagram profile |

**Returns:**
- `images: GalleryImage[]`, with service and location resolved to `{name, slug}`;
- `projects: ProjectSummary[]`.

Both empty = hide.

### officeLocationsSection (Office locations, new): `OfficeLocationsSection`

Office cards from `siteSettings.addresses`.

`eyebrow`, `heading`, `intro`, `offices` (string[]: the **city** of each office to show, exactly as in Site settings, e.g. `Scottsdale`; empty = all offices). Studio checks the cities exist.

**Returns:** `offices: PostalAddress[]`, including `gbpName`, `appointmentOnly`, `googleMapsUrl`, `geo`, `phone` and `locationSlug`.

**Render:**
- Each office as `<address>`.
- Label the Scottsdale office "The Wire Guy Electric of Scottsdale (by appointment)".
- Use the main phone when `phone` is empty.
- Show hours for an office only if they match its Google Business Profile.

### processStepsSection (Process steps, new): `ProcessStepsSection`

How working with us goes. Only steps the business really follows, from live copy: call or send the form, free estimate, flat-rate quote (and, on service and city pages, permit and inspection). Never a warranty tag (owner, round 2), and no permit step on the homepage (owner, round 5).

`eyebrow`, `heading`, **`headingAccent`** (round 5), `intro`, `steps: processStep[]` `{title, text, icon, showContact}` (Studio warns under 2), `cta`. Render as an ordered list. **`showContact`** (round 5) adds the phone number and office hours from Site settings and a link to the estimate page under that step, so no step stores its own copy of the NAP.

### priceGuideSection (Price guide, new): `PriceGuideSection`

Typical published price ranges as a crawlable table.

| Field | Purpose |
|---|---|
| heading, intro | |
| rows | `priceRow[]` `{label, low, high, unit, note, service, guide}`. Leave low/high empty to use the linked service's `priceRange` |
| disclaimer | e.g. that ranges are typical and estimates are free |
| asOf | **Required** date; render "Prices as of {month year}" |

**Returns:** `rows: PriceRow[]`, with `low`/`high` coalesced from the service, `service` → `{name, slug}` and `guide` → `{title, slug}`. **Skip rows where low or high is still null.** Never invent a price.

### highlightsSection (Highlights, new): `HighlightsSection`

A short checklist with a photo and a side note, e.g. "We treat you like family" with the ROC column on /about-us, or "Why Work With Us?" on /careers.

| Field | Purpose |
|---|---|
| eyebrow, heading | |
| checklist | `highlightItem[]` `{lead, text}`. `lead` is the bold opening ("Consistent, Reliable Work"), `text` the rest |
| cta | |
| image | Alt required |
| asideHeading, asideBody | Side note (asideBody is richText) |

---

## 5. What the queries do for you

**`getPage(slug)`** resolves every reference in every section (see "Returns" above). It also post-processes the result, because GROQ can't do these steps:
- applies `limit` to automatic review lists (default 6) and post lists (default 3; 0 = all); picked items are never cut;
- drops dangling references (deleted documents);
- de-duplicates mentioned people;
- builds `groups` for grouped service lists.

Every list a section renders is always an array.

**Helpers in `web/src/lib/queries.ts`:**

| Export | Returns |
|---|---|
| `getSettings()`, `getSiteSettings()` | SiteSettings (memoized; the second is an alias) |
| `getPage(slug)`, `getPageSlugs()` | PageDoc with typed `sections: PageSection[]` |
| `collectPageFaqs(page)` | Every FAQ shown on the page, de-duplicated. Build the one FAQPage node from it |
| `resolveTrustItems(items, settings)` | Display-ready trust facts (empty items = standard strip) |
| `getServices()`, `getService(slug)`, `getServiceCategories()` | Services |
| `getLocations()` | Cities (memoized) |
| `getPosts()`, `getPost(slug)`, `getPostCategories()` | Blog |
| `getPostIndex()` | Every post with its services' slugs and plain text (memoized): topics, covers and reading time on the CMS templates |
| `getTeam()`, `getFaqs(topic?)`, `getOpenJobs()` | Team, FAQs, jobs |
| `getServiceFaqs(serviceId)` | The FAQs tagged with a service (`faq.services`), for its service page |
| `getReviews({location?, service?, featuredOnly?, limit?})` | Reviews, featured first. `location` and `service` take an `_id` or a slug |
| `getProjects({location?, service?, limit?})` | Projects, newest first |

**Types:**
- `PageSection` is a discriminated union on `_type`.
- `SectionOf<'heroSection'>` picks one member.
- `PageSectionType` lists every `_type`.

---

## 6. Writing content from the migration (content modules)

The content modules in `scripts/migrate/content/*.mjs` write NDJSON directly, so they must use the schema's exact `_type` names. Sanity rejects unknown array members in Studio.

**Every object in an array needs a unique `_key`.**

| Where | `_type` of each array member |
|---|---|
| `page.sections[]` | `heroSection`, `richTextSection`, `mediaTextSection`, `servicesSection`, `locationsSection`, `reviewsSection`, `faqSection`, `teamSection`, `postsSection`, `jobsSection`, `contactSection`, `ctaSection`, `trustBarSection`, `featureGridSection`, `teamIntroSection`, `quoteSection`, `gallerySection`, `officeLocationsSection`, `processStepsSection`, `priceGuideSection`, `highlightsSection` |
| `heroSection.reviewSnippets[]`, `siteSettings.heroQuotes[]` | `reviewSnippet` |
| `featureGridSection.items[]`, `siteSettings.valueProps[]`, `siteSettings.capabilities[]` | `featureItem` |
| `servicesSection.services[]` | `reference` (to service) or `serviceCard` |
| `faqSection.groups[]` | `faqGroup` |
| `trustBarSection.items[]` | `trustItem` |
| `gallerySection.images[]` | `galleryImage` (an image: `asset` or `_sanityAsset: "image@<url>"`, plus `alt`) |
| `processStepsSection.steps[]` | `processStep` |
| `postsSection.posts[]` | `reference` (to post) or `postCard` |
| `priceGuideSection.rows[]` | `priceRow` |
| `highlightsSection.checklist[]` | `highlightItem` |
| `service.atAGlance[]` | `glanceFact` |
| `teamIntroSection.body[]` | `block`. Mentions are `markDefs` entries `{_key, _type: "teamMemberMention", member: {_type: "reference", _ref}}`, referenced from the span's `marks` |
| Reference arrays (`faqs`, `members`, `locations`, `posts`, `reviews`, `projects`, `people`, `nearbyLocations`, …) | `{_type: "reference", _ref, _key}` |
| Single objects | `callToAction` (`cta`, `ctaBand`), `linkItem` (`primaryCta`, `secondaryCta`, `cta`, `link`) |

**Example** (homepage capabilities, shared via Site settings):

```js
const find = (type, slug) => ctx.docs.find((d) => d._type === type && d.slug?.current === slug)
const settings = ctx.docs.find((d) => d._id === 'siteSettings')
settings.capabilities = [
  {_type: 'featureItem', _key: 'panels', title: 'Panel Upgrades', service: {_type: 'reference', _ref: find('service', 'panels')._id}},
  {_type: 'featureItem', _key: 'more', title: '+ More!'},
]
const page = find('page', 'index')
page.sections ??= []
page.sections.push({_type: 'featureGridSection', _key: 'capabilities', heading: 'Electrician solutions tailored to your needs', headingAccent: 'your needs', style: 'checklist', siteList: 'capabilities'})
```

Find documents in `ctx.docs` by `_type` and slug (as above) rather than guessing ids.

---

## 7. Studio checks (for editors)

**Errors block publishing:**
- Missing alt text on an image in a section, a project, a gallery, or Site settings → Home city.
- A URL slug that isn't lowercase letters, numbers and single hyphens.
- More than one hero on a page.
- A price guide row without both prices (unless it links a service), or with "To" below "From". A price guide without its "Prices checked on" date.
- A service price range with only one of low/high, or high below low.
- Empty required parts of a section item: a trust fact with neither value nor label, a highlight point with neither lead nor text, a quote without its text, a team intro without text, a process step or FAQ group without a title, a service card without a service, a hero quote without its words.
- An office city that isn't in Site settings → Addresses.

**Warnings allow publishing, but read them:**
- Changing the slug of a live page without a redirect from the old URL.
- A hero that isn't the first section.
- Highlighted words that don't appear in the heading.
- A Features section with no items and no shared list (it won't show).
- A quick answer outside 40–60 words.
- A service price range without the date it was checked.
- A process with fewer than two steps.
- More than four hero quotes, or a quote over ~140 characters.
- Missing alt text on document main images, team photos, the logo and share images.
- Meta titles and descriptions outside the recommended lengths.

Schema note: Sanity takes a check's level (error or warning) from the rule, not from what a custom validator returns. To make a custom check a warning, chain `.warning()` on the rule. When a field needs both, use an array of rules.
