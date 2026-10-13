#!/usr/bin/env node
// Copies the live copy of the 9 static pages from the discovery inventory into
// migration/page-content/<page>.json, so the migration and its checks never
// depend on the scratch directory the inventory was built in.
//
//   node migration/page-content/build-from-inventory.mjs <inventory dir>
//
// The inventory (built 2026-10-13 from the live site and the Webflow port) holds,
// per page, the ordered sections with every heading (and its level), paragraph,
// list item, card, button and image, plus a flat "copy deck" of every visible
// string. This script keeps that verbatim and adds a flat list of the page's
// links (anchor text + target) for the link checks in
// scripts/migrate/verify-content.mjs.

import {readFile, writeFile} from 'node:fs/promises'
import * as cheerio from 'cheerio'

const PAGES = ['index', 'about-us', 'our-team', 'careers', 'faq', 'contact-us', 'services', 'blog', 'commercial-electrician']
const dir = process.argv[2]
if (!dir) {
  console.error('usage: node migration/page-content/build-from-inventory.mjs <inventory dir>')
  process.exit(1)
}

const clean = (s) => (s ?? '').replace(/‍/g, '').replace(/\s+/g, ' ').trim()

/** Every link in a section's content tree: buttons, text links, links inside HTML, and card-wide link wrappers. */
function collectLinks(nodes, section, out = []) {
  for (const n of nodes ?? []) {
    if (n.type === 'button' && n.href) out.push({section, text: clean(n.label), href: n.href, kind: 'button'})
    if (n.type === 'link' && n.href) out.push({section, text: clean(n.text), href: n.href, kind: 'link'})
    if (n.type === 'linkWrapper' && n.href) {
      // A card that is one big link: its accessible text is the card heading (if any).
      const heading = JSON.stringify(n.children ?? []).match(/"type":"heading","level":\d,"text":"([^"]*)"/)?.[1]
      out.push({section, text: heading ? clean(heading) : '', href: n.href, kind: 'cardLink'})
    }
    if (n.type === 'iconLink' && n.href) out.push({section, text: clean(n.accessibleName), href: n.href, kind: 'iconLink'})
    const htmls = [n.html, n.answer?.html].filter(Boolean)
    for (const html of htmls) {
      const $ = cheerio.load(`<body>${html}</body>`)
      $('a[href]').each((_, a) => out.push({section, text: clean($(a).text()), href: $(a).attr('href'), kind: n.answer ? 'faqAnswerLink' : 'inlineLink'}))
    }
    if (n.children) collectLinks(n.children, section, out)
    if (n.cardTemplate) collectLinks(n.cardTemplate, section, out)
  }
  return out
}

for (const page of PAGES) {
  const inv = JSON.parse(await readFile(`${dir.replace(/\/$/, '')}/${page}.json`, 'utf8'))
  const sections = inv.sections.map((s) => ({
    index: s.index,
    element: s.element,
    purpose: s.purpose,
    source: s.source,
    headings: s.headings,
    content: s.content,
    images: s.images,
    ctas: s.ctas,
    notes: s.notes,
  }))
  const out = {
    page,
    url: inv.url,
    capturedAt: '2026-10-13',
    source: `Discovery inventory ${page}.json: the live page (thewireguyelectric.com${inv.url}) as served on 2026-10-13, verbatim`,
    title: inv.title,
    metaDescription: inv.metaDescription,
    h1: inv.h1,
    sections,
    copy: inv.copyDeck,
    links: sections.flatMap((s) => collectLinks(s.content, s.index)),
    ...(inv.faqGroups ? {faqGroups: inv.faqGroups} : {}),
    pageBuilderMapping: inv.pageBuilderMapping,
  }
  await writeFile(new URL(`${page}.json`, import.meta.url), JSON.stringify(out, null, 2) + '\n')
  console.log(`${page}.json: ${sections.length} sections, ${out.copy.length} copy strings, ${out.links.length} links`)
}
