// Renders the ported Webflow design. The markup in src/legacy/ is the published
// HTML of the current site (see scripts/migrate/build-legacy-design.mjs); these
// functions fill the CMS-bound spots with Sanity content at build time, the way
// Webflow's own templates do, so pages look the same as on Webflow.
import * as cheerio from 'cheerio'
import {escapeHTML, toHTML, uriLooksSafe} from '@portabletext/to-html'
import navbarHtml from '../legacy/chrome/navbar.html?raw'
import footerHtml from '../legacy/chrome/footer.html?raw'
import serviceTpl from '../legacy/templates/service.html?raw'
import postTpl from '../legacy/templates/post.html?raw'
import locationTpl from '../legacy/templates/location.html?raw'
import serviceCategoryTpl from '../legacy/templates/service-category.html?raw'
import postCategoryTpl from '../legacy/templates/post-category.html?raw'
import blogPage from '../legacy/pages/blog.html?raw'
import {hasImage, imageSrcSet, imageUrl} from './image'
import type {ImageRef, LocationDoc, PortableTextValue, PostDoc, PostSummary, ServiceDoc, ServiceSummary} from './types'

const pages = import.meta.glob<string>('../legacy/pages/*.html', {query: '?raw', import: 'default', eager: true})

/** Main content of a hand-designed page (about-us, faq, ...), or undefined if it has none. */
export function legacyPage(slug: string): string | undefined {
  return pages[`../legacy/pages/${slug}.html`]
}

const load = (html: string) => cheerio.load(html, null, false)
type $ = cheerio.CheerioAPI
type Sel = ReturnType<$>

// ---------------------------------------------------------------------------
// Chrome

/** Navbar with the current page marked, and any Sanity city missing from the Locations menu appended. */
export function renderNavbar(path: string, locations: Array<{name: string; slug: string}>) {
  const $ = load(navbarHtml)
  const locMenu = $('.nav-dropdown')
    .filter((_, el) => $(el).find('.nav-item-title').first().text().trim() === 'Locations')
    .find('.nav-dropdown-link-wrapper')
    .first()
  const template = locMenu.find('a').last()
  for (const l of locations) {
    const href = `/locations/${l.slug}`
    if (locMenu.find(`a[href="${href}"]`).length || !template.length) continue
    const link = template.clone()
    link.attr('href', href)
    link.contents().last().replaceWith(escapeHTML(l.name))
    locMenu.append(link)
  }
  markCurrent($, path)
  return $.html()
}

export function renderFooter(path: string) {
  const $ = load(footerHtml)
  markCurrent($, path)
  return $.html()
}

function markCurrent($: $, path: string) {
  $('a[href]').each((_, el) => {
    if ($(el).attr('href') === path) $(el).addClass('w--current').attr('aria-current', 'page')
  })
}

// ---------------------------------------------------------------------------
// Rich text (Portable Text → the HTML Webflow's rich-text styles expect)

const youtubeId = (url: string) => url.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1]

const SITE_HOST = /^https?:\/\/(www\.)?thewireguyelectric\.com/i

