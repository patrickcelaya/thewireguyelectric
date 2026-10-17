// What the CMS templates (cities, services, posts and the category pages) choose from
// their data: which reviews, guides and questions to show, how a service's photo is
// staged, and which part of a body gets a band of its own. Pure functions over query
// results, so a page renders the same from the local dataset and from Sanity.
import type {FaqItem, ImageRef, PortableTextValue, PostCard, PostIndexEntry, PostSummary, Review, ServiceSummary} from './types'
import type {City} from './cities'
import {FLEET_PHOTO, JOB_PHOTOS, companyPhoto, jobPhoto} from './brand-photos'
import {imageSrcSet, resolveImage} from './image'
import {portableTextToHtml, type PortableTextOptions} from './portable-text'
import {toPlainText} from './schema'
import {inSentence} from './format'

/**
 * The fleet under the sky as a city page's hero (its LCP image): the Sanity renditions
 * plus the enlarged copies for big screens, and its sizes (styles/inner.css draws it
 * 170% wide on phones). The <img> and the page's preload use the same pair.
 */
export const FLEET_HERO = {
  srcset: [imageSrcSet(FLEET_PHOTO.image, [640, 828, 1086]), ...FLEET_PHOTO.enlarged.map((e) => `${e.src} ${e.width}w`)].filter(Boolean).join(', '),
  sizes: '(max-width:699px) 170vw, 100vw',
}

/** "A", "A and B", "A, B, and C" (no trailing punctuation). */
export function listOf(items: string[]) {
  if (items.length < 3) return items.join(' and ')
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const k = key(item)
    return seen.has(k) ? false : (seen.add(k), true)
  })
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Whether `text` names `name` as a whole word (case-sensitive: "Mesa" the city, not "mesa" the landform). */
const names = (text: string, name: string) => new RegExp(`\\b${escapeRe(name)}\\b`).test(text)

// ---------------------------------------------------------------------------
// Reviews

/** Reviews this long or shorter keep a row of three cards close in height; longer ones are read on the homepage. */
const REVIEW_CHARS = {min: 50, max: 600}
const fits = (r: Review) => r.text.length >= REVIEW_CHARS.min && r.text.length <= REVIEW_CHARS.max

/**
 * Up to `count` real reviews for an inner page: those tagged with the page (its city or
 * its service) first, then reviews from the rest of the valley. The others are taken
 * from `pool` (featured first, newest next) starting at a different place on each page
 * (`seed`), so ten city pages don't repeat the same three. `local` is how many are tagged.
 */
export function pickReviews(tagged: Review[], pool: Review[], seed: number, count = 3) {
  const own = tagged.filter(fits).slice(0, count)
  const taken = new Set(own.map((r) => r._id))
  const rest = pool.filter((r) => fits(r) && !taken.has(r._id))
  const start = rest.length ? (seed * count) % rest.length : 0
  const fill = [...rest.slice(start), ...rest.slice(0, start)].slice(0, count - own.length)
  return {reviews: [...own, ...fill], local: own.length}
}

// ---------------------------------------------------------------------------
// Guides (blog posts)

/** The posts supporting these services, in the services' order: featured posts (the most-read guides) first, then newest. */
function supporting(serviceSlugs: string[], index: PostIndexEntry[]) {
  const bySlug = serviceSlugs.flatMap((slug) => index.filter((p) => p.services.includes(slug)))
  return [...bySlug.filter((p) => p.featured), ...bySlug]
}

/**
 * A city's guides: posts whose title names the city, then featured posts supporting the
 * city's services (in the order the city lists them), then posts that name the city in
 * their text and support one of those services, then the newest posts supporting them.
 */
export function cityGuides(city: string, serviceSlugs: string[], index: PostIndexEntry[], count = 3): PostSummary[] {
  const support = supporting(serviceSlugs, index)
  const picks = [...index.filter((p) => names(p.title, city)), ...support.filter((p) => p.featured), ...support.filter((p) => names(p.text, city)), ...support]
  return uniqueBy(picks, (p) => p.slug).slice(0, count)
}

