# Design system

The site's design language, as built in `web/src`: the approved round-5 redesign ("full send it"), ported from the mockups into Astro components. Read this before building or converting a page. Everything here is in the repo; the mockups and their rationale (round 5, `redesign/round5/final` in the design scratchpad) are the reference for look and behaviour.

**Contents:** [Rules](#1-rules-every-page-follows) · [Files](#2-where-things-live) · [Tokens](#3-tokens) · [CSS per page type](#4-css-per-page-type) · [Layout](#5-the-layout-sitelayoutastro) · [Components](#6-components) · [Images](#7-images) · [Rich text](#8-rich-text) · [Site script and its hooks](#9-the-site-script-and-its-hooks) · [Valley map](#10-the-valley-map) · [Navigation](#11-navigation-and-the-chrome) · [Checks](#12-checks-before-you-commit) · [Inner-page sections](#13-inner-page-sections-the-page-builder-pages)

---

## 1. Rules every page follows

These come from the owner (all rounds) and the SEO spec. They are not style preferences.

**Content and SEO**
- **One H1, from the document** (`page.heading`, `service.heading ?? service.name`, `location.heading`, `post.title`), plain text, no `<br>`, no eyebrow inside it, never inside `<header>`. Section headings are H2; inside a section, H3. (`docs/CONTENT_MODEL.md` §1.)
- **Keep every page's `title`, `description`, `path` and `crumbs` expressions exactly as the legacy route has them.** Only the body changes. `scripts/seo/parity.mjs` must stay at 0 errors.
- **Word counts and internal links never drop** (floors in `migration/seo-baseline.json` and the redesign spec). The `<header>`, `<nav>` and `<footer>` don't count toward words: main content must carry them.
- **Empty means nothing.** A section whose data is empty renders nothing (no heading, no wrapper). Never fill a gap with invented copy, reviews, prices, stats or neighbourhoods.
- **All text is HTML text** in the initial HTML (no text in images, no JS-only content, nothing hidden in tabs). Text on photos is real text over a feathered tint.
- **NAP only from Site settings** (`lib/site.ts` helpers). Never hard-code a phone number, address, hours, rating or licence number in a component.
- **The Mesa street address appears only in the footer** (and in the JSON-LD). Never in office cards, contact blocks, maps, directions links or body copy. Addresses with `footerOnly` must never be rendered anywhere else.
- **No prices on the homepage and no price modules anywhere.** `priceGuideSection` is not rendered. Prices stay only where the business already published them (FAQ answers, blog posts).
- **Minimise permit talk on the homepage** (owner): no "Permits handled" process step, no permit FAQ, no permit guide card, no permit-themed heading there. Permit content stays on service, city, FAQ and blog pages.
- **Every "Free Estimate" link goes to `/estimate`** (`ESTIMATE_PATH`), or to `#estimate` when the form is on the page.
- One `FAQPage` per page, built from `collectPageFaqs(page)` with `faqNode()`, and only for questions that are visible. No `Review` / `AggregateRating` markup.
- Banned: an "office opens" modal, a "For true emergencies…" line, a "2-year warranty" tag, counting areas ("we serve 11 cities"), flat black backgrounds, stock photos, team portrait cards on the homepage, cropped/faded/covered faces at any width (390–2560).

**Craft**
- Use the tokens. No raw colours, radii or shadows in new CSS except the established tints (`rgb(var(--scrim) / .x)`, the bone/paper glass values already used in the files).
- Motion is enhancement only: nothing starts hidden unless `html.motion` is set (and, for scroll reveals, the browser supports scroll timelines), nothing above the fold reveals, and `prefers-reduced-motion` shows everything at once. Animate `transform` and `opacity` only.
- Every image has `width`/`height`; only the LCP image is eager with `fetchpriority="high"`.
- WCAG 2.2 AA: text over photos measured at the worst pixel, visible focus everywhere (`:focus-visible` ring), targets ≥ 24 px (primary actions ≥ 44 px), links in body copy underlined, every new-tab link says so (`ExternalLink`).
- Adjacent inline elements that carry words get an explicit `{' '}` between them (Astro drops whitespace that contains a newline), so crawlers and copy-paste never glue words ("amMon").

---

## 2. Where things live

```
web/src/
  styles/          tokens.css, core.css (every page), home.css, inner.css, atlas.css (page-type layers)
  assets/fonts/    Red Hat Display + Red Hat Text, latin subset woff2 (hashed by Vite)
  layouts/         SiteLayout.astro (the new design)   WebflowLayout.astro (legacy port, until every route is converted)
  components/
    Seo.astro      every SEO <head> tag (unchanged from the port)
    PortableText.astro
    site/          the chrome: SiteHeader, SiteFooter, CallBar, HeadGate, SvgSprite, Logo
    ui/            atoms: Button, TextLink, ExternalLink, Eyebrow, SectionHeader, Accent, Stars, RatingLine, ScoreBlock, RocLink,
                   OfficeStatus, Bulb, MiniBulb, LitBulb, Breadcrumbs, SanityImage, StaticPicture, CtaButtons
    sections/      SectionRenderer (page.sections → components) and the sections: HeroHome, TeamIntro, ValueCards,
                   Capabilities, ServicesMosaic, PullQuote, ProcessSteps, Gallery, GuidesBlock, EstimateForm, CtaBand,
                   ReviewsCarousel, ReviewsStatic, ReviewCard, Valley, FaqList, FaqBlock, GuideCard
  scripts/         site.ts (entry) + site/*.ts (header, motion, bulb, valley, reviews, forms, video, util)
  middleware.ts    a line break after every block-level closing tag of every HTML page (see §12)
  lib/             queries, types, schema, seo (unchanged roles) + image, site, nav, cities, hours, valley, bulb,
                   portable-text, links, brand-photos, format, sections (the renderer's plan), hero (the hero photo's renditions)
  data/            relief.json (valley map), legacy-images.json (Webflow URL → Sanity asset), webflow-mirror.json
web/public/img/    logo renditions, relief renditions, sister-brand logos, fleet poster enlargements
```

`web/src/legacy`, `lib/legacy.ts`, `layouts/WebflowLayout.astro`, `scripts/webflow-lite.ts` and `public/wf/css` belong to the Webflow port and go away once the last route is converted. `public/wf/a` (the mirror of Webflow's files) stays: `lib/image.ts` falls back to it.

---

## 3. Tokens

All in `styles/tokens.css` (custom properties on `:root`). The contrast ledger at the top of the file lists every text/background pair with its ratio.

| Group | Tokens |
|---|---|
| Surfaces | `--bone` #F7F3EC (page), `--paper` #FDFBF7 (cards, forms), `--white`, `--sand` #EFE8DC and `--sand-2` (alternating sections, footer), `--wash` #F5E7DD (copper wash, reviews), `--cream` #FFF4EC, `--line`, `--line-strong`, `--field-line` |
| Ink | `--ink` #0F2A35 (headings), `--text` #1D3039 (body), `--muted` #53646B (secondary, ≥ 4.5:1 on every surface), `--dim` (large text only), `--scrim` (RGB triplet for photo tints: `rgb(var(--scrim) / .8)`) |
| Copper | `--copper` #AA502E (brand: buttons, accents), `--copper-700` #8E4024 (copper text and links), `--copper-800`, `--copper-900`, `--copper-300`, `--glow` #FFE2B8 (lit bulb, light text on copper), `--grad-copper`, `--grad-copper-text` |
| Signals | `--live` (office open), `--off` (closed), `--error` |
| Type | `--font-display` (Red Hat Display, headings), `--font-text` (Red Hat Text, body); sizes `--fs-display` 40→116, `--fs-h2` 34→72, `--fs-h3`, `--fs-stand` 20→32 (standfirsts), `--fs-lede`, `--fs-body` 17 px, `--fs-small`, `--fs-meta`; `--measure` |
| Glyphs (CSS masks) | `--bulb-mark`, `--stars5`, `--arrow`, `--ext`, `--phone`, `--pin`, `--chev` |
| Space | `--section-y` (80→168), `--gutter` (20→96), `--max` 1560, `--pad-x` |
| Header | `--hdr-h`, `--hdr-c` (condensed height), `--logo-h`, `--logo-k`, `--glass-k` (per breakpoint), `--callbar-h` 64 |
| Shape, depth | `--r-sm` 10 · `--r-md` 16 · `--r-lg` 22 · `--r-xl` 30 · `--r-pill`; `--shadow-1/2/3`, `--glass` |
| Motion | `--ease`, `--ease-out`, `--ease-draw` |

Fonts: `tokens.css` declares the two variable woff2 files (relative URLs, so Vite fingerprints them) and metric-matched local fallbacks (`RHD Fallback`, `RHT Fallback`) so line breaks don't move while they load (no CLS). `SiteLayout` preloads the display face only (it sets the H1).

**Type in practice:** `.display` (the biggest editorial H2s and page H1s), `.h2` (section H2s), plain `h3`. Accent words: `<span class="accent">` (copper). Numerals that matter (phone, 5.0): `.tnum`. Never `background-clip: text` on numerals (the 5.0 clipping bug); the big 5.0 is solid `--copper-700` with line-height 1.

---

## 4. CSS per page type

Vite bundles each page's imports into cached, fingerprinted stylesheets (shared chunks are reused across pages).

| File | Ships on | Holds |
|---|---|---|
| `tokens.css` + `core.css` | every page (imported by `SiteLayout`) | base, type, buttons, links, kicker, status, rating, the header (both tiers, dropdowns, menu sheet), section heads, tiles, review cards and the score block, FAQ (`details`), guide cards, the estimate band and form, the footer, the call bar, reveals |
| `home.css` | the homepage | the review lanes and dialog (moved out of core), the title-card hero, "who we are", the services mosaic, the valley sky (fleet poster), gallery and the rest of the homepage sections |
| `inner.css` | every other page | the breadcrumb and static reviews (moved out of core), photo heroes (`.ihero`), trust card, at-a-glance facts, service cards, the long-form article and contact card, `.prose` (rich text, incl. tables, video, CTA blocks), warning signs, the /estimate hero and steps, the 404 and link hub (`.hub`) |
| `atlas.css` | any page with `<Valley>` (imported by the component) | the relief map, wire, lights, labels, index panel, callout and their motion |

**How a page imports them:** the layout first, then the page-type layer, then section components (CSS order follows import order):

```astro
---
import SiteLayout from '../layouts/SiteLayout.astro'
import '../styles/inner.css'            // or '../styles/home.css' on the homepage
import Valley from '../components/sections/Valley.astro'   // brings atlas.css after the layer
---
```

Page-specific styles that don't belong to a reusable pattern go at the end of the layer file under a heading comment, the way the 404 block does. Keep the budget in mind (the spec asks for about 15 KB brotli per page). Measured on this build: tokens + core 11.0 KB, `inner.css` 5.4 KB, `home.css` 7.7 KB, `atlas.css` 4.0 KB, so an inner page ships about 16.4 KB (20.4 KB with the map) and the homepage about 22.6 KB, as in the mockups (open question 6 of the round-5 rationale). The homepage build ships two files: the shared core chunk (11.0 KB) and its own (`home.css` + `atlas.css`, 10.9 KB), 21.9 KB in all, cached per page type.

---

## 5. The layout: `SiteLayout.astro`

```astro
<SiteLayout meta={meta} schema={[webPageNode({...}), faqNode(path, faqs)]} bodyClass="inner" current="/services">
  <Fragment slot="head"><link rel="preload" as="image" {...preload} fetchpriority="high" /></Fragment>
  ...sections...
</SiteLayout>
```

| Prop | Type | What it does |
|---|---|---|
| `meta` | `PageMeta` (`lib/seo.ts`) | title, description, path, ogImage, noIndex, breadcrumbs, published/modified times. Passed to `Seo.astro` unchanged |
| `schema` | JSON-LD nodes | merged into the one `@graph` after `businessNode` (both offices, full NAP incl. the Mesa street address) and `websiteNode`; `breadcrumbNode` is added from `meta.breadcrumbs` |
| `bodyClass` | string | `inner` on inner pages (plus a page class such as `page-est`, `page-404`); `over` when the header sits over a full-bleed hero photo (the homepage): the header glass is then transparent until the page scrolls and `main` gets no top padding |
| `current` | path | marks the current link (`aria-current`) and puts the copper wire under its section (default `meta.path`; Gilbert → Locations, Panels → Services) |
| `callbarEstimateHref` | string | the call bar's Free Estimate target (`#estimate` on /estimate) |
| slot `head` | | extra `<head>` tags (an LCP preload) |

It renders: the head gate (`HeadGate`: `html.js`, `html.motion`, `html.oo`/`html.oc`/`html.oc-far` before first paint), `Seo`, the font preload, icons, `theme-color`, GA4 (events queue at once; `gtag.js` loads after the page is idle or on first interaction), then the sprite, the header, `<main id="main">`, the footer, the call bar and the site script.

Without `bodyClass="over"`, `main` is padded by the header height, so content starts below the bar.

---

## 6. Components

Props are typed in each file; the essentials are below. "settings" is always `SiteSettings` from `getSettings()`.

### Chrome (`components/site/`)
| Component | Props | Notes |
|---|---|---|
| `SiteHeader` | `settings`, `nav: NavModel`, `current` | Rendered by the layout. Two tiers beside the big logo; condensed on scroll; dropdowns work without JS (hover/focus) and become disclosures with JS; below 1240 px the same `<nav>` is the menu sheet (Menu/Close, pinned buttons, 5.0, licence, bulb). Skip link included |
| `SiteFooter` | `settings`, `nav` | Rendered by the layout. Offices from `footerOffices(settings)` (both GBP links, live wording, the Scottsdale profile name with "(by appointment)"), services by category, cities, company links, sister-brand logos, BBB and social from `sameAs`, © year + legal name, "Website by Celaya Ventures". `#footer-nav` is the no-JS menu target |
| `CallBar` | `settings`, `estimateHref?` | Below 640 px, fixed from first paint, space reserved in CSS, never animated; static on screens under 400 px tall |
| `HeadGate` | `openingHours` | The inline `<head>` script (office hours in Arizona time) |
| `SvgSprite` | | `#bulbglow` gradient, `#mb` small bulb symbol, `#grain` filter. Rendered once by the layout |
| `Logo` | `alt?`, `sizes?`, `lazy?` | AVIF/WebP renditions in `public/img` + the PNG fallback |

### Atoms (`components/ui/`)
| Component | Props | Usage |
|---|---|---|
| `Button` | `href`, `variant` primary·ghost·paper·cream, `size` md·lg (default lg), `icon` go·tel, any `<a>` attribute | `<Button href={ESTIMATE_PATH} icon="go">Get a Free Estimate</Button>` |
| `CtaButtons` | `settings`, `estimateLabel?`, `estimateHref?` | The Estimate + Call pair in a `.btn-row` |
| `TextLink` | `href`, `icon?` go, `external?`, `tone?` cream | Underlined link that retracts on hover; "View All Services" |
| `ExternalLink` | `href`, `rel?` (default noopener), attributes | New tab + "(opens in a new tab)" for screen readers. Use for every external link |
| `Eyebrow` | `number?` (zero-padded), `variant?` pill·cream·sky | The kicker above a heading, always a `<p>` |
| `SectionHeader` | `heading`, `accent?`, `id?`, `eyebrow?`, `number?`, `size` display·h2, `as` h2·h3, `intro?`, `layout` split·stack, `reveal?` (data-reveal on the heading), slot `more` | `<SectionHeader eyebrow="Guides" number={8} heading="Plain answers" accent="answers" id="guides-h" intro="…"><TextLink slot="more" href="/blog" icon="go">All guides on the blog</TextLink></SectionHeader>` |
| `Accent` | `text`, `accent?`, `tone?` accent·glow-word·hl | A heading's text with its highlighted words wrapped: `<h2><Accent text={s.heading} accent={s.headingAccent} /></h2>` (copper; `glow-word` on the copper band, `hl` on the tools photo) |
| `Stars` | `size?` px | Decorative (aria-hidden); the rating is always stated in text nearby |
| `RatingLine` | `settings`, `variant?` quiet·foot | "★★★★★ 5.0 from 380+ Google reviews · Read our reviews on Google ↗". Nothing if Site settings has no rating |
| `ScoreBlock` | `settings`, default slot (extra links) | The big copper 5.0 (never clipped), stars, count and the Google link |
| `RocLink` | `settings`, `separator` · or ., `class?` | "Licensed, bonded, and insured · ROC #365306" → the AZ ROC lookup |
| `OfficeStatus` | `settings`, `variant` line·util | Emma as a subtle status: "Emma is ready for your call" (open) / "Office opens [Monday ]at 9 am" (closed) / the hours (no JS) |
| `Bulb` | `lead` left·right, `class?` | The wire-drawn bulb. Put `data-bulb-field` on the section (and optionally `data-bulb-edge` on the box whose edge the wire starts from). Lit by default; scope `.glow`/`.glass` opacity to change that (the 404 keeps it dark, /estimate lights it on send) |
| `MiniBulb` | `class?` (default `mini-bulb`) | Lights on hover/focus inside `.tile`, `.svc-tile`, `.guide` |
| `LitBulb` | `class` | The bulb as parts (the form's success state, `ok-bulb`) |
| `Breadcrumbs` | `crumbs: Crumb[]`, `variant?` sky | Render with the same array you pass as `meta.breadcrumbs`, so the trail equals the `BreadcrumbList`. Inner pages only (CSS in `inner.css`) |
| `SanityImage` | `image`, `widths?`, `sizes`, `aspect?`, `alt?`, `priority?`, `class?`, `style?`, `faces?` | See [Images](#7-images) |
| `StaticPicture` | `src`, `avif?`, `webp?`, `sizes`, `width`, `height`, `alt`, `loading?`, `fetchpriority?` | Committed images with AVIF/WebP renditions |

### Sections (`components/sections/`)
| Component | Props | Notes |
|---|---|---|
| `EstimateForm` | `settings`, `id` (field-id prefix), `title?`, `titleTag?`, `hint?`, `anchor?` | Posts to `/api/contact` (honeypot `company_website`, `startedAt` timing, `formType`). Works without JS (303 back to `#sent` / `#send-error`); with JS validates inline, one request per submit, focuses the confirmation, fires `generate_lead`. **One per page** (fixed ids `sent`, `send-error`) |
| `CtaBand` | `settings`, `heading?` (default Site settings → CTA band), `text?`, `number?`, `formId?` | The closing estimate band: van photo stage, words on the wall, bulb, "Prefer to talk?", the form card (`#estimate`). Counts as the page's estimate form |
| `ReviewsCarousel` | `settings`, `reviews`, `heading?`, `accent?`, `number?`, `id?` (default `reviews`: inner pages link to `/#reviews`), `cta?` `{label, href}` (default "Get a Free Estimate Now" → `/estimate`) | Homepage: every review in two lanes, pause/prev/next before the lanes, reduced-motion safe, all text in the DOM, "Read the full review" dialog. Needs `home.css` |
| `ReviewsStatic` | `settings`, `reviews` (pick 3), `heading`, `intro?`, `number?`, `id?`, `tone?` sand | Inner pages: picked reviews under the 5.0. Needs `inner.css` |
| `ReviewCard` | `review`, `static?` | One card (`<li>`); used by the two above |
| `Valley` | `settings`, `cities` (from `serviceAreaCities`), `variant` home·inner, `heading`, `accent?`, `intro?`, `current?` (city slug), `eyebrow?`, `number?`, `id?`, `note?` | See [Valley map](#10-the-valley-map). Home variant needs `home.css` for the sky |
| `FaqList` | `faqs: FaqItem[]`, `openFirst?`, `class?` | Native `<details>`; answers rendered with `PortableText` |
| `FaqBlock` | `faqs`, `heading`, `intro?`, `id?`, `eyebrow?`, `number?`, `more?` (null hides the /faq link) | The two-column questions block. Wrap in `<section class="section answers">` |
| `GuideCard` | `post`, `label?`, `coverWords?`, `focus?`, `as?` | Inside `<ul class="guides" role="list">` |
| `PortableText` (`components/`) | `value`, `class?` (usually `prose`), `figureSizes?` | See [Rich text](#8-rich-text) |

The inner-page patterns (photo heroes, at-a-glance, warning signs, contact card, /estimate hero and steps) are ported as CSS in `inner.css` with the mockups' class names; build them as section components from the mockup HTML when converting those pages, reusing the atoms above, and map them in `SectionRenderer` (below). The page-builder pages' own sections (inner hero, highlights, trust strip, team, statement, jobs, contact, offices, services directory, blog archive, FAQ topics, rich text, image + text) are in §13.

### Page-builder sections (`components/sections/`, the homepage's in round 5)

Pages composed in Sanity (`page.sections`) render through **`SectionRenderer`** `{page, settings}`:

```astro
<SiteLayout meta={meta} schema={[webPageNode({...}), faqNode(path, collectPageFaqs(page))]} bodyClass="over">
  <SectionRenderer page={page} settings={settings} />
</SiteLayout>
```

- **Frame** (`withPageFrame`): the H1 is never missing. A page without a hero section gets one (the page heading, the estimate button and Call), and a page with no sections at all (content written before the page builder, as in a dataset not yet re-imported) also closes with the estimate band. Without a photo the hero drops the title card (`hero--bare`): the words and the proof card sit on the page.
- **Plan** (`lib/sections.ts` `planSections`): empty sections render nothing and take no number (`isEmptySection`; `priceGuideSection` is always empty: owner rule). Chapters are numbered in order (the eyebrow's "01", "02", …); the hero, the value cards on the copper band and a pulled review quote are interludes without a number. A questions section and the guides after it share one sand band (`section answers`); either alone gets the band too.
- **Variant** comes from the section's own fields and the page: the homepage (`slug` `index`) gets the title-card hero, the review lanes and the valley with its sky; other pages get the inner variants.
- **Not built yet = build error.** A `_type` or variant without a component (a new section type, a services or posts `layout` value nobody draws yet) stops the build with a message naming it, instead of being dropped: build its component and map it in `SectionRenderer`. Every type in the schema has one now; the other pages' components are in §13.
- Every link a section stores goes through `ctaHref(link, redirects)` (`lib/site.ts`): estimate buttons go to `/estimate` (owner rule) whatever their stored href; other hrefs are rewritten past redirects.
- Section ids are `${section._key}-h` (unique per page). Below-the-fold sections carry `cv` (`content-visibility: auto`, see `core.css`).
- The homepage's composition is content: page `index`, written by `scripts/migrate/content/page-sections.mjs` (order, eyebrows, headings, accents, picks). Change it there (or in Studio), not in the template.

| `_type` → component | Props | Notes |
|---|---|---|
| `heroSection` → `HeroHome` (home) | `section`, `heading` (page.heading), `settings` | Title card on the crew photo: eyebrow pill, the H1 in two balanced lines (`balancedLines`, never splitting the accent words), primary button (→ `/estimate`), Call, the `ctaNotes` line under both, Emma's status (tablets and phones), the photo as a `<picture>` (phone and wide sources from `lib/hero.ts` `HERO_SOURCES`; the page preloads the same with `heroPreloads`), the glass proof card (5.0 + Google link + `trustLine` linked to the ROC lookup when it states the licence + the `reviewSnippets`), and under the hero the `text`: first sentence as the lit statement, the rest as a quiet lede. Nothing animates in |
| `teamIntroSection` → `TeamIntro` | `section`, `settings`, `number?` | "Who we are": eyebrow, H2 + accent, `businessSummary(settings)` when `showSummary`, the body (mentions link to `/our-team`), the button + text link, one photo with its caption (runs off the right edge on desktop). No portrait cards |
| `featureGridSection` `cards` → `ValueCards` | `section` | The copper band: cream eyebrow, H2 with the accent glowing, the lit bulb (`LitBulb`), numbered glass cards (title, text, cream text link; a `service` links the title) |
| `featureGridSection` `checklist` → `Capabilities` | `section`, `categories` (nav `serviceGroups`), `number?` | Huge type on the section's `image` in a copper tint: items with a `service` are numbered linked rows (arrow, small bulb on hover), items without are the same rows unlinked, items that only carry a `link` ("+ More!") close the list as a text link; the lede and a link per category under the heading |
| `servicesSection` `featured` → `ServicesMosaic` | `section`, `number?` | Eight cards fill the round-5 mosaic (slots `t-panel` … `t-com`, tuned to those photos: keep people out of the narrow tiles' word band); any other count sits in an even grid (`bento--even`). The title is the card's one link. Head: intro, the `cta` and "Browse" links to the categories of the cards shown; phones: a swipe row with previous/next (`data-rail`) |
| `quoteSection` with `review` → `PullQuote` | `section`, `settings` | The excerpt huge on the photo (ink on a bright photo), stars, name, review date and service, Google link on a glass caption |
| `processStepsSection` → `ProcessSteps` | `section`, `settings`, `number?` | One copper wire through the steps into the bulb it builds, pinned and scroll-driven on desktop (any number of steps: `--steps`, `--k`), simply drawn and lit elsewhere. `showContact` adds the phone, the hours and "Request a free estimate" |
| `reviewsSection` → `ReviewsCarousel` (home) / `ReviewsStatic` | | Home: every review (`limit: 0`), heading accent, the section's `cta` |
| `locationsSection` → `Valley` | | `home` on the homepage, `inner` elsewhere; cities from the section (`serviceAreaCities`), Mesa left out when `includeHomeCity` is false |
| `gallerySection` → `Gallery` | `section`, `number?` | Six photos fill the round-5 mosaic (three columns flush at the foot; rows of two on tablets; captions under the photos on phones); other counts fill the same columns in turn. Projects add their main photo. The `cta` (Instagram) opens a new tab |
| `faqSection` → `FaqBlock` | | In the answers band |
| `postsSection` → `GuidesBlock` | `section`, `number?` | The guides head and `GuideCard`s; a `postCard` brings its own cover photo, topic and cover words |
| `ctaSection` → `CtaBand` | | The section's own heading/text, else Site settings → CTA band |

---

## 7. Images

**CMS images** go through `lib/image.ts` and `SanityImage`:

```astro
<SanityImage image={service.mainImage} widths={[480, 768, 1080]} sizes="(min-width: 1024px) 384px, 92vw" aspect={4 / 3} alt="" />
<SanityImage image={hero} widths={[640, 960, 1280, 1600]} sizes="100vw" priority />   <!-- the one LCP image -->
```

- Sanity's image CDN serves every rendition (`auto=format` → AVIF/WebP, q 75, crop and hotspot honoured, `fit=crop` only with `aspect`), project `qhi2uf0l` **even when the build reads the local dataset** (`IMAGE_PROJECT_ID`).
- The local dataset still stores some images as `image@<webflow url>`; `resolveImage()` maps them to the Sanity asset the production import made from the same file (`data/legacy-images.json`, regenerate with `node scripts/migrate/legacy-image-map.mjs` after an import that adds images), else to the local mirror `/wf/a/…` (`data/webflow-mirror.json`). An image with neither renders nothing and logs a build warning: **nothing is ever loaded from Webflow's CDN**.
- `width`/`height` come from the asset (after the editor's crop) or from `aspect`. Widths are capped at the original (no upscaled copies).
- `alt`: the image's own alt by default; pass `alt=""` for a thumbnail beside its own title.
- LCP: `priority` (eager, `fetchpriority=high`, `decoding=sync`) on exactly one image per page; if it sits low in the HTML also preload it with `imagePreload(image, widths, sizes, aspect)` in the layout's `head` slot.
- Helpers: `resolveImage`, `hasImage`, `imageDimensions`, `imageUrl(image, {width, height, format, quality})`, `imageSrcSet(image, widths, aspect?)`, `imagePreload`, `ogImageUrl`.

**Fixed brand photos** that a component is designed around (the crop keeps faces clear) are Sanity assets listed in `lib/brand-photos.ts` (`VAN_PHOTO`, `FLEET_PHOTO`, with `faces` boxes for QA). Add new ones there (they come from `migration/brand-photos`).

**Faces and focus.** `lib/brand-photos.ts` also lists the head boxes of every company photo of people by asset (`PHOTO_FACES`, read by `facesOf(image)`); `SanityImage` writes them to `data-faces` wherever the photo appears, so the QA face check covers every use. Add a photo's boxes there when you add a photo of people. When a frame crops a photo with `object-fit: cover` (and no `aspect`), `SanityImage` turns the editor's **hotspot** into `object-position` (`imageFocus`), so editors choose what stays in view; with `aspect` the CDN crop is already centred on the hotspot.

**Static art** lives in `public/img` (logo renditions, relief renditions, sister-brand logos, the fleet poster's enlarged copies) and renders with `Logo` / `StaticPicture` or plain `<img>` with explicit dimensions.

---

## 8. Rich text

`<PortableText value={doc.body} class="prose" />` renders Portable Text through `lib/portable-text.ts`:

- blocks: paragraphs, H2–H6 (an `h1` block becomes H2: content never adds an H1), blockquote, bullet and numbered lists (nested);
- marks: bold, italic, underline, sup, sub, links (internal links become root-relative, lose a trailing slash and are rewritten past redirects using `getRedirectMap()`; external links open a new tab and say so), team-member mentions (→ `/our-team`);
- types: `figure` (sized Sanity image + caption), `table` (header row as `th scope=col`, first cell as `th scope=row`, wrapped in a focusable scrolling region), `videoEmbed` (YouTube facade: a link to the video with its poster; the site script swaps in the `youtube-nocookie` player on click), `callToAction` (a wash block with a primary button; `href` defaults to `/estimate`).

Without `class` it renders just the blocks (FAQ answers inside `.qa .a`). `.prose` is styled in `inner.css`.

---

## 9. The site script and its hooks

`scripts/site.ts` (bundled per page from the layout, ~4 KB brotli) adds behaviour only. Every module is a no-op when its hooks are absent. Without JS, or with reduced motion, every word and link is still there and visible.

| Hook | Module | Behaviour |
|---|---|---|
| `html.js`, `html.motion`, `html.oo` / `html.oc` / `html.oc-far` | `HeadGate` (inline in `<head>`) | JS present; motion allowed; office open / closed / next opening more than a day away |
| `html.hdr-c` | `site/header.ts` | Set once the page leaves the top (a 24 px marker observed, no scroll listener): the header condenses |
| `.dd-btn[aria-controls]` + `.dd-panel#id` | `header.ts` | Disclosures; Esc, click outside or focus leaving closes them; focus returns to the button on Esc |
| `.menu-btn` + `#site-nav`, `[data-menu-label]`, `html.menu-open` | `header.ts` | The menu sheet: Menu/Close label, page behind `inert`, focus moves to the first item, Esc closes and refocuses the button |
| `[data-reveal]` | `site/motion.ts` + CSS | Scroll-driven reveal where supported (CSS only); one-shot fallback (`html.reveal-js`, `.is-in`) elsewhere. Never above the fold |
| `[data-eager-photos]` | `motion.ts` | Lazy images inside switch to eager a screen and a half before the section arrives |
| `[data-hero-copy]` inside `.hero` | `motion.ts` | Title-card hero safety net: `.hero--stacked` if the words outgrow their wall box |
| `[data-rail]`, `[data-rail-track]`, `[data-rail-step="±1"]` | `motion.ts` | Phone card rows moved one card per button press |
| `.bulb[data-lead]`, `[data-bulb-field]`, `[data-bulb-edge]`, `[data-lead-path]` | `site/bulb.ts` | The lead-in starts at the field's edge; `.is-in` draws the wire when the bulb is 30% visible |
| `[data-valley]`, `.vy-map`, `.vy-cities li[data-city]`, `.vy-pin[data-pin]` | `site/valley.ts` | Arms the map (`vy-armed`, then `is-live` when a third of it is on screen); hover/focus lights a town and floats its neighbourhoods (`.vy-callout`); a pin click follows its link |
| `[data-marquee]`, `.lane`, `.belt`, `.track`, `[data-marquee-toggle]` (+ `[data-label]`), `[data-mq-step]` | `site/reviews.ts` | The review lanes, pause/play, prev/next, keyboard, the full-review dialog |
| `[data-est]`, `[data-started]`, `[data-est-alert]`, `[data-est-fail]`, `[data-submit-label]`, `[data-est-done]`, `[data-est-page]` (`.is-lit`) | `site/forms.ts` | Form enhancement; `?sent=1` after a no-JS post shows the confirmation |
| `a[data-video]` (+ `data-video-title`) | `site/video.ts` | Video facade → iframe |
| `a[href^="tel:"]` | `site.ts` | GA4 `phone_call_click` (and `generate_lead` on form success) |
| `[data-office]` | CSS | Elements that follow the office status classes (`.tel-ic` ring, `.status`) |
| `data-faces` on `<img>` | QA tooling | Head boxes the layout keeps clear |

---

## 10. The valley map

The map is computed at **build time** in TypeScript; nothing is precomputed by hand.

1. **Relief (rarely changes):** `python3 -I scripts/valley/relief.py TILE_DIR --download` renders the relief from USGS elevation tiles (Terrain Tiles, zoom 12) into `web/public/img/relief/relief-{1200,1800,2600}.{avif,webp}` and writes `web/src/data/relief.json`: the crop, the image aspect, each town's USGS GNIS point (from `migration/local-facts`) and the range labels, as fractions of the image. Re-run it only to change the look or the crop (it reproduces the committed files exactly).
2. **Geometry (every build):** `lib/valley.ts` `valleyGeometry(cities)` takes the cities in index order (`serviceAreaCities()` from `lib/cities.ts`: Mesa, then `CITY_ORDER`, then any new city alphabetically) and returns the wire path (centripetal Catmull-Rom through the towns, legs bowed outward, hairpins rounded, then the tail and the bulb outline), each town's light-up time on the eased draw (`easeTime`), label sides per layout (`LABEL_SIDES`, chosen by the mockups' label optimiser; unknown towns label to the right), the range labels and the stage's CSS variables. A city missing from `relief.json` is placed from its Sanity `geo` (Web Mercator, same crop).
3. **Render:** `components/sections/Valley.astro` (+ `styles/atlas.css`); motion and hover in `scripts/site/valley.ts`.

Adding a city in Sanity adds it to the index, the menus and the footer automatically; give it `geo` to put it on the map, and check its label (add it to `CITY_ORDER` and `LABEL_SIDES` if its position needs a better place in the route).

---

## 11. Navigation and the chrome

`lib/nav.ts` `getNavModel()` (memoized) builds what the header and footer show:
- **About Us ▾**: About Us, Our Team, FAQ, "contact us" (the live anchor texts);
- **Locations ▾**: every city (`serviceAreaCities`), Mesa → `/`;
- **Commercial** → `/commercial-electrician`;
- **Services ▾**: services grouped by category (Residential, Commercial) in Sanity's `order`, plus "All services" → `/services`;
- **Careers**, **Blog**; the footer's Company column adds Home, Services and Contact Us.

Together the header and footer carry the 19 sitewide chrome links on every page. `lib/site.ts` derives the display values: `ESTIMATE_PATH`, `telHref`, `siteRating`/`ratingSummary`, `licence`, `officeHours` (`line`, `footer`, `prose`, `next`), `profiles` (from `sameAs`), `sisterBrands` (logos keyed by host), `footerOffices`, `formatAddress`. Hours text comes from `lib/hours.ts`.

---

## 12. Checks before you commit

Two build details every page relies on:
- **Words stay apart.** Astro drops whitespace that contains a newline, so `src/middleware.ts` adds a line break after every block-level closing tag of every HTML page (not inside script, style, textarea or pre); between inline elements that carry words, still write `{' '}`. Check with cheerio `.text()`: no `wordWord` glue.
- **CSS targets.** `astro.config.mjs` sets `vite.build.cssTarget` (Baseline widely available). Without it the CSS minifier folds `animation-timeline` into the `animation` shorthand, which browsers reject, and every scroll-driven animation silently stops.

- `pnpm --filter web check` → 0 errors.
- Build from the local dataset: `PUBLIC_SANITY_PROJECT_ID= SITE_INDEXABLE=true pnpm --filter web build` (the log says it uses the local dataset).
- Parity: `node scripts/seo/serve-build.mjs --port <port>` then `node scripts/seo/crawl.mjs --base http://localhost:<port> --paths-from migration/seo-baseline.json --out <tmp>/candidate.json` and `node scripts/seo/parity.mjs --candidate <tmp>/candidate.json` → 0 errors; read every warning.
- Look at the page at 390, 768, 1024, 1440 and 2560, with motion, reduced motion and without JS; compare with the mockups.
- axe (WCAG 2.2 AA) at 390 and 1440: 0 violations.
- The page also renders from the Sanity production dataset (stale until re-import): every component tolerates missing fields.

---

## 13. Inner-page sections (the page-builder pages)

The static pages (/about-us, /our-team, /careers, /faq, /contact-us, /commercial-electrician), /services and /blog are composed in Sanity and drawn by `SectionRenderer` like the homepage, with the inner variants. /estimate is a code route built from its mockup.

**Routes.** `pages/[page].astro` (the six static pages), `pages/services.astro` and `pages/blog.astro` render `components/PageBuilderPage.astro` `{page, settings, meta, schema}`: `SiteLayout` (`bodyClass="inner page-<slug>"`), the stylesheets and `SectionRenderer` with the page's trail (`crumbs` = `meta.breadcrumbs`, so the visible trail equals the `BreadcrumbList`). Each route keeps its own `title`, `description`, `path` and crumbs expressions. /services and /blog also list everything when the page document has no list yet (content written before the page builder): /services adds the grouped directory of every service, /blog the archive of every post, so no service or post loses its link.

**Stylesheets.** `PageBuilderPage` imports `inner.css`, then `home.css` (the homepage sections these pages reuse: the copper value cards, the checklist on its photo, the process wire, the gallery, the valley's index), then **`styles/pages.css`** (the sections below). All builder pages share that bundle (one cached chunk).

**JSON-LD.** `lib/page-schema.ts` `pageSchema({page, settings, path, title, description, type, crumbs, extra})` returns the page's nodes, built from what the sections show: the WebPage (typed `AboutPage`, `ContactPage`, `CollectionPage`… as the live page was; /faq is a plain `WebPage`), a `Person` per team card (`@id` `/our-team#<slug>`, `worksFor` the business), a `JobPosting` per open job shown (`directApply` when the page has the application form), the one `FAQPage` from `collectPageFaqs`, plus `extra` (the blog's `Blog` node).

**Rules the renderer applies.** One form per page: a page with a contact section leaves out its CTA band's form (and logs why). "Apply Now" on a job goes to the page's application form (`#<contact key>`). Two question bands in a row alternate sand and bone. A posts list with `layout: "byService"` is a section of its own, not part of the questions band. Section buttons carry the section's own words, so below 480 px a long label ("Get a Free Commercial Estimate Now") wraps inside its column (`pages.css`).

| `_type` (variant) → component | Props | Notes |
|---|---|---|
| `heroSection` (not home) → `HeroInner` | `section`, `heading` (page.heading), `settings`, `crumbs?` | The "who we are" composition: the trail, eyebrow, H1 (`Accent`; headings over 44 characters a size smaller), lede, the buttons (primary, secondary, Call when `showPhone`), `ctaNotes`, Emma's status; one real photo running off the right edge **at its own proportions** (never cropped; a portrait photo stands in a narrower column), the LCP image (`priority`). With `showTrustBar`, `trustLine` or `reviewSnippets`: the glass trust card under it (the 5.0 and Google link, the licence → ROC lookup, the trust line, up to three quotes; below 1440 px the quotes take a row of their own). Phones: the words, then the photo edge to edge; the estimate and call buttons step aside for the call bar (`.phero__est`), others (Apply Now, Start a request) stay |
| `highlightsSection` → `Highlights` | `section`, `settings`, `number?` | The points set large (copper check sockets; `lead` in display type, `text` under it) beside the photo; the side note (`asideHeading` as H3, its ROC number linked to the lookup; `asideBody`) on a paper card over the photo's foot |
| `trustBarSection` → `TrustFacts` | `section`, `settings` | `resolveTrustItems()`: big copper values over their words (5.0 + stars + Google link, `ROC #` + "Licensed, bonded, and insured" → lookup, the year founded, custom facts). Sand band, an interlude (no number). No warranty tag (owner) |
| `teamSection` → `TeamGrid` | `section`, `number?` | Portraits in a 4:5 frame (the square portraits only lose their sides; 1:1 on phones), name (H3), role, credentials and years when supplied, bio. Each card's id is the person's slug. `showBios: false` = the roster: one row of up to ten small portraits (`--cols`), three to a row below 1100 px |
| `quoteSection` (no review) → `Statement` | `section` | The copper band of "Our promise": eyebrow, H2, subheading (H3), the quote in display type with the person's name and role, one photo beside it (never tinted). An interlude |
| `jobsSection` → `JobOpenings` | `section`, `number?`, `applyHref?` | Sticky head (eyebrow "Now hiring", H2, intro) beside paper cards: employment type, posted and closing dates (`<time>`), title, description, Apply Now. Only jobs `currentJobs()` keeps (open, not past `validThrough`), the same list as the JobPosting nodes |
| `contactSection` → `ContactBlock` | `section`, `settings`, `number?` | The section's key is its anchor (`#contact`, `#apply-now`). Left: eyebrow, H2, text, a card with `detailsHeading` (H3) and the details asked for (phone + Emma's status, hours, email, offices via `visibleOffices()`: **never the Mesa home address**), rating and licence. Right: `EstimateForm` (estimate) or `ApplicationForm` (careers) with the section's form heading, submit label and success message. Phones: words, form, then the card |
| `officeLocationsSection` → `OfficeLocations` (+ `OfficeCard`) | `section`, `settings`, `number?` | `<address>` cards: the profile name with "(by appointment)", street lines, phone (the main line when the office has none), "Find us on Google" → its profile. No hours (not confirmed per office) |
| `servicesSection` `featured` (not home) → `ServiceCards` | `section`, `number?` | Whole cards on real photos (`.tiles3`, `.tile--card` from `inner.css`): photo on top, words on paper, the title the one link. The homepage keeps its eight-tile mosaic |
| `servicesSection` `grid` / `grouped` → `ServicesDirectory` | `section`, `number?` | Every service once as a numbered row (name = the link, card text under it, arrow; the small bulb lights on hover). `grouped`: each category's heading (H2, or H3 under a section heading) beside its list, sticky on wide screens, its description when it has one, "… services overview" → the category page. `grid` without groups: two columns of rows from 1100 px. Text only: the service records' photos are partly stock |
| `postsSection` `byService` → `PostsIndex` | `section`, `number?` | The blog archive: topic links (with counts) jump to each group; each group is the service's name beside its rows (date, title link, excerpt) and "Our … service" → the service page. Biggest topics first, newest first within. Text only (no 50 stock thumbnails) |
| `postsSection` `cards` → `GuidesBlock` | | As on the homepage, in the questions band (no top margin when it opens the band) |
| `faqSection` with `groups` → `FaqTopics` | `section`, `number?`, `nested?` | A sticky index (topic + count) beside the groups; each group's heading (H2, or H3 under the section's own heading) and its questions, the first open. `FaqBlock` gained `image?`: the section's photo under the aside (hidden on phones) |
| `richTextSection` → `RichText` | `section`, `number?` | The heading beside the `.prose` copy (sticky), or the copy alone |
| `mediaTextSection` → `MediaText` | `section`, `number?` | Words beside one photo running off the screen's edge on `imagePosition`'s side, at its own proportions |
| `featureGridSection`, `processStepsSection`, `gallerySection`, `locationsSection`, `reviewsSection`, `ctaSection` | | The homepage's components; reviews are `ReviewsStatic` (it gained `cta?`), the valley its `inner` atlas |

**Forms.** `EstimateForm` gained `submitLabel?` and `successMessage?` (a contact section's own words). `ApplicationForm` (`data-est="careers"`) is the same card and behaviour with the application's fields (name, phone, email required; years, full-time, start, message optional) posting `formType: careers`; `scripts/site/forms.ts` doesn't fire `generate_lead` for it. Both work without JS: the API answers 303 back to `?sent=1#sent` (or `?error=1#send-error`), which CSS shows.

**Libraries.** `lib/offices.ts` (`visibleOffices`, `officeName`, `addressLines`), `lib/jobs.ts` (`currentJobs`, `employmentLabel`), `lib/page-schema.ts` (`pageSchema`). `lib/site.ts` `ctaHref` sends every "Free … Estimate" label (also "Get a Free Commercial Electrical Estimate") to `/estimate`. `lib/brand-photos.ts` lists the head boxes of the team portraits, the black-and-white portrait of Steven and the tenant-improvement photo.

### /estimate (`pages/estimate.astro`)

The approved mockup, built from the shared parts: `.ehero` (trail, eyebrow, H1 "Get a free estimate" with "estimate" in copper, lede, the drawn bulb that waits unlit and switches on when the request is sent, `data-est-page`), `.est-page` (`EstimateForm` "Request your free estimate", `anchor="estimate"`, beside "What happens next": three steps on the copper wire, then "Prefer to talk?" with the phone, Emma's status, hours, rating, licence and "Family-owned in Mesa since 2017" from Site settings), three `ReviewsStatic` reviews about the process (picked by author; a missing one is left out) and "Before you send it" (four questions; "Contact us today" in an answer points at `#estimate`). `ContactPage` + `FAQPage` + breadcrumbs; the call bar's Free Estimate goes to `#estimate`. Indexable and in `sitemap.xml`; the old `/estimate` → `/contact-us` redirect is gone, and the migration keeps content links to `/estimate`.
