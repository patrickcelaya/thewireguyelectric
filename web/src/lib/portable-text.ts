// Portable Text → HTML in the site's design (components/PortableText.astro wraps it).
// Rich text from Sanity: blocks (paragraphs, H2–H6, quotes, lists), marks (bold,
// italic, underline, sup/sub, links, team-member mentions) and the richText object
// types: figure, table, videoEmbed (a click-to-play facade) and callToAction.
// Content never adds an H1: an h1 block renders as an H2.
import {escapeHTML, toHTML, uriLooksSafe, type PortableTextHtmlComponents} from '@portabletext/to-html'
import type {CallToAction, ImageRef, PortableTextValue} from './types'
import {hasImage, imageDimensions, imageSrcSet, imageUrl} from './image'
import {isExternal, resolveHref, type RedirectMap} from './links'
import {ESTIMATE_PATH, NEW_TAB_NOTE} from './site'

export interface PortableTextOptions {
  /** Internal links are rewritten through these, so none points at a redirect. */
  redirects?: RedirectMap
  /** `sizes` for figures (the measure of the column they sit in). */
  figureSizes?: string
  /**
   * The path of the page the text renders on ("/services/panels"). A link to that page
   * renders as plain text: answers and bodies shared across pages never link a page
   * to itself (links to an anchor on it stay).
   */
  currentPath?: string
}

const attr = (s: string) => escapeHTML(s)

const youtubeId = (url: string) => url.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/)?.[1]

function link(href: string, children: string, openInNewTab = false, extraClass = '') {
  const external = isExternal(href)
  const blank = external || openInNewTab
  const cls = extraClass ? ` class="${extraClass}"` : ''
  return `<a${cls} href="${attr(href)}"${blank ? ' target="_blank" rel="noopener"' : ''}>${children}${blank ? `<span class="sr-only">${NEW_TAB_NOTE}</span>` : ''}</a>`
}

function figure(value: ImageRef, sizes: string) {
  if (!hasImage(value)) return ''
  const size = imageDimensions(value)
  const srcset = imageSrcSet(value, [480, 720, 960, 1200, 1600])
  const img = `<img src="${attr(imageUrl(value, {width: 1200}))}"${srcset ? ` srcset="${attr(srcset)}" sizes="${attr(sizes)}"` : ''}${
    size ? ` width="${size.width}" height="${size.height}"` : ''
  } alt="${attr(value.alt ?? '')}" loading="lazy" decoding="async">`
  return `<figure class="pt-figure">${img}${value.caption ? `<figcaption>${escapeHTML(value.caption)}</figcaption>` : ''}</figure>`
}

type TableValue = {_key?: string; caption?: string; hasHeaderRow?: boolean; rows?: Array<{cells?: string[]}>}

/**
 * A rich-text table. A wide table scrolls inside its own labelled, focusable region
 * (WCAG 1.4.10), named by its caption or the heading it sits under, so two tables on a
 * page never share a name. With a header row, phones stack each row as a card of
 * label/value pairs (styles/inner.css): the explicit roles keep the table semantics
 * when CSS changes the display of its parts.
 */
function table(value: TableValue, label: string) {
  const rows = value.rows ?? []
  if (!rows.length) return ''
  const [head, ...body] = value.hasHeaderRow === false ? [undefined, ...rows] : rows
  const columns = head?.cells ?? []
  const cell = (c: string, i: number) =>
    i === 0
      ? `<th scope="row" role="rowheader">${escapeHTML(c)}</th>`
      : `<td role="cell"${columns[i] ? ` data-label="${attr(columns[i])}"` : ''}>${escapeHTML(c)}</td>`
  const headRow = `<tr role="row">${columns.map((c) => `<th scope="col" role="columnheader">${escapeHTML(c)}</th>`).join('')}</tr>`
  const bodyRows = body.map((r) => `<tr role="row">${(r?.cells ?? []).map(cell).join('')}</tr>`).join('')
  return `<div class="pt-table${head ? ' pt-table--stack' : ''}" role="region" aria-label="${attr(label)}" tabindex="0"><table role="table">${
    value.caption ? `<caption>${escapeHTML(value.caption)}</caption>` : ''
  }${head ? `<thead role="rowgroup">${headRow}</thead>` : ''}<tbody role="rowgroup">${bodyRows}</tbody></table></div>`
}