/**
 * A service's guides: its related posts (picked, or posts that reference it), then the
 * featured and newest posts that support it, then the most-read guides, so the block is
 * never empty or short on a service no post is written around yet. Every picked post
 * shows, up to five (GuidesBlock lays out four and five); otherwise three.
 */
export function serviceGuides(
  related: PostSummary[] | null | undefined,
  serviceSlug: string,
  index: PostIndexEntry[],
  count = Math.min(5, Math.max(3, related?.length ?? 0)),
): PostSummary[] {
  const mostRead = index.filter((p) => p.featured)
  return uniqueBy([...(related ?? []), ...supporting([serviceSlug], index), ...mostRead], (p) => p.slug).slice(0, count)
}

/** Whether every one of `posts` supports the service (lists it among its related services). */
export function allSupport(posts: PostSummary[], serviceSlug: string, index: PostIndexEntry[]) {
  return posts.length > 0 && posts.every((p) => index.find((e) => e.slug === p.slug)?.services.includes(serviceSlug))
}

const newestFirst = (a: PostIndexEntry, b: PostIndexEntry) => b.publishedAt.localeCompare(a.publishedAt) || a._id.localeCompare(b._id)
const oldestFirst = (a: PostIndexEntry, b: PostIndexEntry) => a.publishedAt.localeCompare(b.publishedAt) || a._id.localeCompare(b._id)
const featuredFirst = (a: PostIndexEntry, b: PostIndexEntry) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || newestFirst(a, b)

/**
 * A post's related articles, picked by the services it supports (its hubs: the first is
 * its primary), not by date, so every post is someone's neighbour:
 *   1. the pillar of its primary hub (that service's first picked guide that isn't this post);
 *   2. the next post with the same primary hub, by publish date, wrapping round (a ring);
 *   3. the pillar of its second hub when it has one, else the next sibling in the ring.
 * Short lists fill with posts whose primary hub is one of its hubs (featured first, then
 * newest), then posts in its blog topic (lighting), then any post sharing a hub.
 * `pillars` maps a service slug to its picked guides (service.relatedPosts), in order.
 */
export function relatedArticles(slug: string, index: PostIndexEntry[], pillars: Record<string, string[]>, count = 3): PostIndexEntry[] {
  const post = index.find((p) => p.slug === slug)
  if (!post) return []
  const bySlug = new Map(index.map((p) => [p.slug, p]))
  const hubs = post.services
  const out: PostIndexEntry[] = []
  const add = (p: PostIndexEntry | undefined) => {
    if (p && p.slug !== slug && !out.includes(p) && out.length < count) out.push(p)
  }
  const pillar = (hub: string | undefined) =>
    hub ? (pillars[hub] ?? []).map((s) => bySlug.get(s)).find((p) => p && p.slug !== slug && !out.includes(p)) : undefined
  const group = hubs[0] ? index.filter((p) => p.services[0] === hubs[0]).sort(oldestFirst) : []
  const at = group.indexOf(post)
  const ring = at < 0 ? [] : Array.from({length: group.length - 1}, (_, k) => group[(at + k + 1) % group.length])
  add(pillar(hubs[0]))
  add(ring.find((p) => !out.includes(p)))
  add(pillar(hubs[1]))
  ring.forEach(add)
  index.filter((p) => hubs.includes(p.services[0])).sort(featuredFirst).forEach(add)
  const topic = post.category?.slug
  if (topic) index.filter((p) => p.category?.slug === topic).sort(newestFirst).forEach(add)
  index.filter((p) => p.services.some((h) => hubs.includes(h))).sort(featuredFirst).forEach(add)
  return out
}

/**
 * The words of the early link from a post to its hub service ("See our {label} service"):
 * the service's own link label when it has one, else the wording the service page uses
 * in its own H2, else its name. Searchers say "electrical troubleshooting", not "Troubleshooting".
 */
const HUB_LINK_LABELS: Record<string, string> = {
  'electrical-troubleshooting': 'electrical troubleshooting',
  panels: 'electrical panel replacement',
  'electrical-safety-inspections': 'electrical safety inspection',
  'ev-charger-installation': 'EV charger installation',
  'exterior-electrical': 'exterior electrical',
  'recessed-lights-installation': 'recessed lighting installation',
  'fixture-replacements': 'light fixture replacement',
  'electrical-remodels': 'remodel electrical',
}

