// Page-builder sections for the 9 static pages (index, about-us, our-team,
// careers, faq, contact-us, services, blog, commercial-electrician).
//
// Every visible string comes from migration/page-content/<page>.json, a verbatim
// copy of the live page (discovery inventory, 2026-10-13). The helpers below look
// strings up by section and tag and fail if they are missing, so nothing here is
// retyped. Photos are real company photos uploaded to Sanity
// (migration/brand-photos/assets.json); their asset documents are added to the
// NDJSON so references resolve locally and the import replaces them unchanged.
//
// Besides page.sections this module:
//   - creates teamMember docs for the 3 people on /our-team who had none
//     (Blake Thompson, Brandon Connelly, Stephanie Langford: name, role, photo);
//   - rewrites jobOpening.description to the job copy visible on /careers, so the
//     page and its JobPosting structured data say the same thing, and sets
//     minExperienceMonths from the years that copy asks for;
//   - sets siteSettings.defaultOgImage to the crew portrait, the share image of
//     pages without a photo of their own.
//
// The H1 of each page stays page.heading; no section repeats it. Titles, meta
// descriptions and slugs are not touched (checked before returning).
// What was left out, and why, is listed in migration/page-content/_omissions.json
// and checked by scripts/migrate/verify-content.mjs.

import * as cheerio from 'cheerio'

const CONTENT_DIR = 'migration/page-content/'
const ASSETS = 'migration/brand-photos/assets.json'