/** Each table's accessible name: its caption, else "Table: {the heading above it}", numbered when two would match. */
function tableLabels(blocks: PortableTextValue) {
  const labels = new Map<string, string>()
  const used = new Map<string, number>()
  let heading = ''
  for (const block of blocks as Array<{_key?: string; _type: string; style?: string; caption?: string; children?: Array<{text?: string}>}>) {
    if (block._type === 'block' && /^h[1-6]$/.test(block.style ?? '')) heading = (block.children ?? []).map((c) => c.text ?? '').join('').trim()
    if (block._type !== 'table' || !block._key) continue
    const base = block.caption?.trim() || (heading ? `Table: ${heading}` : 'Table')
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    labels.set(block._key, n > 1 ? `${base} (${n})` : base)
  }
  return labels
}

/** YouTube as a facade: a link to the video with its poster; site.ts swaps in the player on click. */
function video(value: {url?: string; title?: string}) {
  const id = value.url && youtubeId(value.url)
  if (!id) return ''
  const title = value.title?.trim() || 'Video'
  return `<figure class="pt-video"><a class="pt-video__link" href="https://www.youtube.com/watch?v=${id}" data-video="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" data-video-title="${attr(title)}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async"><span class="pt-video__play" aria-hidden="true"></span><span class="sr-only">Play video: ${escapeHTML(title)}</span></a>${
    value.title ? `<figcaption>${escapeHTML(value.title)}</figcaption>` : ''
  }</figure>`
}

function cta(value: CallToAction, redirects: RedirectMap) {
  const href = resolveHref(value.href || ESTIMATE_PATH, redirects)
  return `<div class="pt-cta">${value.heading ? `<p class="pt-cta__h">${escapeHTML(value.heading)}</p>` : ''}${value.text ? `<p>${escapeHTML(value.text)}</p>` : ''}${link(
    href,
    escapeHTML(value.label || 'Get a Free Estimate'),
    false,
    'btn btn--primary btn--go',
  )}</div>`
}

export function portableTextToHtml(blocks: PortableTextValue | null | undefined, options: PortableTextOptions = {}) {
  if (!blocks?.length) return ''
  const redirects = options.redirects ?? {}
  const sizes = options.figureSizes ?? '(min-width: 1100px) 760px, 92vw'
  const labels = tableLabels(blocks)
  const isSelf = (href: string) => options.currentPath !== undefined && href === options.currentPath
  const components: Partial<PortableTextHtmlComponents> = {
    block: {h1: ({children}) => `<h2>${children}</h2>`},
    types: {
      figure: ({value}) => figure(value as ImageRef & {caption?: string}, sizes),
      table: ({value}) => {
        const t = value as TableValue
        return table(t, (t._key && labels.get(t._key)) || t.caption || 'Table')
      },
      videoEmbed: ({value}) => video(value),
      callToAction: ({value}) => cta(value as CallToAction, redirects),
    },
    marks: {
      link: ({children, value}) => {
        const raw = (value as {href?: string} | undefined)?.href
        if (!raw) return children
        const href = resolveHref(raw, redirects)
        return uriLooksSafe(href) && !isSelf(href) ? link(href, children, (value as {openInNewTab?: boolean}).openInNewTab) : children
      },
      // a mention of a team member (textWithMentions) links to the team page
      teamMemberMention: ({children}) => (isSelf('/our-team') ? children : `<a href="/our-team">${children}</a>`),
      sup: ({children}) => `<sup>${children}</sup>`,
      sub: ({children}) => `<sub>${children}</sub>`,
    },
  }
  return toHTML(blocks as never, {components, onMissingComponent: false})
}

/**
 * The same rich text with every link that `matches` pointed at `href` instead, e.g.
 * "Contact us today" in an answer shown on the page that holds the form → "#estimate".
 */
export function retargetLinks(blocks: PortableTextValue, matches: (href: string) => boolean, href: string): PortableTextValue {
  return blocks.map((block) => {
    const defs = block.markDefs as Array<{_type: string; href?: string}> | undefined
    if (!Array.isArray(defs)) return block
    return {...block, markDefs: defs.map((d) => (d._type === 'link' && d.href && matches(d.href) ? {...d, href} : d))}
  })
}