export function hubLinkLabel(service: Pick<ServiceSummary, 'slug' | 'name' | 'linkLabel'>) {
  return service.linkLabel?.trim() || HUB_LINK_LABELS[service.slug] || service.name
}

/** Where a heading names a service mid-sentence, the words that read naturally ("Questions about exterior electrical work"). */
const SERVICE_TOPICS: Record<string, string> = {'exterior-electrical': 'exterior electrical work'}

/** A service named inside a heading: "EV charger installation", "LED lights" (lib/format.ts inSentence). */
export function serviceTopic(service: Pick<ServiceSummary, 'slug' | 'name'>) {
  return SERVICE_TOPICS[service.slug] ?? inSentence(service.name)
}

/** A post's topic for its label: its category, else the first service it supports, else "Guide". */
export function postTopic(post: PostSummary, index: PostIndexEntry[], services: ServiceSummary[]) {
  const primary = index.find((p) => p.slug === post.slug)?.services[0]
  return post.category?.name ?? services.find((s) => s.slug === primary)?.name ?? 'Guide'
}

/**
 * A real cover for a post: its own image when it is one of the company's photos, else
 * the photo of a service it supports (in the order it lists them), else one of the
 * company's job photos (JOB_PHOTOS): those of the post's own subject first, then those
 * that suit any guide (never the EV charger on a guide about breakers). Stock images
 * are never used. `tinted` covers (the guide cards, under a copper tint) take job photos
 * only; natural ones (the post's own page) may show people too, framed on their faces.
 * `taken` keeps the covers in one row different from each other; `seed` varies the
 * fallback from page to page.
 */
export function postCover(
  post: PostSummary,
  index: PostIndexEntry[],
  services: ServiceSummary[],
  {tinted = true, taken = new Set<string>(), seed = 0}: {tinted?: boolean; taken?: Set<string>; seed?: number} = {},
): ImageRef {
  const entry = index.find((p) => p.slug === post.slug)
  const own = entry?.services ?? []
  const linked = [post.mainImage, ...own.map((slug) => services.find((s) => s.slug === slug)?.mainImage)]
  // what the post is about: what its own and its services' job photos show, and its blog topic, whose slug names one (lighting)
  const subjects = new Set<string | undefined>([...linked.map((image) => jobPhoto(image)?.subject), (entry?.category ?? post.category)?.slug])
  const rotated = [...JOB_PHOTOS.slice(seed % JOB_PHOTOS.length), ...JOB_PHOTOS.slice(0, seed % JOB_PHOTOS.length)]
  const onSubject = (image: ImageRef) => {
    const photo = jobPhoto(image)
    return Boolean(photo && (subjects.has(photo.subject) || photo.services?.some((slug) => own.includes(slug))))
  }
  // so a lighting guide whose own photo another card already shows gets another lighting photo, not the EV charger
  const fallback = [...rotated.filter(onSubject), ...rotated.filter((image) => !onSubject(image) && !jobPhoto(image)?.narrow)]
  const candidates = [...linked, ...fallback]
  // the same photo may be an asset reference or a pre-import Webflow URL: compare what it resolves to
  const id = (image: ImageRef | null | undefined) => resolveImage(image)?.ref ?? ''
  const fits = (image: ImageRef | null | undefined): image is ImageRef => (tinted ? companyPhoto(image) === 'job' : Boolean(companyPhoto(image)))
  const usable = candidates.filter(fits)
  const cover = usable.find((image) => !taken.has(id(image))) ?? usable[0]
  taken.add(id(cover))
  return cover
}

/**
 * Posts as guide cards with real covers (postCover) and their topic as the label, for GuidesBlock.
 * `taken` holds photos the page already shows (a post's own cover), so no card repeats them.
 */
export function guideCards(posts: PostSummary[], index: PostIndexEntry[], services: ServiceSummary[], seed = 0, taken = new Set<string>()): PostCard[] {
  return posts.map((post, i) => ({...post, mainImage: undefined, cover: postCover(post, index, services, {taken, seed: seed + i}), label: postTopic(post, index, services)}))
}

