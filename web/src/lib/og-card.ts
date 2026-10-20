// The share card: every page's og:image is a 1200×630 card made at build time
// (src/config/og-cards.mjs): the logo, a short eyebrow, the page's headline and the
// rating line on the bone background, beside the page's own share photo (the one
// ogImageMeta picks: its SEO image, else a photo the page shows, else Site settings →
// default share image). A page with no photo gets the typographic card (the bulb on petrol).
//
// The photo panel is cut from the photo here, as an exact rectangle (Sanity's rect), so
// heads in a photo of people are never cropped: it is centred on the heads (else the
// hotspot), keeps room around each of them as the QA face check asks, and widens until
// they fit. A group too wide for the widest panel gets the typographic card instead.
//
// Pages render the card's spec while the build prerenders them (recordOgCard writes it to
// node_modules/.cache/og-cards); the integration draws the cards once the build is done.
import {mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {createImageUrlBuilder} from '@sanity/image-url'
import type {ImageRef, SiteSettings} from './types'
import {IMAGE_PROJECT_ID, imageAlt, resolveImage} from './image'
import {facesOf} from './brand-photos'
import {sanityDataset} from './sanity'
import {licence, ratingSummary, siteRating} from './site'

export const OG_WIDTH = 1200
export const OG_HEIGHT = 630
/** Where prerendered pages leave their card specs for the integration (relative to the web package). */
export const OG_SPEC_DIR = join('node_modules', '.cache', 'og-cards', 'specs')

/** The photo panel's widths, narrowest first: the text column keeps the rest of the 1200. */
const PANEL_WIDTHS = [460, 600, 720]

export interface OgCardText {
  /** A short label above the headline ("Panels & wiring", "Guide", "Gilbert, Arizona"). */
  eyebrow?: string
  /** The headline; defaults to the page title before " | ". */
  title?: string
}

export interface OgCardSpec {
  /** "/services/panels" */
  path: string
  /** "/og/services/panels.jpg" */
  file: string
  eyebrow?: string
  title: string
  /** "5.0 from 560+ Google reviews" */
  rating?: string
  /** "ROC #339306" */
  licence?: string
  /** The photo panel, already cut to its box; none = the typographic card. */
  photo?: {url: string; width: number; ref: string; alt?: string}
}

const builder = createImageUrlBuilder({projectId: IMAGE_PROJECT_ID, dataset: sanityDataset})

/** "/og/index.jpg" for the homepage, "/og/services/panels.jpg" for /services/panels. */
export const ogCardFile = (path: string) => `/og${path === '/' ? '/index' : path.replace(/\/+$/, '')}.jpg`

/**
 * The headline: the title before " | The Wire Guy …", and for a long one the part before
 * its colon or a closing parenthesis, so it fits the card in three or four lines.
 */
export function cardTitle(title: string) {
  let t = title.split(' | ')[0].trim()
  if (t.length > 64) {
    const head = t.split(/:\s/)[0]
    if (head !== t && head.length >= 18) t = head
  }
  return t.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/** The eyebrow a page gets unless it passes its own: what kind of page it is. */
export function cardEyebrow(path: string) {
  if (path === '/') return 'Mesa, Arizona'
  if (path.startsWith('/services/')) return 'Electrical service'
  if (path === '/services' || path.startsWith('/services-categories/')) return 'Electrical services'
  if (path.startsWith('/locations/')) return 'Local electrician'
  if (path.startsWith('/blog-posts/')) return 'Guide'
  if (path === '/blog' || path.startsWith('/posts-categories/')) return 'Guides'
  if (path === '/careers') return 'Careers'
  if (path === '/estimate' || path === '/contact-us') return 'Free estimate'
  return 'Mesa & the East Valley'
}

type Box = [number, number, number, number]

/**
 * The rectangle of the photo (in its own pixels) that fills a panel `panelWidth` wide and
 * the card high, or undefined when its heads can't all fit with room around them.
 */
export function photoRect(image: ImageRef, panelWidth: number) {
  const r = resolveImage(image)
  if (!r) return undefined
  const c = r.crop ?? {top: 0, left: 0, bottom: 0, right: 0}
  const fx = c.left * r.width, fy = c.top * r.height
  const fw = (1 - c.left - c.right) * r.width, fh = (1 - c.top - c.bottom) * r.height
  const aspect = panelWidth / OG_HEIGHT
  const [rw, rh] = fw / fh > aspect ? [fh * aspect, fh] : [fw, fw / aspect]
  // each head with the room the face check asks for: 15% of its height above, 6% of its width at each side, a chin below
  const heads: Box[] = (facesOf(image) ?? '')
    .split(';')
    .filter(Boolean)
    .map((b) => b.split(',').map(Number))
    .map(([x0, y0, x1, y1]) => {
      const w = (x1 - x0) * r.width, h = (y1 - y0) * r.height
      return [x0 * r.width - w * 0.06, y0 * r.height - h * 0.15, x1 * r.width + w * 0.06, y1 * r.height + h * 0.1]
    })
  const union = heads.length ? heads.reduce<Box>((u, b) => [Math.min(u[0], b[0]), Math.min(u[1], b[1]), Math.max(u[2], b[2]), Math.max(u[3], b[3])], heads[0]) : undefined
  const cx = union ? (union[0] + union[2]) / 2 : (r.hotspot?.x ?? 0.5) * r.width
  const cy = union ? (union[1] + union[3]) / 2 : (r.hotspot?.y ?? 0.5) * r.height
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
  const x = clamp(cx - rw / 2, fx, fx + fw - rw)
  const y = clamp(cy - rh / 2, fy, fy + fh - rh)
  if (union && (union[0] < x || union[1] < y || union[2] > x + rw || union[3] > y + rh)) return undefined
  return {ref: r.ref, x: Math.round(x), y: Math.round(y), width: Math.round(rw), height: Math.round(rh)}
}

/** The photo panel for a share photo: the narrowest panel its heads fit in, cut to that box. */
export function cardPhoto(image?: ImageRef | null): OgCardSpec['photo'] {
  if (!image) return undefined
  for (const width of PANEL_WIDTHS) {
    const rect = photoRect(image, width)
    if (!rect) continue
    const url = builder.image(rect.ref).rect(rect.x, rect.y, rect.width, rect.height).width(width).height(OG_HEIGHT).format('jpg').quality(82).url()
    return {url, width, ref: rect.ref, alt: imageAlt(image)}
  }
  return undefined
}

export function ogCardSpec(path: string, pageTitle: string, settings: SiteSettings, photo?: ImageRef | null, text: OgCardText = {}): OgCardSpec {
  const rating = siteRating(settings)
  return {
    path,
    file: ogCardFile(path),
    eyebrow: text.eyebrow ?? cardEyebrow(path),
    title: text.title ?? cardTitle(pageTitle),
    rating: rating ? `${rating.value} ${ratingSummary(rating)}` : undefined,
    licence: licence(settings)?.number,
    photo: cardPhoto(photo),
  }
}

/** What the card shows, for og:image:alt. */
export function ogCardAlt(spec: OgCardSpec, businessName: string) {
  return [`${businessName}: ${spec.title}`, spec.photo?.alt].filter(Boolean).join('. ')
}

/** Leaves the spec for the integration, during a build only (the dev server draws no cards). */
export function recordOgCard(spec: OgCardSpec) {
  if (!import.meta.env.PROD) return
  const dir = join(process.cwd(), OG_SPEC_DIR)
  mkdirSync(dir, {recursive: true})
  writeFileSync(join(dir, `${spec.file.slice(4, -4).replace(/\//g, '__')}.json`), JSON.stringify(spec))
}
