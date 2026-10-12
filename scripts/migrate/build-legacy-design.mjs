#!/usr/bin/env node
// Ports the published Webflow design into the Astro site.
//
//   node scripts/migrate/build-legacy-design.mjs
//
// Reads the published HTML in migration/live-snapshots/ and writes:
//   web/public/wf/css/site.css       Webflow's compiled stylesheet, with asset URLs made local
//   web/public/wf/a/*                every image/font the design uses, downloaded off Webflow's CDN
//   web/src/legacy/chrome/*.html     navbar and footer
//   web/src/legacy/pages/*.html      main content of the hand-designed pages
//   web/src/legacy/templates/*.html  main content of one sample page per CMS template;
//                                    web/src/lib/legacy.ts fills the CMS spots from Sanity
//
// Webflow's runtime (jQuery + ~700 KB of interactions JS) is not carried over.
// Its scroll-in animations become `data-reveal` attributes handled by a small
// script, so content is visible in the HTML for crawlers and no-JS visitors.

import {mkdir, readFile, writeFile, stat} from 'node:fs/promises'
import path from 'node:path'
import * as cheerio from 'cheerio'

const ROOT = new URL('../../', import.meta.url).pathname
const SNAP = path.join(ROOT, 'migration/live-snapshots')
const PUBLIC = path.join(ROOT, 'web/public/wf')
const LEGACY = path.join(ROOT, 'web/src/legacy')
const SITE = 'https://www.thewireguyelectric.com'

const STATIC_PAGES = ['index', 'about-us', 'our-team', 'careers', 'faq', 'contact-us', 'commercial-electrician', 'services', 'blog', '404']
const TEMPLATES = {
  service: 'services_panels',
  post: 'blog-posts_electrical-panel-upgrade-cost-arizona',
  location: 'locations_gilbert',
  'service-category': 'services-categories_residential',
  'post-category': 'posts-categories_lighting',
}

// Same fixes as the content import: links that 404 on the live site.
const LINK_FIXES = {'/estimate': '/contact-us', '/locations/mesa': '/', '/services/electrical-panels': '/services/panels'}

// Webflow form field names → /api/contact field names.
const FORM_FIELDS = {
  Name: 'name',
  'email-4': 'email',
  'Phone-Number': 'phone',
  'Zip-Code': 'zip',
  Request: 'message',
  'Years-of-Electrical-Experience': 'experience',
  'Are-you-available-for-full-time-work': 'fullTime',
  'How-soon-can-you-start': 'startDate',
}

const CDN_HOST_RE = /https:\/\/(?:cdn\.prod\.website-files\.com|uploads-ssl\.webflow\.com|assets-global\.website-files\.com|assets\.website-files\.com)\//g
const assets = new Map() // remote URL → local path

/**
 * Find where a CDN URL ends. File names can contain balanced parentheses
 * ("Frame 44 (2).png"), CSS escapes them ("\(2\)"), and HTML attributes may
 * wrap them in &quot;.
 */
function urlEnd(text, start) {
  let i = start
  let depth = 0
  while (i < text.length) {
    const c = text[i]
    if (c === '\\' && (text[i + 1] === '(' || text[i + 1] === ')')) {
      i += 2
      continue
    }
    if (c === '"' || c === "'" || /\s/.test(c) || text.startsWith('&quot;', i) || text.startsWith('&#x27;', i) || text.startsWith('&#39;', i)) break
    if (c === '(') depth++
    if (c === ')') {
      if (depth === 0) break
      depth--
    }
    if (c === ',' && depth === 0 && /\s/.test(text[i + 1] ?? ' ')) break
    i++
  }
  return i
}

function localName(url) {
  const u = new URL(url)
  const base = decodeURIComponent(u.pathname.split('/').pop())
  return base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-')
}

function localize(text) {
  let out = ''
  let last = 0
  for (const m of text.matchAll(CDN_HOST_RE)) {
    if (m.index < last) continue
    const end = urlEnd(text, m.index)
    const raw = text.slice(m.index, end)
    out += text.slice(last, m.index)
    last = end
    const url = raw.replace(/\\([()])/g, '$1')
    if (url.includes('/gsap/') || url.endsWith('.js')) {
      out += raw
      continue
    }
    const local = `/wf/a/${localName(url)}`
    assets.set(url, local)
    out += local
  }
  return out + text.slice(last)
}

async function download(url, dest) {
  try {
    await stat(dest)
    return 'cached'
  } catch {}
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${res.status}`)
      await writeFile(dest, Buffer.from(await res.arrayBuffer()))
      return 'ok'
    } catch (err) {
      if (attempt === 2) return `failed: ${err.message}`
    }
  }
}

function normalizeHref(href) {
  if (!href) return href
  let out = href.replace(/^https?:\/\/(www\.)?thewireguyelectric\.com/i, '') || '/'
  if (!out.startsWith('/')) return href
  const [p, hash] = out.split('#')
  let clean = p.length > 1 ? p.replace(/\/+$/, '') : p
  if (clean.startsWith('/blog/')) clean = clean.replace('/blog/', '/blog-posts/')
  clean = LINK_FIXES[clean] ?? clean
  return clean + (hash !== undefined ? `#${hash}` : '')
}