/** The city a post is about: the first city its title names (most posts are valley-wide and name none). */
export function postCity(title: string, cities: City[]) {
  return cities.find((c) => names(title, c.name))
}

/** Reading time in minutes at 230 words a minute. */
export function readingMinutes(text: string) {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 230))
}

// ---------------------------------------------------------------------------
// Questions

/** The questions a page shows: its own first, then shared ones, each once, at most `max`. */
export function mergeFaqs(lists: Array<FaqItem[] | null | undefined>, max = 7): FaqItem[] {
  const all = lists.flatMap((l) => l ?? []).filter((f) => f.question && f.answer?.length)
  return uniqueBy(all, (f) => f.question.trim().toLowerCase()).slice(0, max)
}

/**
 * The questions without prices, for service pages (owner: no prices on service pages):
 * none from the Pricing topic and none whose answer states a dollar figure. /faq and the
 * cost guides keep theirs.
 */
export function withoutPrices(faqs: FaqItem[] | null | undefined): FaqItem[] {
  return (faqs ?? []).filter((f) => f.topic !== 'Pricing' && !/\$\s?\d/.test(toPlainText(f.answer)))
}

const sameQuestion = (a: string, b: string) => a.replace(/[‘’]/g, "'").trim().toLowerCase() === b.replace(/[‘’]/g, "'").trim().toLowerCase()

/** The shared questions named in `questions`, in that order; any that no longer exist are skipped. */
export function pickFaqs(all: FaqItem[], questions: readonly string[]): FaqItem[] {
  return questions.map((q) => all.find((f) => sameQuestion(f.question, q))).filter((f): f is FaqItem => Boolean(f))
}

/**
 * The shared questions a city page adds after its own (round-5 Gilbert mockup): permits,
 * free estimates and fees. Not "What cities do you service?": on a city page that answer
 * lists every other city and the valley map already shows them.
 */
export const CITY_SHARED_QUESTIONS = ['Do I need a permit for electrical work in Arizona?', 'Do you offer free estimates?', 'Do you have any hidden fees?'] as const

// ---------------------------------------------------------------------------
// Photos and headings

/**
 * How a service hero stages its main image: "tint" for a job photo without people (the
 * copper-toned full-bleed hero), "split" for a company photo of people (shown in natural
 * colour beside the words, faces in frame), "plain" otherwise (stock or no photo: the
 * copper hero with the lit bulb, no photo).
 */
export function heroStaging(image: ImageRef | null | undefined): 'tint' | 'split' | 'plain' {
  const kind = companyPhoto(image)
  return kind === 'job' ? 'tint' : kind === 'people' ? 'split' : 'plain'
}

/**
 * The service hero photo's renditions per staging (styles/cms.css): full bleed behind
 * the copper tint (the frame stops at 1440 px on wide screens), or the right-hand
 * panel beside the words (full width under them on phones). The <img> and the page's
 * preload use the same values.
 */
export const SERVICE_HERO_IMAGE = {
  tint: {widths: [640, 960, 1280, 1600], sizes: '(min-width:1500px) 1440px, 100vw'},
  split: {widths: [640, 960, 1280], sizes: '(max-width:899px) 100vw, 46vw'},
} as const

/** A post's cover beside its title (styles/post.css: 4:3, about 40% of the page; full width on phones). */
export const POST_COVER = {widths: [480, 720, 960, 1280], sizes: '(max-width:899px) 92vw, 42vw'}

/** The words of a city H1 to set in colour: "Gilbert, Arizona" in "Licensed Electrician in Gilbert, Arizona". */
export function cityAccent(heading: string, city: string) {
  return [`${city}, Arizona`, `${city}, AZ`, city].find((words) => heading.includes(words))
}

/**
 * The centre of a photo's head boxes ("x0,y0,x1,y1;…" as fractions) as a CSS
 * object-position, so a frame that crops the photo keeps the people in view.
 */