export default async function pageSections(ctx) {
  const {docs, push, idFor, readJson, toPortableText, plainBlocks, report} = ctx

  // ---------------------------------------------------------------------------
  // Lookups

  const ofType = (type) => docs.filter((d) => d._type === type)
  const bySlug = (type, s) => {
    const doc = docs.find((d) => d._type === type && d.slug?.current === s)
    if (!doc) throw new Error(`page-sections: no ${type} with slug "${s}"`)
    return doc
  }
  const settings = docs.find((d) => d._id === 'siteSettings')
  const norm = (s) => (s ?? '').normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
  const unquote = (s) => s.replace(/^\s*[“"]\s*/, '').replace(/\s*[”"]\s*$/, '')
  const stripEmoji = (s) => s.replace(/\p{Extended_Pictographic}️?/gu, '').trim()
  // Eyebrows start with a capital, like every other label on the site ("established in 2017" → "Established in 2017").
  const eyebrowCase = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  // A live title-case label in the eyebrows' sentence case ("Our Team" → "Our team").
  const sentenceCase = (s) => eyebrowCase(s.toLowerCase())
  // Small words lower-case inside a title, like the sibling headings ("Pricing And Cost" → "Pricing and Cost").
  const titleCase = (s) => s.replace(/ (And|Or|Of|The|For|To|In) /g, (m) => m.toLowerCase())

  const reference = (doc, key) => ({_type: 'reference', _ref: doc._id, ...(key ? {_key: key} : {})})
  const service = (s) => bySlug('service', s)
  const location = (s) => bySlug('location', s)
  const teamByName = (name) => docs.find((d) => d._type === 'teamMember' && norm(d.name) === norm(name))
  const faqByQuestion = (q) => {
    const doc = ofType('faq').find((f) => norm(f.question) === norm(q))
    if (!doc) throw new Error(`page-sections: no faq document for "${q}"`)
    return doc
  }
  const faqRefs = (questions) => questions.map((q, i) => reference(faqByQuestion(q), `faq${i}`))
  const link = (label, href) => ({_type: 'linkItem', label, href})

  // Live copy, by section and tag. item()/text() throw when the string isn't there, so
  // a change to the page-content file can't silently drop copy.
  const pages = {}
  for (const slug of ['index', 'about-us', 'our-team', 'careers', 'faq', 'contact-us', 'services', 'blog', 'commercial-electrician']) {
    pages[slug] = await readJson(`${CONTENT_DIR}${slug}.json`)
  }
  const copyOf = (slug) => {
    const page = pages[slug]
    const items = (section, tag) => page.copy.filter((c) => String(c.section) === String(section) && c.tag === tag)
    const item = (section, tag, n = 0) => {
      const found = items(section, tag)[n]
      if (!found) throw new Error(`page-sections: ${slug} section ${section} has no ${tag} #${n}`)
      return found
    }
    return {
      items,
      item,
      text: (section, tag, n) => item(section, tag, n).text,
      texts: (section, tag) => items(section, tag).map((c) => c.text),
      /** The highlighted words of a heading (<span class="accent">…</span>). */
      accent: (section, tag, n) => {
        const html = item(section, tag, n).html
        const $ = cheerio.load(`<body>${html ?? ''}</body>`)
        const accent = $('.accent').first().text().trim()
        if (!accent) throw new Error(`page-sections: ${slug} section ${section} ${tag} has no accent`)
        return accent
      },
    }
  }
  const htmlLines = (html) => {
    const $ = cheerio.load(`<body>${html.replace(/<br\s*\/?>/gi, '\n')}</body>`)
    return $('body')
      .text()
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  }
  const htmlFragments = (html) => html.split(/<br\s*\/?>/i).map((h) => h.trim()).filter((h) => cheerio.load(`<body>${h}</body>`)('body').text().trim())

  // ---------------------------------------------------------------------------
  // Photos (asset documents are added to the NDJSON at the end)

  const assets = await readJson(ASSETS)
  const assetEntries = [...assets.photos, ...assets.existing]
  const usedAssets = new Map()
  const asset = (fileOrId) => {
    const entry = assetEntries.find((a) => a.file === fileOrId || a.assetId === fileOrId)
    if (!entry) throw new Error(`page-sections: no brand photo "${fileOrId}" in ${ASSETS}`)
    usedAssets.set(entry.assetId, entry.document)
    return entry
  }
  const photo = (fileOrId) => {
    const entry = asset(fileOrId)
    return {_type: 'image', asset: {_type: 'reference', _ref: entry.assetId}, alt: entry.alt}
  }
  const galleryImage = (fileOrId, serviceSlug, key) => {
    const entry = asset(fileOrId)
    return {
      _type: 'galleryImage',
      _key: key,
      asset: {_type: 'reference', _ref: entry.assetId},
      alt: entry.alt,
      ...(serviceSlug ? {service: reference(service(serviceSlug))} : {}),
    }
  }

  // ---------------------------------------------------------------------------
  // Shared building blocks

  const notes = []

  // The closing band: the live pages that have it show exactly siteSettings.ctaBand
  // (heading, button, "Free estimates available"), so the section leaves its CTA empty
  // and uses the shared band. If the shared band no longer matches the live copy, the
  // section keeps its own copy instead (noted in report.json).
  const ctaBand = (slug, section) => {
    const c = copyOf(slug)
    const band = settings.ctaBand ?? {}
    const live = {
      heading: c.text(section, 'h2'),
      label: c.text(section, 'button'),
      href: c.item(section, 'button').href,
      statusText: c.texts(section, 'p').map(stripEmoji).find(Boolean),
    }
    const same = ['heading', 'label', 'href', 'statusText'].every((k) => norm(live[k]) === norm(band[k]))
    if (same) return {_type: 'ctaSection', _key: 'cta'}
    // The shared band was edited since the copy was captured: keep this page's own copy.
    notes.push(`${slug}: siteSettings.ctaBand differs from the live band; the section stores its own CTA`)
    return {_type: 'ctaSection', _key: 'cta', cta: {_type: 'callToAction', ...live}}
  }

  // City tiles: the live tiles' cities first (Mesa is listed first by includeHomeCity),
  // then the cities without a tile, in the order /faq lists them.
  const FAQ_CITY_ORDER = ['gilbert', 'chandler', 'scottsdale', 'phoenix', 'tempe', 'queen-creek', 'san-tan-valley', 'apache-junction', 'fountain-hills', 'ahwatukee']
  const cityPicks = (slug, section) => {
    const tiles = pages[slug].links.filter((l) => String(l.section) === String(section) && l.kind === 'cardLink').map((l) => l.href)
    const fromTiles = tiles.filter((h) => h.startsWith('/locations/')).map((h) => h.replace('/locations/', ''))
    const all = [...fromTiles, ...FAQ_CITY_ORDER.filter((s) => !fromTiles.includes(s))]
    if (all.length !== ofType('location').length) throw new Error('page-sections: city list does not cover every location')
    return all.map((s) => reference(location(s), s))
  }
  const locationsSection = (slug, section, key = 'areas') => {
    const c = copyOf(slug)
    return {
      _type: 'locationsSection',
      _key: key,
      heading: c.text(section, 'h2'),
      headingAccent: c.accent(section, 'h2'),
      locations: cityPicks(slug, section),
      includeHomeCity: true,
    }
  }

  // Feature cards from a live section: H3 title, paragraph, text link, Font Awesome icon.
  const FA_ICONS = {'fa-plug': 'plug', 'fa-bolt': 'bolt', 'fa-lightbulb': 'bulb', 'fa-circle-check': 'check'}
  const featureCards = (slug, sectionIndex) => {
    const section = pages[slug].sections.find((s) => String(s.index) === String(sectionIndex))
    return section.content
      .filter((n) => n.kind === 'featureCard')
      .map((card, i) => {
        const get = (type) => card.children.find((n) => n.type === type)
        const button = get('button')
        return {
          _type: 'featureItem',
          _key: `card${i}`,
          title: get('heading').text,
          text: get('paragraph').text,
          icon: FA_ICONS[get('icon').icon],
          link: link(button.label, button.href),
        }
      })
  }

  // Featured service cards: live title and blurb, linked to the service, on a photo of that
  // work (a brand photo by file name, or an image object).
  const serviceCards = (slug, sectionIndex, cards) => {
    const section = pages[slug].sections.find((s) => String(s.index) === String(sectionIndex))
    const live = section.content.filter((n) => n.kind === 'serviceCard')
    if (live.length !== cards.length) throw new Error(`page-sections: ${slug} has ${live.length} service cards, expected ${cards.length}`)
    return live.map((card, i) => {
      const {service: s, image} = cards[i]
      return {
        _type: 'serviceCard',
        _key: s,
        service: reference(service(s)),
        title: card.children.find((n) => n.type === 'heading').text,
        text: card.children.find((n) => n.type === 'paragraph').text,
        image: typeof image === 'string' ? photo(image) : image,
      }
    })
  }

  // Hero quotes: the live one-liners without their quotation marks (the design adds them).
  const quotes = (slug, n) =>
    copyOf(slug)
      .texts(0, 'p')
      .slice(0, n)
      .map((t, i) => {
        if (!/^[“"]/.test(t)) throw new Error(`page-sections: ${slug} hero quote ${i} is not a quote: ${t}`)
        return {_type: 'reviewSnippet', _key: `quote${i}`, text: unquote(t), rating: 5}
      })

  // ---------------------------------------------------------------------------
  // New team members (on /our-team, no teamMember document yet)

  const created = []
  {
    const cards = pages['our-team'].sections.find((s) => s.index === 1).content.filter((n) => n.kind === 'teamMemberCard')
    cards.forEach((card, order) => {
      const [name, role] = htmlLines(card.children.find((n) => n.type === 'heading').html)
      const bio = card.children.find((n) => n.type === 'paragraph')?.text
      const existing = teamByName(name)
      if (existing) {
        if (norm(existing.role) !== norm(role)) throw new Error(`page-sections: ${name}'s role "${existing.role}" differs from /our-team "${role}"`)
        return
      }
      const slug = name.toLowerCase().replace(/[^a-z]+/g, '-')
      const file = `team-${slug}.jpg`
      push({
        _id: idFor(`team:${slug}`),
        _type: 'teamMember',
        name,
        slug: {_type: 'slug', current: slug},
        role,
        photo: photo(file),
        ...(bio ? {bio: plainBlocks(bio)} : {}),
        showOnTeamPage: true,
        order,
      })
      created.push({type: 'teamMember', name, role})
    })
  }
  const member = (name) => {
    const doc = teamByName(name)
    if (!doc) throw new Error(`page-sections: no teamMember "${name}"`)
    return doc
  }

  // ---------------------------------------------------------------------------
  // Job opening: the visible /careers copy becomes the job's description.

  {
    const c = copyOf('careers')
    const html = c.item(1, 'p').html
    const [intro, title, type, ...rest] = htmlFragments(html)
    const text = (h) => cheerio.load(`<body>${h}</body>`)('body').text().replace(/\s+/g, ' ').trim()
    const jobs = ofType('jobOpening')
    if (jobs.length !== 1) throw new Error(`page-sections: expected 1 jobOpening, found ${jobs.length}`)
    const job = jobs[0]
    if (norm(text(title)) !== norm(job.title)) throw new Error(`page-sections: job title "${job.title}" differs from /careers "${text(title)}"`)
    if (text(type) !== '(Full-time)' || job.employmentType !== 'FULL_TIME') throw new Error('page-sections: /careers job type is not Full-time')
    // Fragments after the type line: the duties paragraph, then "What you need: …".
    // The live markup closes the bold run inside the type line; drop that stray tag.
    const paragraphs = rest.map((h) => h.replace(/^<\/strong>/, ''))
    job.description = toPortableText(paragraphs.map((h) => `<p>${h}</p>`).join(''), '/careers')
    // JobPosting experienceRequirements (ST-08): "4+ years of residential service experience" → 48
    const years = text(paragraphs.join(' ')).match(/(\d+)\+? years of residential service experience/)
    if (!years) throw new Error('page-sections: the /careers job copy no longer states the years of experience it asks for')
    job.minExperienceMonths = Number(years[1]) * 12
    // The bold opening sentence stays on the page as the jobs section intro.
    pages.careers.jobIntro = text(intro)
  }

  // ---------------------------------------------------------------------------
  // Default share image (ST-03): the crew portrait, a real photo of the team, for pages
  // with no photo of their own (home, cities, /blog, /faq, /careers) instead of the
  // stock-style /og-default.png. The 1200×630 crop keeps all six faces.

  settings.defaultOgImage = photo('crew-portrait.avif')

  // ---------------------------------------------------------------------------
  // Pages

  const sections = {}

  // Home -----------------------------------------------------------------------
  {
    const slug = 'index'
    const c = copyOf(slug)
    const [, , , heroText, trustLine] = c.texts(0, 'p')

    // The hero keeps its own quotes (the same live strings as siteSettings.heroQuotes).
    const heroQuotes = quotes(slug, 3)

    // Team intro: "At The Wire Guy Electric, Steven … Cody … Emma …", each name a
    // team-member mention (rendered with the person's photo, linked to /our-team).
    const introItem = c.item(1, 'text')
    const $ = cheerio.load(`<body>${introItem.html}</body>`)
    const children = []
    const markDefs = []
    $('body')
      .contents()
      .each((i, node) => {
        const text = $(node).text()
        if (!text) return
        if (node.tagName === 'a') {
          const person = docs.find((d) => d._type === 'teamMember' && d.name.split(' ')[0] === text.trim())
          if (!person) throw new Error(`page-sections: team intro names "${text}", who has no teamMember document`)
          const key = `m${markDefs.length}`
          markDefs.push({_key: key, _type: 'teamMemberMention', member: reference(person)})
          children.push({_type: 'span', _key: `s${i}`, text, marks: [key]})
        } else children.push({_type: 'span', _key: `s${i}`, text, marks: []})
      })
    const introBody = [{_type: 'block', _key: 'intro', style: 'normal', markDefs, children}]

    // Capabilities and value props are the shared Site settings lists (set by the fixes
    // module from this page). Point at them when they still hold this page's copy;
    // otherwise keep the live copy in the section.
    const caps = c.texts(2, 'h3')
    const sameCaps = JSON.stringify(caps.map(norm)) === JSON.stringify((settings.capabilities ?? []).map((i) => norm(i.title)))
    const cards = featureCards(slug, 3)
    const sameCards =
      JSON.stringify(cards.map((i) => [i.title, i.text, i.link.label, i.link.href].map(norm))) ===
      JSON.stringify((settings.valueProps ?? []).map((i) => [i.title, i.text, i.link?.label, i.link?.href].map(norm)))
    if (!sameCaps) notes.push('index: siteSettings.capabilities differ from the live checklist; the section stores its own items')
    if (!sameCards) notes.push('index: siteSettings.valueProps differ from the live cards; the section stores its own items')
    const capabilityItems = caps.map((title, i) => {
      const shared = (settings.capabilities ?? []).find((item) => norm(item.title) === norm(title))
      return {_type: 'featureItem', _key: `item${i}`, title, icon: 'check', ...(shared?.service ? {service: shared.service} : {}), ...(shared?.link ? {link: shared.link} : {})}
    })

    // The composition of the approved round-5 homepage (redesign/round5/final/home.html):
    //   hero · 01 who we are · our promise · 02 services · 03 what we do · a review pulled
    //   out over the lights it praises · 04 how it works · 05 reviews · 06 the valley ·
    //   07 our work · 08 questions · 09 guides · 10 the estimate band.
    // Live copy is looked up as everywhere in this module. Copy from the business's
    // other pages goes through verbatim(), and the review excerpt through quoted(), so
    // a retyped word fails the run. The few strings typed here are the mockup's short
    // headings, eyebrows and captions (NEW in round 5, approved by the owner); they
    // state no new fact. Owner, round 5: minimise permit talk on the homepage, so no
    // permit step, question, guide or heading here (permits stay on the service, city,
    // FAQ and blog pages).
    const verbatim = (source, text) => {
      if (!pages[source].copy.some((item) => norm(item.text).includes(norm(text)))) throw new Error(`page-sections: "${text}" is not on the live /${source} page`)
      return text
    }
    const reviewBy = (name) => {
      const doc = ofType('review').find((r) => r.authorName === name)
      if (!doc) throw new Error(`page-sections: no review by ${name}`)
      return doc
    }
    const quoted = (review, text) => {
      if (!norm(review.text).includes(norm(text))) throw new Error(`page-sections: "${text}" is not in ${review.authorName}'s review`)
      return text
    }
    // The image a service or post already has (pre-import: "image@<webflow url>", which the
    // site maps to the same Sanity asset), with this section's own alt text.
    const imageOf = (type, docSlug, alt, extra = {}) => {
      const source = bySlug(type, docSlug).mainImage?._sanityAsset
      if (!source) throw new Error(`page-sections: ${type} ${docSlug} has no main image`)
      return {_type: 'image', _sanityAsset: source, alt, ...extra}
    }
    // Where the photo sits in a frame that crops it (object-fit), as a hotspot centre.
    const focus = (x, y) => ({hotspot: {_type: 'sanity.imageHotspot', x, y, width: 0.3, height: 0.3}})
    // A crop rectangle in source pixels (x, y, width, height) of a W x H original.
    const crop = ([x, y, w, h], [W, H]) => ({crop: {_type: 'sanity.imageCrop', top: y / H, bottom: 1 - (y + h) / H, left: x / W, right: 1 - (x + w) / W}})
    const card = (serviceSlug, overrides = {}) => ({_type: 'serviceCard', _key: serviceSlug, service: reference(service(serviceSlug)), ...overrides})
    const liveCards = serviceCards(slug, 5, [
      {service: 'ev-charger-installation', image: 'ev-charger-garage.avif'},
      {service: 'recessed-lights-installation', image: 'kitchen-recessed-lighting.avif'},
      {service: 'electrical-troubleshooting', image: 'troubleshooting-ceiling-wiring.avif'},
    ])
    const liveCard = (serviceSlug, x, y) => {
      const live = liveCards.find((k) => k._key === serviceSlug)
      return {...live, image: {...live.image, ...focus(x, y)}}
    }
    const lastSentence = (text) => text.match(/[^.!?]+[.!?]$/)?.[0].trim() ?? text
    const post = (postSlug) => bySlug('post', postSlug)
    const postCard = (postSlug, label, coverWords, image) => ({_type: 'postCard', _key: postSlug, post: reference(post(postSlug)), label, coverWords, image})
    const susan = reviewBy('Susan Chambers')

    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: 'Family-owned in Mesa, Arizona · Since 2017',
        headingAccent: c.accent(0, 'h1'),
        text: heroText,
        image: photo('crew-portrait.avif'),
        primaryCta: link(c.text(0, 'button'), c.item(0, 'button').href),
        // Owner, round 4: a line under the buttons, in the business's own words
        // ("free estimates", "flat-rate pricing", "No pressure and no obligation.").
        ctaNotes: ['Free estimates and flat-rate pricing.', verbatim('faq', 'No pressure and no obligation.')],
        showPhone: true,
        trustLine,
        showTrustBar: true,
        reviewSnippets: heroQuotes,
      },
      {
        _type: 'teamIntroSection',
        _key: 'team-intro',
        eyebrow: 'Who we are',
        heading: 'The family behind the trucks.',
        headingAccent: 'the trucks.',
        showSummary: true,
        body: introBody,
        image: {...photo('lighting-install-vaulted-ceiling.avif'), caption: 'Our crew on the job'},
        cta: link(c.text(1, 'button'), c.item(1, 'button').href),
        secondaryCta: link('Meet the team', '/our-team'),
      },
      {
        _type: 'featureGridSection',
        _key: 'value-props',
        eyebrow: 'Our promise',
        // lifted from the Amazing Quality card: "get it done right the first time"
        heading: 'Done right the first time.',
        headingAccent: 'first time.',
        style: 'cards',
        ...(sameCards ? {siteList: 'valueProps'} : {items: cards}),
      },
      {
        _type: 'servicesSection',
        _key: 'top-services',
        eyebrow: 'Services',
        heading: c.text(5, 'h2'),
        headingAccent: 'services',
        intro: 'Residential and commercial electrical work, from small repairs to entire remodels.',
        layout: 'featured',
        // The live three (EV Chargers, Recessed Lights, Troubleshooting: their own titles,
        // blurbs and photos) among five more, each on a real photo. The small tiles carry the
        // last sentence of the service's own description; the commercial tile uses the photo
        // of the business's own pendant work (its service record has a stock photo).
        services: [
          card('panels', {image: {...photo('image-cb001b94a2ca55b0d2c7ccecb4b2641334220a3c-1280x1256-png'), ...focus(0.5, 0.34)}}),
          liveCard('ev-charger-installation', 0.6, 0.3),
          liveCard('electrical-troubleshooting', 0.26, 0.3),
          card('electrical-safety-inspections', {image: {...photo('image-573850cd5522597a7b86b1fc602e4e369ef9a9af-1125x1104-jpg'), ...focus(0.46, 1)}}),
          liveCard('recessed-lights-installation', 0.5, 0.4),
          card('custom-lighting', {
            text: 'Cabinet lighting cut and soldered to fit.',
            image: {...photo('image-49a454c64fdde0f5b5fc7b306b53f880eef5c97f-960x1280-jpg'), ...focus(0.5, 0.3)},
          }),
          card('exterior-electrical', {
            text: lastSentence(service('exterior-electrical').shortDescription),
            image: imageOf('service', 'exterior-electrical', 'Lamp posts lighting a brick front walk lined with roses', focus(0.5, 0.56)),
          }),
          card('commercial-service', {
            image: imageOf('service', 'hanging-lights', 'Rows of hanging Edison bulbs under the open timber beams and ductwork of a restaurant ceiling', focus(0.5, 0.3)),
          }),
        ],
        cta: link(c.texts(5, 'button').at(-1), c.items(5, 'button').at(-1).href),
      },
      {
        _type: 'featureGridSection',
        _key: 'capabilities',
        eyebrow: 'What we do',
        heading: c.text(2, 'h2'),
        headingAccent: c.accent(2, 'h2'),
        style: 'checklist',
        ...(sameCaps ? {siteList: 'capabilities'} : {items: capabilityItems}),
        image: imageOf('service', 'electrical-troubleshooting', 'Pliers, wire strippers and a voltage tester on a coil of yellow wire', crop([0, 1500, 3924, 2616], [3924, 5887])),
      },
      {
        _type: 'quoteSection',
        _key: 'pull-quote',
        quote: quoted(susan, 'A-maz-ing work! Everything looks like it was always there.'),
        review: reference(susan),
        image: imageOf('service', 'recessed-lights-installation', 'New recessed lights glowing in a vaulted kitchen ceiling', crop([0, 560, 4284, 3300], [4284, 5712])),
      },
      {
        _type: 'processStepsSection',
        _key: 'how-it-works',
        eyebrow: 'How it works',
        heading: 'From the first call to the finished job',
        headingAccent: 'finished job',
        intro: verbatim('faq', 'What you see on the invoice is what you get.'),
        // Only steps the business describes itself (the estimate band, /faq). No permit
        // step on the homepage (owner, round 5) and no warranty tag (owner, round 2).
        steps: [
          {_type: 'processStep', _key: 'call', title: 'Call or send the form', text: "Call us, or send the form and we'll call you back.", showContact: true},
          {_type: 'processStep', _key: 'estimate', title: 'Free estimate', text: verbatim('faq', "We'll come out, look at the job, and give you a straight answer on what it'll cost. No pressure and no obligation.")},
          {_type: 'processStep', _key: 'flat-rate', title: 'Flat-rate pricing', text: verbatim('faq', "We use flat-rate pricing, which means we quote you a price before we start and that's what you pay. No surprises.")},
        ],
      },
      {
        _type: 'reviewsSection',
        _key: 'reviews',
        eyebrow: 'Reviews',
        heading: c.text(4, 'h3'),
        headingAccent: 'speak for themselves',
        // every review, in the moving lanes
        limit: 0,
        cta: link(c.text(4, 'button'), c.item(4, 'button').href),
      },
      {
        ...locationsSection(slug, 7),
        eyebrow: 'Serving the whole Phoenix valley',
        intro: `${verbatim('faq', 'We travel all over the Phoenix Valley')}, for homes and businesses alike.`,
      },
      {
        _type: 'gallerySection',
        _key: 'gallery',
        eyebrow: 'Our work',
        heading: c.text('8.0', 'h2'),
        headingAccent: c.accent('8.0', 'h2'),
        intro: 'Real jobs and our own crew. No stock photos.',
        // in the mosaic's column order: the van and the kitchen, the charger and the tub,
        // the pickup and Steven with Cody
        images: [
          {...galleryImage('crew-at-van.avif', undefined, 'van'), caption: 'The crew and the van', ...focus(0.5, 0.4)},
          {
            ...imageOf('service', 'electrical-remodels', 'A finished kitchen remodel with recessed lights, white cabinets and a stone island', focus(0.5, 0.5)),
            _type: 'galleryImage',
            _key: 'kitchen',
            caption: 'Kitchen remodel, new circuits and lighting',
          },
          {...imageOf('post', 'installing-car-charger', 'A Tesla Wall Connector installed on a garage wall', focus(0.5, 0.4)), _type: 'galleryImage', _key: 'charger', caption: 'Tesla Wall Connector in a garage'},
          {...galleryImage('image-f9be117f7e0a911de638ca5b42fd0ca9a1caf0d8-3748x2811-jpg', undefined, 'tub'), caption: 'LED cove lighting around a tub', ...focus(0.5, 0.55)},
          {...galleryImage('crew-tailgate.avif', undefined, 'pickup'), caption: 'The crew and a company pickup', ...focus(0.5, 0.4)},
          {...galleryImage('steven-at-van.avif', undefined, 'steven-cody'), caption: 'Steven and Cody at the vans', ...focus(0.5, 0.42)},
        ],
        cta: link('Follow @thewireguyelectric', settings.sameAs.find((u) => /instagram\.com/.test(u))),
      },
      {
        _type: 'faqSection',
        _key: 'faqs',
        eyebrow: 'Questions',
        heading: 'Good questions, straight answers',
        intro: 'The things homeowners across the valley ask us most.',
        // No permit question here (owner, round 5), and not "What cities do you service?":
        // its answer counts the cities, and the valley above lists every one of them.
        faqs: faqRefs([
          'Do you offer free estimates?',
          'What types of electrical services do you offer?',
          'Do you have any hidden fees?',
          'Are you licensed, bonded, and insured?',
          'Can you tell me more about your business?',
        ]),
      },
      {
        _type: 'postsSection',
        _key: 'guides',
        eyebrow: 'Guides',
        heading: 'Guides from our electricians',
        intro: 'Plain-English answers to the questions Arizona homeowners ask us most.',
        // Tier-1 guides (Search Console), each on a real job photo. The permit guide and the
        // DIY guide (permits again) stay on the blog, the service pages and the city pages
        // (owner, round 5: minimise permit talk on the homepage).
        posts: [
          postCard('can-hot-weather-cause-your-circuit-breaker-to-trip', 'Troubleshooting', 'Heat and breakers', {
            ...photo('image-cb001b94a2ca55b0d2c7ccecb4b2641334220a3c-1280x1256-png'),
            ...focus(0.5, 0.42),
          }),
          postCard('outdated-wiring-in-older-phoenix-homes', 'Older homes', 'Old wiring', imageOf('service', 'electrical-troubleshooting', 'Pliers, wire strippers and a voltage tester on a coil of yellow wire', focus(0.5, 0.52))),
          postCard('tesla-wall-connector-vs-chargepoint-home-flex-phoenix', 'EV chargers', 'Tesla or ChargePoint', imageOf('post', 'installing-car-charger', 'A Tesla Wall Connector installed on a garage wall', focus(0.5, 0.42))),
        ],
        cta: link('All guides on the blog', '/blog'),
      },
      ctaBand(slug, '8.1'),
    ]
  }

  // ---------------------------------------------------------------------------
  // The other eight pages, composed for the round-5 design (the inner hero with its
  // trail, then the sections). Live copy is looked up as everywhere in this module;
  // copy from the business's other pages goes through fromPage() and reviews are found
  // by their author, so a retyped word fails the run. The few strings typed here
  // are short eyebrows, section headings and cover words in the approved mockups'
  // manner; they state no new fact. No "2-year warranty" tag anywhere (owner, round 2).

  const fromPage = (source, text) => {
    if (!pages[source].copy.some((item) => norm(item.text).includes(norm(text)))) throw new Error(`page-sections: "${text}" is not on the live /${source} page`)
    return text
  }
  const reviewNamed = (name) => {
    const doc = ofType('review').find((r) => r.authorName === name)
    if (!doc) throw new Error(`page-sections: no review by ${name}`)
    return doc
  }
  // The image a service or post already has, with this section's own alt text.
  const imageFrom = (type, docSlug, alt, extra = {}) => {
    const source = bySlug(type, docSlug).mainImage?._sanityAsset
    if (!source) throw new Error(`page-sections: ${type} ${docSlug} has no main image`)
    return {_type: 'image', _sanityAsset: source, alt, ...extra}
  }
  const hotspot = (x, y) => ({hotspot: {_type: 'sanity.imageHotspot', x, y, width: 0.3, height: 0.3}})
  // A crop rectangle in source pixels (x, y, width, height) of a W x H original.
  const cropRect = ([x, y, w, h], [W, H]) => ({crop: {_type: 'sanity.imageCrop', top: y / H, bottom: 1 - (y + h) / H, left: x / W, right: 1 - (x + w) / W}})
  const guide = (postSlug, label, coverWords, image) => ({_type: 'postCard', _key: postSlug, post: reference(bySlug('post', postSlug)), label, coverWords, image})
  // The live process steps (the homepage's "how it works", /faq answers word for word).
  const processSteps = () => [
    {_type: 'processStep', _key: 'call', title: 'Call or send the form', text: "Call us, or send the form and we'll call you back.", showContact: true},
    {_type: 'processStep', _key: 'estimate', title: 'Free estimate', text: fromPage('faq', "We'll come out, look at the job, and give you a straight answer on what it'll cost. No pressure and no obligation.")},
    {_type: 'processStep', _key: 'flat-rate', title: 'Flat-rate pricing', text: fromPage('faq', "We use flat-rate pricing, which means we quote you a price before we start and that's what you pay. No surprises.")},
  ]
  const estimateCta = (label = 'Get a Free Estimate') => link(label, '/estimate')

  // About us -------------------------------------------------------------------
  {
    const slug = 'about-us'
    const c = copyOf(slug)
    const names = pages[slug].sections
      .find((s) => s.index === 2)
      .content.filter((n) => n.kind === 'teamMemberCard')
      .map((card) => htmlLines(card.children.find((n) => n.type === 'heading').html)[0])
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: eyebrowCase(c.text(0, 'h5')),
        text: c.text(0, 'p'),
        image: photo('crew-at-van.avif'),
        showPhone: false,
        showTrustBar: false,
      },
      {
        _type: 'highlightsSection',
        _key: 'family',
        eyebrow: 'Who we are',
        heading: c.text(1, 'h3', 0),
        checklist: c.texts(1, 'li').map((text, i) => ({_type: 'highlightItem', _key: `point${i}`, text})),
        // Live: "See all services" pointed at /contact-us; the label is kept and the
        // link now goes where it says (listed in _omissions.json).
        cta: link(c.text(1, 'button'), '/services'),
        image: photo('crew-tailgate.avif'),
        asideHeading: c.text(1, 'h3', 1),
        asideBody: plainBlocks(c.text(1, 'p')),
      },
      {
        // Facts already on the site: founded 2017, the ROC license and the rating (Site
        // settings) and "over 30 years of combined experience" (this page).
        _type: 'trustBarSection',
        _key: 'trust',
        items: [
          {_type: 'trustItem', _key: 'founded', fact: 'founded', icon: 'calendar'},
          {_type: 'trustItem', _key: 'experience', fact: 'custom', value: '30+', label: 'years of combined experience', icon: 'clock'},
          {_type: 'trustItem', _key: 'license', fact: 'license', label: 'Licensed, bonded, and insured', icon: 'badge'},
          {_type: 'trustItem', _key: 'reviews', fact: 'reviews', icon: 'star'},
        ],
      },
      {
        _type: 'teamSection',
        _key: 'team',
        eyebrow: sentenceCase(c.text(2, 'h6')),
        heading: c.text(2, 'h2'),
        // The six people this page shows, in its order. Bios come from their documents,
        // which hold the current /our-team copy (this page had an older version).
        members: names.map((n) => reference(member(n), member(n).slug.current)),
        showBios: true,
        cta: link(c.text(2, 'button'), c.item(2, 'button').href),
      },
      // Every city we serve, on the valley's atlas (the live tiles' wording).
      {...locationsSection('index', 7), eyebrow: 'Where we work'},
      ctaBandShared(),
    ]
  }

  // Our team -------------------------------------------------------------------
  {
    const slug = 'our-team'
    const c = copyOf(slug)
    const quote = c.texts(2, 'p')[0]
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: 'Family-owned · Since 2017',
        text: c.text(0, 'p'),
        // the whole crew, faces large enough to read at every width (the fleet photo's people are tiny)
        image: photo('crew-portrait.avif'),
        showPhone: false,
        showTrustBar: false,
      },
      // Everyone marked "show on team page", by order: the 9 people this page lists.
      {_type: 'teamSection', _key: 'team', eyebrow: 'The people', heading: c.text(1, 'h2'), showBios: true},
      {
        _type: 'quoteSection',
        _key: 'quote',
        eyebrow: c.text(2, 'h6'),
        heading: c.text(2, 'h2'),
        subheading: c.text(2, 'h3'),
        quote: unquote(quote),
        person: reference(member(c.text(2, 'h5'))),
        image: photo('crew-tailgate.avif'),
      },
      {
        _type: 'faqSection',
        _key: 'faqs',
        eyebrow: 'Questions',
        heading: c.text(3, 'h2'),
        image: photo('crew-at-van.avif'),
        faqs: faqRefs(c.texts(3, 'faq-q (h5)')),
      },
      // Live status line "Active Now" is not carried over (see _omissions.json).
      ctaBandShared(),
    ]
  }

  // Careers --------------------------------------------------------------------
  {
    const slug = 'careers'
    const c = copyOf(slug)
    const points = c.items(1, 'li').map((li, i) => {
      const m = li.html.match(/^<strong>(.*?)<\/strong>\s*[—–-]\s*(.*)$/s)
      if (!m) throw new Error(`page-sections: careers point ${i} has no bold lead`)
      const text = (h) => cheerio.load(`<body>${h}</body>`)('body').text().trim()
      return {_type: 'highlightItem', _key: `point${i}`, lead: text(m[1]), text: text(m[2])}
    })
    const success = c.items(2, 'form-success')[0]
    const apply = c.item(1, 'button')
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: c.text(0, 'h5'),
        text: c.text(0, 'p'),
        // shown whole (HeroInner): the crop takes off the photo's top-left corner, a sliver of a second person
        // under a dark band (about 32 px in from the left and 33 px down from the top of the 1280×853 original)
        image: {...photo('tech-looking-at-van.avif'), crop: {_type: 'sanity.imageCrop', top: 0.04, left: 0.03, bottom: 0, right: 0}},
        primaryCta: link(apply.text, '#apply-now'),
        showPhone: false,
        showTrustBar: false,
      },
      {
        _type: 'highlightsSection',
        _key: 'why-us',
        eyebrow: 'Why us',
        heading: c.text(1, 'h3', 0),
        checklist: points,
        cta: link(apply.text, apply.href),
        image: photo('crew-tailgate.avif'),
      },
      // The job itself (title, Full-time, duties, requirements) renders from the
      // jobOpening document, which also feeds the JobPosting structured data.
      {_type: 'jobsSection', _key: 'openings', heading: c.text(1, 'h3', 1), intro: pages.careers.jobIntro},
      {
        // The people you'd work with (their portraits; bios on /our-team).
        _type: 'teamSection',
        _key: 'team',
        eyebrow: 'The team',
        heading: 'Who you’d work with',
        showBios: false,
        cta: link('Meet the team', '/our-team'),
      },
      {
        // _key doubles as the anchor the "Apply Now" button targets (#apply-now).
        _type: 'contactSection',
        _key: 'apply-now',
        eyebrow: eyebrowCase(c.text(2, 'h6')),
        heading: c.text(2, 'h3', 0),
        text: c.text(2, 'p'),
        detailsHeading: c.text(2, 'h5'),
        contactDetails: ['offices', 'phone', 'email'],
        formType: 'careers',
        formHeading: c.text(2, 'h3', 1),
        submitLabel: c.text(2, 'form-submit'),
        successMessage: success.text,
      },
    ]
  }

  // FAQ ------------------------------------------------------------------------
  {
    const slug = 'faq'
    // Each visible group is one faq topic (set by the fixes module from this page), so
    // the sections pull by topic and stay in sync when an editor adds a question.
    const topicOf = (questions) => {
      const topics = [...new Set(questions.map((q) => faqByQuestion(q).topic))]
      if (topics.length !== 1 || !topics[0]) throw new Error(`page-sections: FAQ group spans topics ${JSON.stringify(topics)}`)
      // The topic, sorted by `order`, must show the visible questions in their live
      // order (questions added later may sit between or after them).
      const ordered = ofType('faq')
        .filter((f) => f.topic === topics[0])
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || (a._id < b._id ? -1 : a._id > b._id ? 1 : 0))
        .map((f) => norm(f.question))
      const positions = questions.map((q) => ordered.indexOf(norm(q)))
      if (positions.some((p, i) => p < 0 || (i > 0 && p < positions[i - 1]))) {
        throw new Error(`page-sections: topic ${topics[0]} does not list the visible questions in their live order`)
      }
      return topics[0]
    }
    const groups = pages.faq.faqGroups
    const [common, customers, ...topicGroups] = groups
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        // the live meta description's words
        eyebrow: 'Straight answers from a licensed Mesa electrician',
        image: photo('lighting-install-vaulted-ceiling.avif'),
        showPhone: false,
        showTrustBar: false,
      },
      {
        _type: 'faqSection',
        _key: 'common',
        eyebrow: 'The basics',
        heading: common.heading.text,
        // the photos are shown whole beside the questions: the landscape crew photo by the three basics, the
        // portrait of Steven and Cody by the longer list of customers' questions, so neither leaves an empty column
        image: photo('crew-at-van.avif'),
        topic: topicOf(common.items.map((q) => q.question)),
      },
      {
        _type: 'faqSection',
        _key: 'customers',
        eyebrow: 'From our customers',
        heading: customers.heading.text,
        // Steven and Cody at the vans, in colour like every other photo on the site
        image: photo('steven-at-van.avif'),
        topic: topicOf(customers.items.map((q) => q.question)),
      },
      {
        // The five topic groups had H3 headings and no section heading on the live page.
        _type: 'faqSection',
        _key: 'topics',
        eyebrow: 'Questions by topic',
        groups: topicGroups.map((g, i) => ({
          _type: 'faqGroup',
          _key: `group${i}`,
          heading: titleCase(g.heading.text),
          topic: topicOf(g.items.map((q) => q.question)),
        })),
      },
      ctaBand(slug, 4),
    ]
  }

  // Contact us -----------------------------------------------------------------
  {
    const slug = 'contact-us'
    const c = copyOf(slug)
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: 'Free estimates · No pressure and no obligation',
        text: c.text(0, 'p'),
        image: photo('steven-at-van.avif'),
        // to the form below (the section's key is its anchor)
        primaryCta: link(c.text(1, 'h3', 1), '#contact'),
        showPhone: true,
        showTrustBar: false,
      },
      {
        _type: 'contactSection',
        _key: 'contact',
        eyebrow: eyebrowCase(c.text(1, 'h6')),
        heading: c.text(1, 'h3', 0),
        text: c.text(1, 'p'),
        detailsHeading: c.text(1, 'h5'),
        // The live block showed the Mesa address, phone and email; the Scottsdale office
        // (the Mesa address is the owners' home: footer only) and the hours now come from
        // Site settings.
        contactDetails: ['offices', 'phone', 'email', 'hours'],
        formType: 'estimate',
        formHeading: c.text(1, 'h3', 1),
        submitLabel: c.text(1, 'form-submit'),
        successMessage: c.text(1, 'form-success'),
      },
      {
        // Reassurance next to the form, each fact from live copy: "Free estimates
        // available" (CTA band), "Flat-rate pricing with no hidden fees" (this page's
        // meta description), the ROC license and the rating (Site settings).
        _type: 'trustBarSection',
        _key: 'trust',
        items: [
          {_type: 'trustItem', _key: 'estimates', fact: 'custom', value: 'Free', label: 'estimates available', icon: 'clipboard'},
          {_type: 'trustItem', _key: 'pricing', fact: 'custom', value: 'Flat-rate', label: 'pricing with no hidden fees', icon: 'dollar'},
          {_type: 'trustItem', _key: 'license', fact: 'license', icon: 'badge'},
          {_type: 'trustItem', _key: 'reviews', fact: 'reviews', icon: 'star'},
        ],
      },
      {...locationsSection('index', 7), eyebrow: 'Where we work'},
      {
        _type: 'faqSection',
        _key: 'faqs',
        eyebrow: 'Questions',
        heading: copyOf('faq').text(1, 'h2'),
        // The "can you help me with this?" questions people ask before they get in touch. Not "What cities do you
        // service?" (its answer counts the cities; the valley above names every one) nor the weekends question (its
        // answer carries the "For true emergencies…" line the owner removed).
        faqs: faqRefs([
          'Do you offer free estimates?',
          'I want to upgrade my lighting, but I don’t know what to do. Can you help me with the design?',
          'I have another non-electrical project but don’t know where to start. Can you refer me to someone?',
        ]),
      },
    ]
  }

  // Services -------------------------------------------------------------------
  {
    const slug = 'services'
    const c = copyOf(slug)
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: 'Residential and commercial',
        text: c.text(0, 'p'),
        image: photo('crew-tailgate.avif'),
        primaryCta: estimateCta(),
        showPhone: true,
        showTrustBar: false,
      },
      // Every service once, under its category (replaces the three hidden tab panes).
      {_type: 'servicesSection', _key: 'all-services', eyebrow: 'Every service', layout: 'grouped'},
      // How an estimate and the price work, in the business's own words (/faq).
      {
        _type: 'processStepsSection',
        _key: 'how-it-works',
        eyebrow: 'How it works',
        heading: 'From the first call to a flat-rate price',
        headingAccent: 'flat-rate price',
        intro: fromPage('faq', 'What you see on the invoice is what you get.'),
        steps: processSteps(),
      },
      // No price table: the owner doesn't want à-la-carte pricing on the site (2026-10-13).
      // Prices stay where the business already publishes them, inside the /faq answers.
      {...locationsSection('index', 7), eyebrow: 'Where we work'},
      {
        _type: 'faqSection',
        _key: 'faqs',
        eyebrow: 'Questions',
        heading: copyOf('faq').text(2, 'h2'),
        faqs: faqRefs([
          'What types of electrical services do you offer?',
          'Are there any services you don’t offer?',
          'Do you offer free estimates?',
          'Do you have any hidden fees?',
        ]),
      },
      // Live status line "Active Now" is not carried over (see _omissions.json).
      ctaBandShared(),
    ]
  }

  // Blog -----------------------------------------------------------------------
  {
    const slug = 'blog'
    const c = copyOf(slug)
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: 'Guides from our electricians',
        text: c.text(0, 'p'),
        image: photo('troubleshooting-ceiling-wiring.avif'),
        showPhone: false,
        showTrustBar: false,
      },
      {
        // The three most-read guides (Search Console), each on a real job photo.
        _type: 'postsSection',
        _key: 'most-read',
        eyebrow: 'Most read',
        heading: 'The guides homeowners read most',
        posts: [
          guide('can-hot-weather-cause-your-circuit-breaker-to-trip', 'Troubleshooting', 'Heat and breakers', {...photo('image-cb001b94a2ca55b0d2c7ccecb4b2641334220a3c-1280x1256-png'), ...hotspot(0.5, 0.42)}),
          guide('diy-electrical-work-in-arizona', 'Safety and the law', 'DIY in Arizona', imageFrom('service', 'electrical-troubleshooting', 'Pliers, wire strippers and a voltage tester on a coil of yellow wire', hotspot(0.5, 0.52))),
          guide('permit-for-electrical-work', 'Permits', 'Permits in Arizona', imageFrom('service', 'new-construction-wiring', 'New wiring run through the open studs of a home under construction', hotspot(0.5, 0.5))),
        ],
      },
      // Every post, on one page, under the service it supports (limit 0 = all).
      {_type: 'postsSection', _key: 'posts', eyebrow: 'Every guide', heading: 'Guides by topic', layout: 'byService', limit: 0, featuredFirst: false},
      ctaBandShared(),
    ]
  }

  // Commercial -----------------------------------------------------------------
  {
    const slug = 'commercial-electrician'
    const c = copyOf(slug)
    const [, , , heroText, trustLine] = c.texts(0, 'p')
    const checklistLinks = {
      'Commercial Electrical Repairs': 'commercial-electrical-troubleshooting',
      'Lighting for Offices & Retail': 'led-lights',
      'Panel & Service Upgrades': 'electrical-upgrades',
      'Tenant Improvements': 'tenant-improvements',
    }
    const viewAll = c.items(1, 'button').at(-1)
    const commercial = docs.find((d) => d._type === 'serviceCategory' && d.slug?.current === 'commercial')
    if (!commercial) throw new Error('page-sections: no Commercial service category')
    sections[slug] = [
      {
        _type: 'heroSection',
        _key: 'hero',
        eyebrow: 'Commercial electrical · Phoenix valley',
        text: heroText,
        image: photo('fleet-lineup.avif'),
        // the site's standard label, so the estimate and call buttons sit side by side like every
        // other hero's ("commercial" stays in the eyebrow, the H1 and the lede)
        primaryCta: estimateCta(),
        showPhone: true,
        trustLine,
        showTrustBar: true,
        // No quote snippets: the live hero's three starred one-liners match no review the business has
        // (decision D3, 2026-10-17; see _omissions.json). The trust line is live copy, word for word.
      },
      {
        _type: 'servicesSection',
        _key: 'top-services',
        eyebrow: 'Services',
        heading: c.text(1, 'h2'),
        headingAccent: 'commercial services',
        layout: 'featured',
        // Live "Panel Upgrades" card linked to commercial troubleshooting (and its photo
        // to EV chargers); its copy describes commercial panel and service upgrades, so it
        // links to that page (see _omissions.json → changes). Each card shows that work:
        // the business's own pendants in a restaurant, and an electrician tracing wires at
        // a ceiling opening (the homepage's troubleshooting photo).
        services: serviceCards(slug, 1, [
          {service: 'electrical-upgrades', image: 'commercial-ti-cable-pull.png'},
          {
            service: 'hanging-lights',
            image: imageFrom('service', 'hanging-lights', 'Rows of hanging Edison bulbs under the open timber beams and ductwork of a restaurant ceiling', hotspot(0.5, 0.3)),
          },
          {service: 'commercial-electrical-troubleshooting', image: {...photo('troubleshooting-ceiling-wiring.avif'), ...hotspot(0.26, 0.3)}},
        ]),
        cta: link(viewAll.text, viewAll.href),
      },
      {
        _type: 'featureGridSection',
        _key: 'capabilities',
        eyebrow: 'What we do',
        heading: c.text(2, 'h2'),
        headingAccent: 'your business',
        style: 'checklist',
        items: c.texts(2, 'h3').map((title, i) => ({
          _type: 'featureItem',
          _key: `item${i}`,
          title,
          icon: 'check',
          ...(checklistLinks[title] ? {service: reference(service(checklistLinks[title]))} : {}),
          ...(title === '+ More!' ? {link: link(viewAll.text, viewAll.href)} : {}),
        })),
        image: imageFrom('service', 'electrical-troubleshooting', 'Pliers, wire strippers and a voltage tester on a coil of yellow wire', cropRect([0, 1500, 3924, 2616], [3924, 5887])),
      },
      {
        // Three reviews from customers who mention their business or shop, word for word.
        _type: 'reviewsSection',
        _key: 'reviews',
        eyebrow: 'Reviews',
        heading: c.text(4, 'h3'),
        reviews: ['Lisa Ayotte', 'Brandon Vardy', 'Scott Collinge'].map((name) => reference(reviewNamed(name), name.toLowerCase().replace(/\W+/g, '-'))),
        cta: link(c.text(4, 'button'), c.item(4, 'button').href),
      },
      {
        _type: 'featureGridSection',
        _key: 'value-props',
        eyebrow: 'Our promise',
        // lifted from the Great Service card: "so your project stays on track from start to finish"
        heading: 'On track from start to finish.',
        headingAccent: 'start to finish.',
        style: 'cards',
        items: featureCards(slug, 3),
      },
      // Every commercial service, linked (the live page linked three of them).
      {
        _type: 'servicesSection',
        _key: 'all-commercial',
        eyebrow: 'Every commercial service',
        heading: 'Commercial services',
        layout: 'grid',
        category: reference(commercial),
        cta: link('Commercial services overview', '/services-categories/commercial'),
      },
      {...locationsSection(slug, 6), eyebrow: 'Where we work'},
      {
        _type: 'gallerySection',
        _key: 'gallery',
        eyebrow: 'Our work',
        heading: c.text('7.0', 'h2'),
        headingAccent: c.accent('7.0', 'h2'),
        images: [
          // the cells crop: each people photo is framed on its heads
          {...galleryImage('commercial-ti-cable-pull.png', 'tenant-improvements', 'ti'), ...hotspot(0.6, 0.34)},
          galleryImage('image-cb001b94a2ca55b0d2c7ccecb4b2641334220a3c-1280x1256-png', 'panels', 'panel'),
          // a chandelier the crew hung (the restaurant pendants lead the services cards above)
          {...galleryImage('image-49a454c64fdde0f5b5fc7b306b53f880eef5c97f-960x1280-jpg', 'fixture-replacements', 'chandelier'), ...hotspot(0.5, 0.3)},
          {...galleryImage('lighting-install-vaulted-ceiling.avif', 'custom-lighting', 'vaulted'), ...hotspot(0.35, 0.34)},
          galleryImage('kitchen-recessed-lighting.avif', 'recessed-lights-installation', 'kitchen'),
          {...galleryImage('image-573850cd5522597a7b86b1fc602e4e369ef9a9af-1125x1104-jpg', 'electrical-safety-inspections', 'walkup'), ...hotspot(0.46, 0.47)},
        ],
      },
      ctaBand(slug, '7.1'),
    ]
  }

  // The shared closing band on pages whose live band differs only in the status line
  // (or that had none): an empty CTA uses siteSettings.ctaBand.
  function ctaBandShared() {
    return {_type: 'ctaSection', _key: 'cta'}
  }

  // ---------------------------------------------------------------------------
  // Write, then check the invariants

  const seoSnapshot = () =>
    JSON.stringify(ofType('page').map((d) => [d._id, d.slug?.current, d.heading, d.title, d.seo]))
  const before = seoSnapshot()

  for (const [slug, list] of Object.entries(sections)) {
    const page = bySlug('page', slug)
    const keys = list.map((s) => s._key)
    if (new Set(keys).size !== keys.length) throw new Error(`page-sections: duplicate section _key on ${slug}`)
    const headings = JSON.stringify(list).match(/"(heading|subheading|asideHeading)":"([^"]*)"/g) ?? []
    if (headings.some((h) => norm(JSON.parse(`{${h}}`)[h.split('"')[1]]) === norm(page.heading))) {
      throw new Error(`page-sections: a ${slug} section repeats the page H1`)
    }
    page.sections = list
  }

  // Asset documents for every photo used, so references resolve in the NDJSON.
  const ids = new Set(docs.map((d) => d._id))
  for (const [id, doc] of usedAssets) if (!ids.has(id)) push(doc)

  if (seoSnapshot() !== before) throw new Error('page-sections: a page title, H1, meta description or slug changed')

  report.pageSections = {
    pages: Object.fromEntries(Object.entries(sections).map(([slug, list]) => [slug, list.map((s) => `${s._type}:${s._key}`)])),
    created,
    jobDescription: 'jobOpening.description = visible /careers job copy',
    notes,
    assets: usedAssets.size,
  }
}