export function richTextHtml(blocks?: PortableTextValue | null) {
  if (!blocks?.length) return ''
  return toHTML(blocks as never, {
    components: {
      types: {
        figure: ({value}: {value: ImageRef & {caption?: string}}) =>
          hasImage(value)
            ? `<figure class="w-richtext-align-fullwidth w-richtext-figure-type-image"><div><img src="${imageUrl(value, {width: 1200})}" loading="lazy" alt="${escapeHTML(value.alt ?? '')}"></div>${
                value.caption ? `<figcaption>${escapeHTML(value.caption)}</figcaption>` : ''
              }</figure>`
            : '',
        table: ({value}: {value: {hasHeaderRow?: boolean; rows?: Array<{cells?: string[]}>}}) => {
          const rows = value.rows ?? []
          const [head, ...body] = value.hasHeaderRow === false ? [undefined, ...rows] : rows
          const tr = (cells: string[] = [], tag: 'th' | 'td') => `<tr>${cells.map((c) => `<${tag}>${escapeHTML(c)}</${tag}>`).join('')}</tr>`
          return `<table>${head ? `<thead>${tr(head.cells, 'th')}</thead>` : ''}<tbody>${body.map((r) => tr(r?.cells, 'td')).join('')}</tbody></table>`
        },
        videoEmbed: ({value}: {value: {url: string; title?: string}}) => {
          const id = youtubeId(value.url)
          if (!id) return ''
          const title = escapeHTML(value.title ?? 'Video')
          return `<figure class="w-richtext-align-center w-richtext-figure-type-video"><div style="position:relative;padding-bottom:56.25%"><a href="https://www.youtube.com/watch?v=${id}" data-video-embed="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" aria-label="Play video: ${title}" style="position:absolute;inset:0;display:block;background:#000"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;opacity:.85"><span aria-hidden="true" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:68px;height:48px;border-radius:12px;background:#aa502e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px">▶</span></a></div></figure>`
        },
        callToAction: ({value}: {value: {heading?: string; text?: string; label?: string; href?: string}}) =>
          `<p><strong>${escapeHTML(value.heading ?? '')}</strong> ${escapeHTML(value.text ?? '')} <a href="${escapeHTML(value.href ?? '/contact-us')}">${escapeHTML(value.label ?? 'Get a free estimate')}</a></p>`,
      },
      marks: {
        link: ({children, value}: {children: string; value?: {href?: string; openInNewTab?: boolean}}) => {
          const raw = value?.href ?? '#'
          const href = raw.replace(SITE_HOST, '') || '/'
          if (!uriLooksSafe(href)) return children
          const external = /^https?:\/\//.test(href)
          return `<a href="${escapeHTML(href)}"${value?.openInNewTab || external ? ' target="_blank"' : ''}${external ? ' rel="noopener"' : ''}>${children}</a>`
        },
        sup: ({children}: {children: string}) => `<sup>${children}</sup>`,
        sub: ({children}: {children: string}) => `<sub>${children}</sub>`,
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Images in Webflow's list cards

function setImage(img: Sel, image: ImageRef | undefined, alt: string) {
  if (!hasImage(image)) return
  img.attr('src', imageUrl(image, {width: 800}))
  img.attr('alt', image.alt || alt)
  const srcset = imageSrcSet(image, [500, 800, 1080])
  if (srcset) img.attr('srcset', srcset)
  else img.removeAttr('srcset')
}

// ---------------------------------------------------------------------------
// CMS lists

/** Re-render a Webflow collection list from data, using its first item as the template. */
function fillList<T>($: $, list: Sel, items: T[], fill: (item: Sel, data: T) => void) {
  const container = list.find('.w-dyn-items').first()
  const template = container.children('.w-dyn-item').first()
  if (!template.length) return
  const html = $.html(template)
  container.empty()
  for (const data of items) {
    const item = $(html)
    fill(item, data)
    container.append(item)
  }
  if (items.length) list.find('.w-dyn-empty').remove()
}

function fillServiceCard(item: Sel, s: ServiceSummary) {
  const href = `/services/${s.slug}`
  item.find('a.services-image-link, a.services-title, a.icon-link').attr('href', href)
  setImage(item.find('img.services-list-image').first(), s.mainImage, s.name)
  if (s.category) item.find('a.services-category').attr('href', `/services-categories/${s.category.slug}`).text(s.category.name)
  item.find('a.services-title').text(s.name)
  item.find('.services-content-wrapper > p').first().text(s.shortDescription ?? '')
}

function fillPostCard(item: Sel, p: PostSummary) {
  const href = `/blog-posts/${p.slug}`
  item.find('a.services-image-link, a.blog-title, a.icon-link').attr('href', href)
  setImage(item.find('img.services-list-image').first(), p.mainImage, p.title)
  item.find('a.blog-title').text(p.title)
  item.find('.blog-list-content-wrapper > p').first().text(p.excerpt ?? '')
}

// ---------------------------------------------------------------------------
// Pages

export function renderServicesPage(html: string, services: ServiceSummary[]) {
  const $ = load(html)
  $('.w-tab-pane').each((_, pane) => {
    const tab = ($(pane).attr('data-w-tab') ?? '').toLowerCase()
    const items = tab === 'all' || !tab ? services : services.filter((s) => s.category?.slug === tab)
    fillList($, $(pane).find('.w-dyn-list').first(), items, fillServiceCard)
  })
  return $.html()
}

export function renderBlogPage(html: string, posts: PostSummary[]) {
  const $ = load(html)
  fillList($, $('.w-dyn-list').first(), posts, fillPostCard)
  return $.html()
}

export function renderService(s: ServiceDoc) {
  const $ = load(serviceTpl)
  $('h1.heading-banner').first().text(s.heading ?? s.name)
  $('.content-banner p.paragraph-large').first().text(s.shortDescription ?? '')
  $('.rich-text-style').first().html(richTextHtml(s.body))
  return $.html()
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix'})

export function renderPost(p: PostDoc) {
  const $ = load(postTpl)
  $('h1.heading-banner').first().text(p.title)
  $('.content-banner p.paragraph-large').first().text(fmtDate(p.publishedAt))
  $('.rich-text-style').first().html(richTextHtml(p.body))
  return $.html()
}

export function renderLocation(l: LocationDoc) {
  const $ = load(locationTpl)
  $('h1.heading-banner-3').first().text(l.heading ?? `Licensed Electrician in ${l.name}, Arizona`)
  $('.description-banner p').first().text(l.description ?? '')
  $('.column-3 .rich-text-block').first().html(richTextHtml(l.body))
  return $.html()
}

export function renderServiceCategory(c: {name: string; heading?: string; services: ServiceSummary[]}) {
  const $ = load(serviceCategoryTpl)
  $('h1').first().text(c.heading ?? c.name)
  fillList($, $('.w-dyn-list').first(), c.services, fillServiceCard)
  return $.html()
}

export function renderPostCategory(c: {name: string; posts: PostSummary[]}) {
  const $ = load(postCategoryTpl)
  $('h1').first().text(c.name)
  // Webflow's category list was empty; reuse the blog grid's card markup.
  const blog = load(blogPage)
  $('.w-dyn-list').first().replaceWith(blog.html(blog('.w-dyn-list').first()))
  fillList($, $('.w-dyn-list').first(), c.posts, fillPostCard)
  return $.html()
}