export function facesFocus(faces: string | undefined) {
  const boxes = (faces ?? '').split(';').map((b) => b.split(',').map(Number)).filter((b) => b.length === 4 && b.every(Number.isFinite))
  if (!boxes.length) return undefined
  const x = (Math.min(...boxes.map((b) => b[0])) + Math.max(...boxes.map((b) => b[2]))) / 2
  const y = (Math.min(...boxes.map((b) => b[1])) + Math.max(...boxes.map((b) => b[3]))) / 2
  return `${Math.round(x * 1000) / 10}% ${Math.round(y * 1000) / 10}%`
}

// ---------------------------------------------------------------------------
// Bodies

type Block = PortableTextValue[number] & {style?: string; listItem?: string; children?: Array<{text?: string}>}

export const blockText = (b: Block) => (b.children ?? []).map((c) => c.text ?? '').join('').trim()
const isHeading = (b: Block) => b._type === 'block' && /^h[1-6]$/.test(b.style ?? '')

export interface SignsSection {
  heading: string
  /** The list items, as blocks (marks and links kept). */
  items: PortableTextValue
  /** Paragraphs after the list, before the next heading ("More detail here: …"). */
  after: PortableTextValue
}

/**
 * A service body's warning signs: a heading that starts with "Signs" and the bulleted
 * list under it (three items or more) leave the article for a band of their own, with
 * any paragraphs that follow the list. Every other block stays in the article, in order.
 */
export function liftSigns(body: PortableTextValue | null | undefined): {signs?: SignsSection; rest: PortableTextValue} {
  const blocks = (body ?? []) as Block[]
  const at = blocks.findIndex((b) => isHeading(b) && /^signs\b/i.test(blockText(b)))
  if (at < 0) return {rest: blocks}
  let end = at + 1
  while (end < blocks.length && !isHeading(blocks[end])) end++
  const section = blocks.slice(at + 1, end)
  const listed = section.map((b) => b._type === 'block' && Boolean(b.listItem))
  const items = section.filter((_, i) => listed[i])
  const after = section.filter((_, i) => !listed[i])
  // only "heading, list, then paragraphs": a section that opens with prose stays in the article
  const firstProse = listed.indexOf(false)
  if (items.length < 3 || (firstProse >= 0 && firstProse < listed.lastIndexOf(true))) return {rest: blocks}
  return {signs: {heading: blockText(blocks[at]), items, after}, rest: [...blocks.slice(0, at), ...blocks.slice(end)]}
}

/**
 * A long-form body as HTML (lib/portable-text.ts) with an anchor id on every H2, and
 * those anchors (for an "In this article" list and the section's accessible name).
 */
export function articleHtml(body: PortableTextValue | null | undefined, options: PortableTextOptions) {
  const anchors = headingAnchors(body)
  let n = 0
  const html = portableTextToHtml(body, options).replace(/<h2>/g, () => `<h2 id="${anchors[n++]?.id ?? `section-${n}`}">`)
  return {html, anchors}
}

/**
 * `insert` placed in an article's HTML before its middle H3 (the 4th of 6), so a photo
 * breaks up the long run of text halfway down. Bodies with fewer than three H3s get it
 * at the end. Portable Text renders top-level blocks, so an <h3 is never inside a list.
 */
export function insertMidArticle(html: string, insert: string) {
  const starts = [...html.matchAll(/<h3[\s>]/g)].map((m) => m.index!)
  if (starts.length < 3) return html + insert
  const at = starts[Math.floor(starts.length / 2)]
  return html.slice(0, at) + insert + html.slice(at)
}

/** A post body without an opening heading that only repeats the post's title (the page's H1 already says it). */
export function withoutTitleHeading(body: PortableTextValue | null | undefined, title: string): PortableTextValue {
  const [first, ...rest] = (body ?? []) as Block[]
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
  return first && isHeading(first) && norm(blockText(first)) === norm(title) ? rest : ((body ?? []) as Block[])
}

/** Anchor ids for a body's H2s (an h1 block also renders as an H2), unique within the page. */
export function headingAnchors(body: PortableTextValue | null | undefined) {
  const used = new Set<string>()
  return ((body ?? []) as Block[])
    .filter((b) => b._type === 'block' && (b.style === 'h2' || b.style === 'h1'))
    .map((b) => {
      const text = blockText(b)
      const base = text.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section'
      let id = base
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`
      used.add(id)
      return {id, text}
    })
}