/** Clean a fragment of Webflow markup. `heroSelector` elements are never hidden behind reveal animations (LCP). */
function clean($, root, {chrome = false} = {}) {
  // Webflow interactions: drop inline start states, mark scroll-in elements for the reveal script.
  root.find('[data-w-id]').each((_, el) => {
    const $el = $(el)
    const style = $el.attr('style') ?? ''
    const decls = style.split(';').map((d) => d.trim()).filter(Boolean)
    const hidden = decls.some((d) => /^opacity\s*:\s*0(\.0+)?$/.test(d))
    const kept = decls.filter((d) => !/^(opacity|transform|-webkit-transform|-moz-transform|-ms-transform|transform-style)\s*:/.test(d))
    if (kept.length) $el.attr('style', kept.join(';'))
    else $el.removeAttr('style')
    if (hidden && !$el.closest('.section').is(root.children('.section').first())) $el.attr('data-reveal', '')
    $el.removeAttr('data-w-id')
  })
  root.find('[data-wf-page-id],[data-wf-element-id]').removeAttr('data-wf-page-id').removeAttr('data-wf-element-id')

  // Scripts: keep third-party embeds (loaded lazily), drop everything else.
  root.find('script').each((_, el) => {
    const $el = $(el)
    const src = $el.attr('src')
    if ($el.closest('.w-embed').length && src) {
      const attrs = {...el.attribs}
      delete attrs.src
      $el.replaceWith(`<template data-lazy-script="${src}" data-attrs='${JSON.stringify(attrs)}'></template>`)
    } else {
      $el.remove()
    }
  })

  root.find('a[href]').each((_, el) => {
    const $el = $(el)
    $el.attr('href', normalizeHref($el.attr('href')))
  })
  root.find('.w-pagination-wrapper').remove()
  // Leftovers from the purchased Webflow template.
  root.find('a[href*="webflow.com/dashboard"], a.w-webflow-badge').remove()
  // One H1 per page: later H1s (e.g. a "We're ready to work for you" CTA band) become H2s.
  if (!chrome) {
    root.find('h1').slice(1).each((_, el) => {
      el.tagName = 'h2'
    })
  }
  // CMS lists are re-rendered from Sanity; keep one item as the template.
  root.find('.w-dyn-items').each((_, list) => {
    $(list).children('.w-dyn-item').slice(1).remove()
  })

  if (chrome) root.find('.w--current').removeClass('w--current').removeAttr('aria-current')

  // Forms post to /api/contact (see web/src/scripts/webflow-lite.ts for submit handling).
  root.find('form').each((_, form) => {
    const $form = $(form)
    const isCareers = /career/i.test($form.attr('id') ?? $form.attr('name') ?? '')
    $form.attr('action', '/api/contact').attr('method', 'post').attr('data-lead-form', isCareers ? 'careers' : 'estimate')
    $form.find('[name]').each((_, input) => {
      const name = $(input).attr('name')
      if (FORM_FIELDS[name]) $(input).attr('name', FORM_FIELDS[name])
    })
    $form.prepend(
      `<input type="hidden" name="formType" value="${isCareers ? 'careers' : 'estimate'}">` +
        '<input type="hidden" name="startedAt" value="">' +
        '<div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave empty<input type="text" name="company_website" tabindex="-1" autocomplete="off"></label></div>',
    )
  })
}

function mainContent($) {
  const body = $('body')
  const parts = body
    .children()
    .toArray()
    .filter((el) => {
      const $el = $(el)
      return el.tagName !== 'script' && !$el.hasClass('navbar-absolute') && !$el.hasClass('footer-second') && !$el.hasClass('w-webflow-badge')
    })
  const wrapper = cheerio.load('<div id="__main"></div>', null, false)
  wrapper('#__main').append(parts.map((el) => $.html(el)).join('\n'))
  return wrapper
}

async function main() {
  await mkdir(path.join(PUBLIC, 'css'), {recursive: true})
  await mkdir(path.join(PUBLIC, 'a'), {recursive: true})
  for (const d of ['chrome', 'pages', 'templates']) await mkdir(path.join(LEGACY, d), {recursive: true})

  const read = async (name) => readFile(path.join(SNAP, `${name}.html`), 'utf8')

  // Stylesheet
  const home$ = cheerio.load(await read('index'))
  const cssUrl = home$('link[rel=stylesheet]').attr('href')
  const css = await (await fetch(cssUrl)).text()
  // Webflow's shared CSS references fonts/images with absolute CDN URLs.
  await writeFile(path.join(PUBLIC, 'css/site.css'), localize(css))

  // Chrome (navbar + footer), from the homepage
  for (const [name, sel] of [['navbar', '.navbar-absolute'], ['footer', '.footer-second']]) {
    const frag = cheerio.load(home$.html(home$(sel).first()), null, false)
    clean(frag, frag.root(), {chrome: true})
    await writeFile(path.join(LEGACY, 'chrome', `${name}.html`), localize(frag.html()))
  }

  const out = async (dir, name, file) => {
    const $ = cheerio.load(await read(file))
    const main = mainContent($)
    clean(main, main('#__main'))
    await writeFile(path.join(LEGACY, dir, `${name}.html`), localize(main('#__main').html()))
  }
  for (const page of STATIC_PAGES) await out('pages', page, page)
  for (const [name, file] of Object.entries(TEMPLATES)) await out('templates', name, file)

  // Download every asset the design references.
  const entries = [...assets.entries()]
  const results = {ok: 0, cached: 0, failed: []}
  for (let i = 0; i < entries.length; i += 8) {
    await Promise.all(
      entries.slice(i, i + 8).map(async ([url, local]) => {
        const r = await download(url, path.join(PUBLIC, 'a', path.basename(local)))
        if (r === 'ok') results.ok++
        else if (r === 'cached') results.cached++
        else results.failed.push(`${url} (${r})`)
      }),
    )
  }
  await writeFile(path.join(LEGACY, 'assets-map.json'), JSON.stringify(Object.fromEntries(entries), null, 2) + '\n')
  console.log(`assets: ${entries.length} referenced, ${results.ok} downloaded, ${results.cached} cached, ${results.failed.length} failed`)
  if (results.failed.length) console.log(results.failed.join('\n'))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
