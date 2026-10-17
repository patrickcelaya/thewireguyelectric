# Design system

The site's design language, as built in `web/src`: the approved round-5 redesign ("full send it"), ported from the mockups into Astro components. Read this before building or converting a page. Everything here is in the repo; the mockups and their rationale (round 5, `redesign/round5/final` in the design scratchpad) are the reference for look and behaviour.

**Contents:** [Rules](#1-rules-every-page-follows) · [Files](#2-where-things-live) · [Tokens](#3-tokens) · [CSS per page type](#4-css-per-page-type) · [Layout](#5-the-layout-sitelayoutastro) · [Components](#6-components) · [Images](#7-images) · [Rich text](#8-rich-text) · [Site script and its hooks](#9-the-site-script-and-its-hooks) · [Valley map](#10-the-valley-map) · [Navigation](#11-navigation-and-the-chrome) · [Checks](#12-checks-before-you-commit) · [Inner-page sections](#13-inner-page-sections-the-page-builder-pages)

---

## 1. Rules every page follows

These come from the owner (all rounds) and the SEO spec. They are not style preferences.

**Content and SEO**
- **One H1, from the document** (`page.heading`, `service.heading ?? service.name`, `location.heading`, `post.title`), plain text, no `<br>`, no eyebrow inside it, never inside `<header>`. Section headings are H2; inside a section, H3. (`docs/CONTENT_MODEL.md` §1.)
- **Keep every page's `title`, `description`, `path` and `crumbs` exactly as the live site has them** (`migration/seo-baseline.json`). Only the body changes. `scripts/seo/parity.mjs` must stay at 0 errors.
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
  styles/          tokens.css, core.css (every page); the layers home.css, sections.css, inner.css, cms.css, post.css,
                   pages.css, atlas.css; bundles/ (one stylesheet per page type, built from the layers)
  assets/fonts/    Red Hat Display + Red Hat Text, latin subset woff2 (hashed by Vite)
  layouts/         SiteLayout.astro (every page)
  components/
    Seo.astro      every SEO <head> tag
    PageBuilderPage.astro  the shell of the pages composed in Sanity (§14)
    PortableText.astro
    site/          the chrome: SiteHeader, SiteFooter, CallBar, HeadGate, SvgSprite, Logo
    ui/            atoms: Button, TextLink, ExternalLink, Eyebrow, SectionHeader, Accent, Stars, RatingLine, ScoreBlock, RocLink,
                   OfficeStatus, Bulb, MiniBulb, LitBulb, Breadcrumbs, SanityImage, StaticPicture, CtaButtons
    sections/      SectionRenderer (page.sections → components) and the sections: the homepage's (HeroHome, TeamIntro,
                   ValueCards, Capabilities, ServicesMosaic, PullQuote, ProcessSteps, Gallery, GuidesBlock, EstimateForm,
                   CtaBand, ReviewsCarousel, ReviewsStatic, ReviewCard, Valley, FaqList, FaqBlock, GuideCard), the CMS
                   templates' (§13) and the inner pages' (§14)
  scripts/         site.ts (entry) + site/*.ts (header, motion, bulb, valley, reviews, forms, video, util)
  middleware.ts    a line break after every block-level closing tag of every HTML page (see §12)
  lib/             queries, types, schema, seo (unchanged roles) + image, site, nav, cities, hours, valley, bulb,
                   portable-text, links, brand-photos, format, sections (the renderer's plan), hero (the hero photo's renditions)
  data/            relief.json (valley map), legacy-images.json (Webflow URL → Sanity asset)
web/public/img/    logo renditions, relief renditions, sister-brand logos, fleet poster enlargements
```

Every route renders on `SiteLayout`; the Webflow port (its HTML, stylesheet, fonts, `WebflowLayout` and runtime) is gone. `public/wf/a` keeps only the Webflow files the private review bundle (`public/design-review`) still shows: delete both together.

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

Every page blocks on two stylesheets: the shared core (cached once for the whole site) and the one bundle of its page type (cached per type). A bundle in `styles/bundles/` is a list of `@import`s of the layers, which Vite inlines into one fingerprinted file, so the cascade order is the import order and nothing else.

| Layer | Holds |
|---|---|
| `tokens.css` + `core.css` | every page (imported by `SiteLayout`): base, type, buttons, links, kicker, status, rating, the header (both tiers, dropdowns, menu sheet), section heads, tiles, review cards and the score block, FAQ (`details`), guide cards, the estimate band and form, the footer, the call bar, reveals |
| `home.css` | the homepage's own sections: the review lanes and dialog, the title-card hero, the services mosaic, the valley sky (fleet poster) |
| `sections.css` | the sections the homepage shares with the page-builder pages: "who we are", the value cards on copper, the checklist on its photo, the pulled-out review, how it works, the photo mosaic (and their scroll-driven motion) |
| `inner.css` | every other page: the breadcrumb and static reviews, photo heroes (`.ihero`), trust card, at-a-glance facts, service cards, the long-form article and contact card, `.prose` (rich text, incl. tables, video, CTA blocks), warning signs, the /estimate hero and steps, the 404 and link hub (`.hub`) |
| `cms.css` | the CMS templates' additions (§13) |
| `post.css` | the editorial post layout (§13) |
| `pages.css` | the inner-page sections (§14) |
| `atlas.css` | the valley: relief map, wire, lights, labels, index panel, callout and their motion |

| Bundle (`styles/bundles/`) | Imported by | Layers, in cascade order |
|---|---|---|
| `page-home.css` | `pages/index.astro` | home, sections, atlas |
| `page-builder.css` | `components/PageBuilderPage.astro` (about us, our team, careers, FAQ, contact, commercial, /services, /blog) | inner, sections, pages, atlas |
| `page-cms.css` | city, service, service-category and post-category pages | inner, cms, atlas |
| `page-post.css` | blog posts | inner, cms, post |
| (`inner.css` alone) | /estimate and the 404 | inner |

A component never imports a stylesheet: Astro bundles the CSS of every component a page *imports*, rendered or not, and the section renderer imports every section, so per-component CSS would put every section's styles on every page anyway. Add a new section's styles to the layer it belongs to, and a layer to the bundles of the page types that can show it.

Page-specific styles that don't belong to a reusable pattern go at the end of the layer file under a heading comment, the way the 404 block does. Budget (the spec asks for 15 KB brotli and one blocking sheet): measured on the local build of 2026-10-17, core 11.0 KB; the homepage 22.1 KB, a page-builder page 25.8 KB, a city or service page 20.9 KB, a post 18.6 KB and /estimate 16.7 KB, each in two files. The core alone is most of the budget (the header, footer, estimate band and form are on every page), so meeting 15 KB needs critical CSS inlined in the HTML and the rest loaded late, a build step not in place yet.

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
| `schema` | JSON-LD nodes | merged into the one `@graph` after `businessNode` (the Mesa headquarters with its full NAP), `branchNodes` (each office with its own Google Business Profile, e.g. Scottsdale, as an `Electrician` with `parentOrganization` and `hasMap`, so both offices' full NAP is on every page) and `websiteNode`; `breadcrumbNode` is added from `meta.breadcrumbs` |
| `bodyClass` | string | `inner` on inner pages (plus a page class such as `page-est`, `page-404`); `over` when the header sits over a full-bleed hero photo (the homepage): the header glass is then transparent until the page scrolls and `main` gets no top padding |
| `current` | path | marks the current link (`aria-current`) and puts the copper wire under its section (default `meta.path`; Gilbert → Locations, Panels → Services) |
| `callbarEstimateHref` | string | the call bar's Free Estimate target (`#estimate` on /estimate) |
| slot `head` | | extra `<head>` tags (an LCP preload) |

It renders: the head gate (`HeadGate`: `html.js`, `html.motion`, `html.oo`/`html.oc`/`html.oc-far` before first paint), `Seo`, the font preload, icons (`/favicon.svg`, the bulb on copper, plus 48 and 192 px PNGs for search results), `theme-color`, GA4 (only in the production build, SITE_INDEXABLE=true, and only on www.thewireguyelectric.com, so previews, local and QA builds send nothing; events queue at once; `gtag.js` loads after the page is idle or on first interaction), then the sprite, the header, `<main id="main">`, the footer, the call bar and the site script.

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
| `Breadcrumbs` | `crumbs: Crumb[]`, `variant?` sky | Render with the same array you pass as `meta.breadcrumbs`, so the trail equals the `BreadcrumbList`. Inner pages only (CSS in `inner.css`). On phones the links keep their whole names; the current page (which the H1 repeats) stays on the trail's line, shortened with an ellipsis, while 8em of it fits there, else it moves to a second line |
| `SanityImage` | `image`, `widths?`, `sizes`, `aspect?`, `alt?`, `priority?`, `class?`, `style?`, `faces?` | See [Images](#7-images) |
| `StaticPicture` | `src`, `avif?`, `webp?`, `sizes`, `width`, `height`, `alt`, `loading?`, `fetchpriority?` | Committed images with AVIF/WebP renditions |

### Sections (`components/sections/`)
| Component | Props | Notes |
|---|---|---|
| `EstimateForm` | `settings`, `id` (field-id prefix), `title?`, `titleTag?`, `hint?`, `anchor?` | Posts to `/api/contact` (honeypot `company_website`, `startedAt` timing, `formType`). Works without JS (303 back to `#sent` / `#send-error`); with JS validates inline, one request per submit, focuses the confirmation, fires `generate_lead`. **One per page** (fixed ids `sent`, `send-error`) |
| `CtaBand` | `settings`, `heading?` (default Site settings → CTA band), `text?`, `number?`, `formId?` | The closing estimate band: van photo stage, words on the wall, bulb, "Prefer to talk?", the form card (`#estimate`). Counts as the page's estimate form |
| `ReviewsCarousel` | `settings`, `reviews`, `heading?`, `accent?`, `number?`, `id?` (default `reviews`: inner pages link to `/#reviews`), `cta?` `{label, href}` (default "Get a Free Estimate Now" → `/estimate`) | Homepage: every review in two lanes, pause/prev/next before the lanes, reduced-motion safe, all text in the DOM, "Read the full review" dialog. Without JS the reviews are laid out whole: the first three of each lane (two on phones), then "Show all N reviews" (a link to `#reviews-all`, the marquee, which `:target` opens). Needs `home.css` |
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
- Section ids are `${section._key}-h` (unique per page). Below-the-fold sections carry `cv` (`content-visibility: auto`, see `core.css`). It applies on the homepage only: on inner pages the size estimates put the footer's links and a FAQ under the valley in the wrong place until they render, which tools that measure target spacing at load read as overlaps.
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
- The local dataset still stores some images as `image@<webflow url>`; `resolveImage()` maps them to the Sanity asset the production import made from the same file (`data/legacy-images.json`, regenerate with `node scripts/migrate/legacy-image-map.mjs` after an import that adds images), An image with no such asset renders nothing and logs a build warning: **nothing is ever loaded from Webflow's CDN**.
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
- marks: bold, italic, underline, sup, sub, links (internal links become root-relative, lose a trailing slash and are rewritten past redirects using `getRedirectMap()`; a link to the page the text renders on, as in an FAQ answer shared across pages, is plain text there (`currentPath`); external links open a new tab and say so), team-member mentions (→ `/our-team`);
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
- Parity: `node scripts/seo/serve-build.mjs --port <port>` then `node scripts/seo/crawl.mjs --base http://localhost:<port> --paths-from migration/seo-baseline.json --out <tmp>/candidate.json` and `node scripts/seo/parity.mjs --candidate <tmp>/candidate.json` → 0 errors; read every warning. serve-build answers as the www host (route headers with host conditions included); `--host <name>` answers as another.
- Structured data and share tags: `pnpm seo:schema` on the build → no failures (one parsing `@graph` per page with the required fields, `@id` references that resolve, `og:image` and schema images the page shows, no prices on service pages, no shortened `sameAs`, every served city in `web/src/data/places.json`).
- Look at the page at 390, 768, 1024, 1440 and 2560, with motion, reduced motion and without JS; compare with the mockups.
- axe (WCAG 2.2 AA) at 390 and 1440: 0 violations.
- The page also renders from the Sanity production dataset (stale until re-import): every component tolerates missing fields.

---

## 13. CMS templates: city, service, post and category pages

The four collection routes render the round-5 Gilbert (`city.html`) and Panels (`service.html`) mockups from Sanity, on `SiteLayout` with the shared atoms and sections above. Titles, meta descriptions, H1s, breadcrumbs and URLs are unchanged from the live site (parity checks them per URL).

| Route | Pages | Order of sections |
|---|---|---|
| `pages/locations/[slug].astro` | 10 cities | `LocationHero` (fleet under the sky, trust card; Scottsdale adds its office) · `LocationGlance` 01 · services 02 (`ServiceCards`, featured services else the residential ones) · `LongForm` with `ContactCard` · `ReviewsStatic` 03 · `AnswersBand` 04/05 · `Valley` inner (current city lit) · `CtaBand` |
| `pages/services/[slug].astro` | 21 services | `ServiceHero` (staged by its photo) · `ServiceGlance` 01 · `WarningSigns` (when the body has a "Signs …" list) · `LongForm` with `ContactCard` · `ReviewsStatic` · `AnswersBand` · related services (`ServiceCards`) · `Valley` inner · `CtaBand` |
| `pages/blog-posts/[slug].astro` | 53 posts | `PostHeader` (crumbs, topic pill, reading time, H1, byline, dates, cover) · `QuickAnswer` · the article (`prose prose--post`, H2 anchors) with `ArticleToc` + sticky `ContactCard` · the city link when the title names one · `AnswersBand` (the post's FAQs, else its hub service's) · "Services mentioned in this article" · `PostNav` · `CtaBand` |
| `pages/services-categories/[slug].astro` | 2 | `CategoryHero` · the category's services (`ServiceCards`) · `Valley` inner · `CtaBand` |
| `pages/posts-categories/[slug].astro` | 3 (noindex) | `CategoryHero` · the category's guides (else the latest three, said so) · the services the guides cover (`hub__chips`) · `CtaBand` |

Chapter numbers come from a counter in the page, so a section that renders nothing (no signs, no FAQs, no guides) takes no number. JSON-LD (the layout adds `BreadcrumbList`, the business with every served city defined once in its `areaServed` (`lib/places.ts`), the branch office and the `State`): city = `WebPage` (mainEntity `#service`) + `Service` (provider: the office whose profile lands on the page, else the business; areaServed the city's `@id`; a catalogue of the service cards) + `FAQPage`; service = `WebPage` (mainEntity `#service`) + `Service` (image only when the hero shows it, `isRelatedTo` the related cards, `subjectOf` the guides, no offers) + `FAQPage`; post = `BlogPosting` (the cover as `#primaryimage`, `isPartOf` `/blog#blog`, `about` its hub service, `mentions` the others) + `WebPage`; service categories = `CollectionPage` with an `ItemList` of its services; post categories = `CollectionPage`. Service pages show no question about price or with a dollar figure (`withoutPrices`). A post's related articles come from its hub services (`relatedArticles`), its hub link's words from `hubLinkLabel`; share images are photos the page shows, else Site settings → default share image (`ogImageMeta`).

### Components (`components/sections/`)

| Component | Props | Notes |
|---|---|---|
| `LocationHero` | `location`, `heading`, `settings`, `crumbs`, `office?` | `.ihero--sky`: `FLEET_PHOTO` eager/high priority (the page preloads `FLEET_HERO`), town in the H1 coloured (`cityAccent`), estimate + Call, Emma's status, `TrustCard` (+ `OfficeCard` → `.ihero--office`) |
| `TrustCard` | `settings`, `class?`, slot | The glass card: 5.0, stars, Google link, the ROC lookup line; the slot adds rows (the office) |
| `OfficeCard` | `office`, `settings`, `as?`, `kicker?`, `note?`, `class?` | The one office card (also used by §14's contact and office sections): `<address>` with the GBP name + "(by appointment)", street lines, phone, "Find us on Google" (the profile). The hero passes the kicker "Our {city} office" and the appointment note; `.itrust__office` (cms.css) sets it a size larger. Renders nothing for an office marked `footerOnly` (Mesa) |
| `LocationGlance` | `location`, `settings`, `number?`, `office?` | "{City} at a glance": the answer sentence (summary + neighbourhoods), facts (electric utility, county, ZIP codes, office hours), the walk-up photo (`WALK_PHOTO`, 4:5, "We come to you") unless the city has a company photo of its own, and "Permits and power in {city}" from `permitNotes` |
| `ServiceCards` | `services`, `maxCards?` (6) | Photo cards (`ServiceTile` in `.tiles3`) in whole rows of three for services with a company photo; the rest as text rows (`.svc-rows`). Stock photos are never shown |
| `ServiceTile` | `href`, `title`, `text?`, `image` | One whole photo card (`li.tile.tile--card`, the photo cropped 4:3 on its hotspot, the words on paper, the title the one link). Shared with §14's `FeaturedServices` |
| `ContactCard` | `settings`, `label?` | "Ready to Schedule Service?": score, phone, email, hours, the button → `/estimate` |
| `LongForm` | `body`, `label`, `variant?` (`city`, `service`, `post`), `class?`, slot (aside) | The page's own article (`articleHtml`), labelled by its first H2 |
| `WarningSigns` | `signs` (from `liftSigns`), `number?` | The body's "Signs …" heading as the section H2, the list as numbered rows, the paragraphs after it |
| `ServiceGlance` | `service`, `settings`, `number?` | "{Service}, the short version": the summary, then `service.atAGlance` facts and the standard rows (estimates, licence + ROC link, office hours with the live status) |
| `ServiceHero` | `service`, `heading`, `settings`, `crumbs` | `.ihero--copper` staged by `heroStaging(mainImage)`: `tint` (a job photo under the copper tint, priority), `split` (a photo of the crew in natural colour beside the words, framed on faces; on phones it comes first, under the header, so no face sits behind the call bar), `plain` (no company photo: copper light and the lit bulb). On phones the H1's size is capped by its longest word (`--word`), so a word like "Troubleshooting" fits a 320 px line |
| `AnswersBand` | `faqs`, `faqHeading`, `faqIntro?`, `posts` (`PostCard[]`), `guidesHeading`, `guidesIntro?`, `numbers?` | One sand band: `FaqBlock` then `GuidesBlock` ("All guides on the blog"); either alone still gets the band; both empty render nothing |
| `PostHeader` | `post`, `settings`, `crumbs`, `topic`, `minutes`, `cover` | The editorial head: crumbs (the title shortens with an ellipsis on phones), topic pill, "N min read", H1 `#post-h`, "By The Wire Guy Electric" (→ /about-us) or the author (→ /our-team), Published/Updated, "Reviewed by" only when set, the cover (4:3; alt only when it is the post's own image) |
| `QuickAnswer` | `text`, `service?` | The excerpt as the quick answer, with "See our {Service} service" |
| `ArticleToc` | `anchors` | "In this article", from three H2s up; hidden under 1000 px |
| `PostNav` | `prev?`, `next?` | Older / newer post |
| `CategoryHero` | `settings`, `crumbs`, `eyebrow`, `heading`, `lede?`, slot | `.ehero.chero`: crumbs, eyebrow, display H1, lede (or rich text in the slot), the buttons (hidden on phones, where the call bar has them), rating and ROC lines, the bulb |

### Helpers (`lib/cms.ts`)

- **Photos.** `heroStaging(image)`; `SERVICE_HERO_IMAGE` and `POST_COVER` (widths and sizes shared by the `<img>` and the preload); `FLEET_HERO` (the city hero's srcset incl. the enlarged fleet copies); `facesFocus(faces)` (an `object-position` that keeps every head in frame); `postCover(post, index, services, {tinted, taken, seed})`: the post's own image when it is a company photo, else its services' photos, else a job photo of the post's subject (each `JOB_PHOTOS` entry in `lib/brand-photos.ts` names its subject; a post's subject comes from its own and its services' job photos and its blog topic), else one that suits any guide (the EV charger photo is `narrow`: EV guides only); `taken` keeps a row (and the post's own cover) free of repeats.
- **Picks.** `pickReviews(tagged, pool, seed)` (the page's own reviews first, 50–600 characters, rotated by `seed` so neighbouring pages differ), `cityGuides` / `serviceGuides` (featured posts first: `post.featured`), `guideCards(posts, index, services, seed, taken)` (covers + topic labels), `postTopic`, `postCity`, `readingMinutes`, `mergeFaqs(lists, max = 7)` (own first, each question once).
- **Text.** `liftSigns(body)` (lifts a "Signs …" heading with three or more list items out of the body), `articleHtml(body, options)` (rich text with ids on every H2), `headingAnchors(body)`, `withoutTitleHeading(body, title)` (drops a body H2 that repeats the H1), `cityAccent`, `listOf`, `blockText`.
- **Queries** (`lib/queries.ts`): `getServiceFaqs(serviceId)` (FAQs tagged with a service) and `getPostIndex()` (every post with its services' slugs and plain text, memoised, for topics, covers and reading time).

### Company photos only (`lib/brand-photos.ts`)

`companyPhoto(image)` answers `'people'` (a photo with head boxes in `PHOTO_FACES`), `'job'` (listed in `JOB_PHOTOS`) or `undefined` (stock, or unknown): the templates show only the first two, so **a new job photo must be added to `JOB_PHOTOS`** (and a new photo of people to `PHOTO_FACES`) before cards, heroes and covers use it. `WALK_PHOTO` is the city glance photo.

### Styles

| File | Imported by | Holds |
|---|---|---|
| `styles/cms.css` | city, service and category pages | the office in the trust card (`.itrust__office`; the office's own styles are in `inner.css`), `.ihero--office` and the city hero's lower photo at 1100–1399 px (faces clear of the card and buttons), `.ihero--plain` and `.ihero--split` service heroes, `.local-note`, `.svc-rows`, the city and service prose variants, `.facts__status`, `.chero`, `.topic-hubs` |
| `styles/post.css` | post pages | the editorial head and cover, the quick answer, `.prose--post` (18 px, real H2/H3), the TOC, the sticky contact card, `.post-local`, `.post-nav` |

### Content the templates read (migration pipeline)

`scripts/migrate/content/cms-templates.mjs` with `migration/content-data/cms-templates.json` (runs after `page-sections`): `post.featured` on the most-read guides, the EV charger service's crew photo in place of its stock image, alt text for the services' own photos, `service.atAGlance` facts (each quotes its evidence, which must be word for word in the service body or the named /faq answer, or the import fails), `textFixes` (typing slips the export carries, e.g. "afternoon?The"; each must match exactly once) and removal of the SEO tool's `sbb-itb-…` marker headings from a post body.

### Checks (scratch tools, as run for this template set)

Overflow at 360/390/768/1024 on all 89 URLs, faces (heroes at 26 sizes plus 1100–1400 px), glyph clipping (15 states), axe at 390 and 1440 (with and without JS), JS-off text and visibility against JS-on, and glued words: see the T1 CMS hand-off for the numbers.

---

## 14. Inner-page sections (the page-builder pages)

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
| `officeLocationsSection` → `OfficeLocations` (+ `OfficeCard`, §13) | `section`, `settings`, `number?` | `<address>` cards (`.offices` frames them on paper): the profile name with "(by appointment)", street lines, phone (the main line when the office has none), "Find us on Google" → its profile. No hours (not confirmed per office) |
| `servicesSection` `featured` (not home) → `FeaturedServices` | `section`, `number?` | The section's picked cards as `ServiceTile`s (§13) on real photos: photo on top, words on paper, the title the one link. The homepage keeps its eight-tile mosaic |
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

The approved mockup, built from the shared parts: `.ehero` (trail, eyebrow, H1 "Get a free estimate" with "estimate" in copper, lede, the drawn bulb that waits unlit and switches on when the request is sent, `data-est-page`), `.est-page` (`EstimateForm` "Request your free estimate", `anchor="estimate"`, beside "What happens next": three steps on the copper wire, then "Prefer to talk?" with the phone, Emma's status, hours, rating, licence and "Family-owned in Mesa since 2017" from Site settings), three `ReviewsStatic` reviews about the process (picked by author; a missing one is left out) and "Before you send it" (four questions; "Contact us today" in an answer points at `#estimate`). `ContactPage` + `FAQPage` + breadcrumbs; the call bar's Free Estimate goes to `#estimate`. Indexable and in `sitemap.xml`; the old `/estimate` → `/contact-us` redirect is gone, and the migration keeps content links to `/estimate`. Rich-text links whose words ask for a free estimate ("Get a free estimate", "request a free estimate", "free estimates") and pointed at `/contact-us` (or the old homepage form, `/#contact`) on the live site are moved to `/estimate` by the migration (`estimateHref` in `webflow-to-sanity.mjs`, mirrored in `verify-content.mjs`); plain "Contact us" links stay.
