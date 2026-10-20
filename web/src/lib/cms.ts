// What the CMS templates (cities, services, posts and the category pages) choose from
// their data: which reviews, guides and questions to show, how a service's photo is
// staged, and which part of a body gets a band of its own. Pure functions over query
// results, so a page renders the same from the local dataset and from Sanity.
import type {FaqItem, ImageRef, PortableTextValue, PostCard, PostIndexEntry, PostSummary, Review, ServiceSummary} from './types'
import type {City} from './cities'
import {FLEET_PHOTO, JOB_PHOTOS, LIBRARY_PHOTOS, UNPHOTOGRAPHED_SERVICES, VAN_PHOTO, VANS_PHOTO, WALK_PHOTO, companyPhoto, facesInFrame, headsHaveRoom, isPhotoSubject, jobPhoto, jobPhotoImage, libraryImage, photoFor, photoId, type LibraryPhoto, type PhotoSubject} from './brand-photos'
import {hasImage, imageAlt, imageSrcSet} from './image'
import {portableTextToHtml, type PortableTextOptions} from './portable-text'
import {toPlainText} from './schema'

/**
 * A city page's hero under the open sky (its LCP image): the city's own hero photo when the editor set one of the
 * company's photos, else the photo picked for the city in the library (framed by its `heroCrop`, so the heads start
 * at 71.5% of the frame, under the words), else the fleet. Its renditions and sizes (styles/inner.css draws it 170%
 * wide on phones, less for a wide group: `zoom`) are shared by the <img> and the page's preload; `center` is where the
 * phone's window onto the photo is centred (so every head is in it), and `faces` the head boxes in the frame as served.
 */
export function cityHero(location: {slug: string; heroImage?: ImageRef | null}) {
  const picked = photoFor(`cityHero:${location.slug}`)
  const image: ImageRef =
    location.heroImage && companyPhoto(location.heroImage)
      ? location.heroImage
      : picked
        ? {alt: picked.alt, asset: {_id: picked.id, url: ''}, ...(picked.heroCrop ? {crop: {...picked.heroCrop}} : {})}
        : FLEET_PHOTO.image
  const faces = facesInFrame(image)
  const boxes = (faces ?? '').split(';').filter(Boolean).map((b) => b.split(',').map(Number))
  // phones draw the photo 170% wide and show the middle of it; a wide group gets a wider window (the photo drawn
  // smaller, `zoom`) so every head is in it, and the window is centred on the heads (the fleet's sat at 52.5%)
  const left = boxes.length ? Math.min(...boxes.map((b) => b[0])) : 0.5
  const right = boxes.length ? Math.max(...boxes.map((b) => b[2])) : 0.5
  const zoom = Math.round(Math.min(1.7, 1 / (right - left + 0.1)) * 100) / 100
  const half = 0.5 / zoom
  const mid = boxes.length ? (left + right) / 2 : 0.525
  const center = Math.round(Math.min(Math.max(mid, half), 1 - half) * 1000) / 1000
  return {
    image,
    faces,
    center,
    zoom,
    srcset: imageSrcSet(image, [640, 828, 1086, 1440, 1920, 2400]) ?? '',
    sizes: `(max-width:699px) ${Math.round(zoom * 100)}vw, 100vw`,
  }
}

/** A stable number for a string (FNV-1a), so a page's rotating picks are the same on every build. */
export function hashOf(text: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0
  return h
}

/**
 * The estimate band's photo: the crew seen at the vans and trucks, one of a vetted few (`ctaBand` in the library,
 * each framed like the van photo the band was designed on: the words on the empty top, every head below them and
 * clear of the form card), chosen by the page's path so neighbouring pages differ, skipping any photo the page
 * already shows. Marks it shown.
 */
export function ctaBandPhoto(path: string, shown: Set<string> = new Set()) {
  const pool = LIBRARY_PHOTOS.filter((p) => p.roles.includes('ctaBand'))
  // nor a sibling of one (another photo of the same truck from the same shoot)
  const groups = new Set(LIBRARY_PHOTOS.filter((p) => p.group && shown.has(p.id)).map((p) => p.group))
  const start = pool.length ? hashOf(path) % pool.length : 0
  const pick = [...pool.slice(start), ...pool.slice(0, start)].find((p) => !shown.has(p.id) && !(p.group && groups.has(p.group)))
  const image = pick ? (pick.id === photoId(VAN_PHOTO.image) ? VAN_PHOTO.image : {alt: pick.alt, asset: {_id: pick.id, url: ''}}) : VAN_PHOTO.image
  markShown(shown, image)
  return image
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

/** A library photo as an image reference. */
const libraryRef = (p: LibraryPhoto): ImageRef => libraryImage(p)

/** `list` started at its `n`th item (wrapping round). */
const rotate = <T>(list: T[], n: number) => (list.length ? [...list.slice(n % list.length), ...list.slice(0, n % list.length)] : list)

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
  'exterior-electrical': 'landscape and outdoor lighting',
  'recessed-lights-installation': 'recessed lighting installation',
  'fixture-replacements': 'ceiling fan and light fixture installation',
  'electrical-remodels': 'remodel electrical',
  // the hubs added by decision D18 (2026-10-19)
  'whole-home-rewiring': 'whole-home rewiring',
  'hot-tub-pool-spa-electrical': 'hot tub, pool and spa electrical',
  'whole-house-surge-protection': 'whole-house surge protection',
}

export function hubLinkLabel(service: Pick<ServiceSummary, 'slug' | 'name' | 'linkLabel'>) {
  return service.linkLabel?.trim() || HUB_LINK_LABELS[service.slug] || service.name
}

export {serviceTopic} from './format'

/** A post's topic for its label: its category, else the first service it supports, else "Guide". */
export function postTopic(post: PostSummary, index: PostIndexEntry[], services: ServiceSummary[]) {
  const primary = index.find((p) => p.slug === post.slug)?.services[0]
  return post.category?.name ?? services.find((s) => s.slug === primary)?.name ?? 'Guide'
}

// ---------------------------------------------------------------------------
// Photos on a page: each one shows once

/**
 * Adds the photos a page shows to `shown` (which photo each is: a second upload counts as its original),
 * so the pickers below never show one of them again. A page keeps one set from top to bottom.
 */
export function markShown(shown: Set<string>, ...images: Array<ImageRef | null | undefined>) {
  for (const image of images) {
    const id = photoId(image)
    if (!id) continue
    shown.add(id)
    // a photo from a group (one shoot of one subject: the same truck, the same fireplace) counts its siblings as
    // shown too, so a page never shows the same scene twice
    const group = LIBRARY_GROUP.get(id)
    if (group) for (const sibling of LIBRARY_PHOTOS) if (sibling.group === group) shown.add(sibling.id)
  }
  return shown
}
const LIBRARY_GROUP = new Map(LIBRARY_PHOTOS.filter((p) => p.group).map((p) => [p.id, p.group!]))

/**
 * How ServiceCards lays out services: those with one of the company's photos as photo cards, in whole
 * rows of three (at most `maxCards`), every other one as a text row. Pages call it too, to know which
 * service photos their cards show.
 */
export function photoTiles<T extends Pick<ServiceSummary, 'mainImage'>>(services: T[], maxCards = 6) {
  // a photo shows once: a second service with the same photo (rewiring and new construction share the rough-in) is a row
  const seen = new Set<string>()
  const withPhoto = services.filter((s) => {
    if (!companyPhoto(s.mainImage)) return false
    const id = photoId(s.mainImage!)
    return seen.has(id) ? false : (seen.add(id), true)
  })
  const count = Math.min(maxCards, withPhoto.length - (withPhoto.length % 3))
  const cards = withPhoto.slice(0, count)
  return {cards, rows: services.filter((s) => !cards.includes(s))}
}

/**
 * The city glance photo ("We come to you"): the city's own company photo when the editor set one, else
 * the crew walking up to a door, else (when a service card on the page already shows that one) Steven at
 * the vans. Marks it shown.
 */
export function cityPhoto(own: ImageRef | null | undefined, shown: Set<string>): ImageRef {
  const photo = [companyPhoto(own) ? own : undefined, WALK_PHOTO.image, VANS_PHOTO.image].find((image): image is ImageRef => Boolean(image) && !shown.has(photoId(image))) ?? WALK_PHOTO.image
  markShown(shown, photo)
  return photo
}

/**
 * What a guide card's label names (postTopic), as a photo subject: the blog topic, else what the post's first
 * service's photo is of, else what the job photo kept for that service's guides is of (the EV charger for EV
 * charger installation). Undefined when neither has a photo subject (troubleshooting, safety).
 */
function coverTopic(post: PostSummary, index: PostIndexEntry[], services: ServiceSummary[]): string | undefined {
  const entry = index.find((p) => p.slug === post.slug)
  const first = entry?.services[0]
  return (
    (entry?.category ?? post.category)?.slug ??
    jobPhoto(services.find((s) => s.slug === first)?.mainImage)?.subject ??
    JOB_PHOTOS.map(jobPhoto).find((p) => first && p?.services?.includes(first))?.subject
  )
}

/**
 * Whether a job photo was made for the post's first service: that service's own photo, or a job photo that lists
 * it (the recessed-light kitchens for recessed lighting, the chandelier for fixture replacements). A post whose
 * first service has such photos is about that service: its card shows one of them or none, so a ceiling fan
 * guide never shows a bathtub because both are "lighting".
 */
function firstServicePhotos(post: PostSummary, index: PostIndexEntry[], services: ServiceSummary[]) {
  const first = index.find((p) => p.slug === post.slug)?.services[0]
  const own = services.find((s) => s.slug === first)?.mainImage
  const ownId = jobPhoto(own) ? photoId(own) : ''
  const made = (image: ImageRef | null | undefined) => {
    const photo = jobPhoto(image)
    return Boolean(first && photo && (photoId(image) === ownId || photo.services?.includes(first)))
  }
  return {first, own: ownId ? own : undefined, made, any: JOB_PHOTOS.some(made)}
}

/**
 * A real cover for a post: its own image when it is one of the company's photos, else the photo of a
 * service it supports (in the order it lists them), else one of the company's job photos (JOB_PHOTOS)
 * of the post's subject: what its own and its services' photos show, and its blog topic (lighting). A
 * post with no subject of its own (troubleshooting, safety) may take the neutral tools photo. Stock
 * images are never used, and no photo in `taken` (the page's) is used again.
 *
 * The post's topic is narrowed by its first service when job photos were made for it (firstServicePhotos):
 * the landscape lighting guide (exterior electrical first) takes the lamp-lined walk, not a lit kitchen, and
 * the recessed lighting guide a recessed-light kitchen, not the walk. A post whose first service has none (the
 * flicker guides list troubleshooting first) goes by its blog topic.
 *
 * `tinted` covers (the guide cards, under a copper tint) take job photos only, and when no unused photo
 * of the post's subject is left there is none: the card shows its plain copper cover (GuideCard), never
 * a photo of something else. A natural cover (the post's own page, its main image) may show people too,
 * framed on their faces, and always gets a photo: past its subject, any unused job photo but the narrow
 * EV charger. `seed` varies the picks from page to page. `fresh` natural covers (the blog's list thumbnails,
 * the previous and next posts) never repeat a photo in `taken` either: with none left there is none.
 */
/** Things a guide's title can name that the library has photos of in particular (LibraryPhoto.shows). */
const TITLE_THINGS = [{title: /\bceiling fans?\b/i, shows: 'ceiling-fan'}]

export function postCover(
  post: PostSummary,
  index: PostIndexEntry[],
  services: ServiceSummary[],
  {tinted = true, taken = new Set<string>(), seed = 0, fresh = false}: {tinted?: boolean; taken?: Set<string>; seed?: number; fresh?: boolean} = {},
): ImageRef | undefined {
  const entry = index.find((p) => p.slug === post.slug)
  const own = entry?.services ?? []
  const serviceImages = own.map((slug) => services.find((s) => s.slug === slug)?.mainImage)
  const category = (entry?.category ?? post.category)?.slug
  const topic = coverTopic(post, index, services)
  const forFirst = firstServicePhotos(post, index, services)
  // everything the post is about: what its own and its services' job photos are of, and its blog topic
  const subjects = new Set<string>([...[post.mainImage, ...serviceImages].map((image) => jobPhoto(image)?.subject), category].filter((s): s is string => Boolean(s)))
  const rotated = [...JOB_PHOTOS.slice(seed % JOB_PHOTOS.length), ...JOB_PHOTOS.slice(0, seed % JOB_PHOTOS.length)]
  const of = (image: ImageRef, wanted: (s: string) => boolean) => {
    const photo = jobPhoto(image)
    return Boolean(photo && [photo.subject, ...(photo.also ?? [])].some(wanted))
  }
  const onSubject = (image: ImageRef) => of(image, (s) => subjects.has(s)) || Boolean(jobPhoto(image)?.services?.some((slug) => own.includes(slug)))
  // a blog topic that is a photo subject (lighting) holds too, so a "Lighting" card never shows the panel
  const suitsCategory = (image: ImageRef) => !category || !jobPhoto(image) || !isPhotoSubject(category) || of(image, (s) => s === category)
  // the label's own subject first, so a "Lighting" card never takes the panel photo of a service it lists second;
  // a card whose label has a subject shows a photo of it or none
  // (a photo is of a service's topic by what it is of, or the services it lists; what else it suits counts for a
  // blog topic only: the lamp-lined walk is a lighting photo for the Lighting topic, not for a kitchen remodel)
  const isTopic = (image: ImageRef) => {
    const photo = jobPhoto(image)
    if (!photo) return false
    if (forFirst.any) return forFirst.made(image) && suitsCategory(image)
    return photo.subject === topic || Boolean(category && photo.also?.includes(category as PhotoSubject))
  }
  // photos of the topic itself before those that only suit it (a lit kitchen for a Lighting card before the walk)
  const byTopic = rotated.filter(isTopic).sort((a, b) => Number(jobPhoto(a)?.subject !== topic) - Number(jobPhoto(b)?.subject !== topic))
  // the first service's own photo (with a blog topic, only when it is of that topic) takes its turn in the rotation
  // with the other photos of the topic, so fifty posts don't all lead with the one service photo
  const lead = forFirst.own && isTopic(forFirst.own) ? [forFirst.own] : category ? [] : serviceImages.slice(0, 1)
  // a post's own cover (natural colour) may also show the crew at that service's work (the library's photos of people)
  const crew = tinted || !forFirst.first ? [] : LIBRARY_PHOTOS.filter((p) => p.kind === 'people' && p.services.includes(forFirst.first!) && !p.roles.some((r) => /^(team:|van$|fleet$)/.test(r))).map(libraryRef)
  const turns = [...lead, ...(topic ? byTopic : []), ...crew].filter((image, i, all) => image && all.findIndex((o) => photoId(o) === photoId(image)) === i)
  // the post's own photo, unless a head in it sits at the photo's edge (no frame can give it room)
  const ofTopic = [headsHaveRoom(post.mainImage) ? post.mainImage : undefined, ...rotate(turns, seed)]
  const tools = rotated.filter((image) => jobPhoto(image)?.subject === 'tools')
  const broader = [
    ...serviceImages,
    ...rotated.filter(onSubject),
    // the tools flat-lay suits a guide with no subject of its own
    ...(subjects.size ? [] : tools),
  ]
  // a card whose label has no photo subject (Troubleshooting, Electrical Safety Inspections) shows the photo of a
  // service the post lists, a job photo made for one, or the neutral tools; never a photo that only shares a
  // subject with one (the lamp-lined walk for an aluminum wiring guide that lists remodels second)
  const madeForOwn = (image: ImageRef) => Boolean(jobPhoto(image)?.services?.some((slug) => own.includes(slug)))
  const listed = rotate(
    [...serviceImages, ...rotated.filter(madeForOwn), ...tools].filter((image, i, all) => image && all.findIndex((o) => photoId(o) === photoId(image)) === i),
    seed,
  )
  // a guide whose title names a thing the library has its own photos of (a ceiling fan) shows one of those or none:
  // a ceiling fan guide never shows a bathtub, a pendant or a sconce because all of them are "lighting"
  // a card labeled with a service whose work the library has no photo of yet (hot tubs) shows none, not a stand-in
  const unphotographed = Boolean(forFirst.first && UNPHOTOGRAPHED_SERVICES.includes(forFirst.first))
  const named = TITLE_THINGS.find((t) => t.title.test(post.title))
  const ofThing = named && LIBRARY_PHOTOS.filter((p) => p.shows === named.shows).map(libraryRef)
  const candidates = ofThing
    ? rotate(ofThing, seed)
    : tinted
      ? [...ofTopic, ...(topic || unphotographed ? [] : listed)]
      : [...ofTopic, ...broader, ...rotated.filter((image) => !onSubject(image) && !jobPhoto(image)?.narrow)]
  const fits = (image: ImageRef | null | undefined): image is ImageRef => (tinted ? companyPhoto(image) === 'job' : Boolean(companyPhoto(image)))
  const usable = candidates.filter(fits)
  // the same photo may be an asset reference, a pre-import Webflow URL or a second upload: compare which photo it is
  const pick = usable.find((image) => !taken.has(photoId(image))) ?? (tinted || fresh ? undefined : usable[0])
  if (!pick) return undefined
  markShown(taken, pick)
  // a card crops the job photo as listed in brand-photos (its hotspot frames the subject)
  return tinted ? jobPhotoImage(pick) : pick
}

/**
 * Posts as guide cards with real covers (postCover) and their topic as the label, for GuidesBlock.
 * `taken` holds the photos the page shows elsewhere, so no card repeats one; a card left without an
 * unused photo of its own subject has no cover photo. On the blog's own pages (`own`: a post's related
 * articles) a post whose own image the owner approved shows that image first (ownPostImage, `ownCover`:
 * natural colour, never under the tint); service and city pages leave `own` off and keep the job photos.
 * `reserved` (reserveOwnImages) lets a card show its own image that the page set aside for it.
 */
export function guideCards(
  posts: PostSummary[],
  index: PostIndexEntry[],
  services: ServiceSummary[],
  seed = 0,
  taken = new Set<string>(),
  {own = false, reserved}: {own?: boolean; reserved?: Reserved} = {},
): PostCard[] {
  const covers = new Map<number, ImageRef | undefined>()
  const owned = new Set<number>()
  if (own)
    posts.forEach((post, i) => {
      const image = ownPostImage(post)
      if (!image || !claimOwn(post, image, taken, reserved)) return
      covers.set(i, image)
      owned.add(i)
    })
  // the most specific card picks first: one whose first service has photos made for it (the recessed guide takes the
  // recessed kitchen before a flicker guide that only has the Lighting topic), then one whose label has a photo
  // subject (the panel cost guide gets the panel photo before a breaker guide that lists panels second), then the rest
  const rank = (post: PostSummary) => (firstServicePhotos(post, index, services).any ? 0 : coverTopic(post, index, services) ? 1 : 2)
  for (const tier of [0, 1, 2]) posts.forEach((post, i) => !owned.has(i) && rank(post) === tier && covers.set(i, postCover(post, index, services, {taken, seed: seed + i})))
  return posts.map((post, i) => ({...post, mainImage: undefined, cover: covers.get(i), ownCover: owned.has(i) || undefined, label: postTopic(post, index, services)}))
}

/**
 * A post's own main image when the owner approved it for the blog pages (post.showMainImage, set through
 * migration/content-data/cms-templates.json `postImages`): a real photo, stock or the crew's, at least 1,200 px
 * wide, never AI-made, never text or drawn-on effects, with alt text that says what is visible. Undefined for
 * every other post. It shows on blog pages only: as the post's cover and share image, as its thumbnail on /blog,
 * and on the related-article and previous/next cards of other posts; never on a service or city page, and never
 * under the copper tint.
 */
export function ownPostImage(post: Pick<PostSummary, 'mainImage' | 'showMainImage'>): ImageRef | undefined {
  const image = post.mainImage
  return post.showMainImage && hasImage(image) && imageAlt(image) ? image : undefined
}

/** Own images a page has set aside for their posts (reserveOwnImages): photo id to post slug. */
export type Reserved = Map<string, string>

/**
 * Sets aside each post's own approved image (ownPostImage) for that post before any fallback picks: it is marked
 * shown, so no other card's company-photo fallback (postCover) can take it first just because it comes earlier on
 * the page (a job photo can be one post's own image and another post's subject photo). Images the page already
 * shows are not reserved. The pickers (postThumb, guideCards `own`) give a reserved image to its post only, once.
 */
export function reserveOwnImages(taken: Set<string>, posts: Array<PostSummary | null | undefined>): Reserved {
  const reserved: Reserved = new Map()
  for (const post of posts) {
    const own = post && ownPostImage(post)
    const id = own ? photoId(own) : ''
    if (!post || !id || taken.has(id)) continue
    taken.add(id)
    reserved.set(id, post.slug)
  }
  return reserved
}

/** Whether `post` may show its own image here: the page doesn't show it yet, or set it aside for this post. Marks it. */
function claimOwn(post: PostSummary, own: ImageRef, taken: Set<string>, reserved?: Reserved) {
  const id = photoId(own)
  if (reserved?.get(id) === post.slug) {
    reserved.delete(id)
    return true
  }
  if (taken.has(id)) return false
  markShown(taken, own)
  return true
}

/**
 * A post's thumbnail on a blog page (the /blog list, the previous and next posts): its own approved image (ownPostImage)
 * unless the page already shows it (an image `reserved` for this post counts as its own), else a company photo of its
 * subject the page doesn't show yet (postCover, `fresh`), else none. Marks it shown.
 */
export function postThumb(post: PostSummary, index: PostIndexEntry[], services: ServiceSummary[], taken: Set<string>, seed = 0, reserved?: Reserved): ImageRef | undefined {
  const own = ownPostImage(post)
  if (own && claimOwn(post, own, taken, reserved)) return own
  return postCover(post, index, services, {tinted: false, taken, seed, fresh: true})
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

/**
 * Like facesFocus, but sure to keep every head in view: on each axis the boxes' span sits at the same share of the
 * overflow as the margin before it (x0 / (x0 + 1 - x1)), so whatever the frame crops, as long as it is at least as
 * large as the span, no head is cut. The centre can cut a head at the photo's edge (the bucket hat at the top of the
 * crew at the new panel); this never does. For covers and thumbnails that crop with object-fit: cover.
 */
export function facesInView(faces: string | undefined) {
  const boxes = (faces ?? '').split(';').map((b) => b.split(',').map(Number)).filter((b) => b.length === 4 && b.every(Number.isFinite))
  if (!boxes.length) return undefined
  const at = (lo: number, hi: number) => (lo + 1 - hi > 0 ? lo / (lo + 1 - hi) : 0.5)
  const x = at(Math.min(...boxes.map((b) => b[0])), Math.max(...boxes.map((b) => b[2])))
  const y = at(Math.min(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[3])))
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

// ---------------------------------------------------------------------------
// The owner's photo library on the CMS pages: the article's second photo and "Recent work"


/**
 * The photo halfway down a service's article: a second photo of that service's work (`serviceSecond` in the
 * library; Electrical Safety Inspections has the crew walking up to a customer's door), never the hero's. Undefined
 * when the page already shows it, or none was picked (Ballast Replacement).
 */
export function serviceFigure(slug: string, shown: Set<string>): ImageRef | undefined {
  const picked = photoFor(`serviceSecond:${slug}`)
  const image = picked ? libraryRef(picked) : slug === 'electrical-safety-inspections' ? WALK_PHOTO.image : undefined
  if (!image || shown.has(photoId(image))) return undefined
  markShown(shown, image)
  return image
}

export interface WorkPhoto {
  image: ImageRef
  caption: string
  people: boolean
}
const asWork = (p: LibraryPhoto): WorkPhoto => ({image: libraryRef(p), caption: p.caption, people: p.kind === 'people'})
/** Library photos that stay in their own slots: the team portraits, the fleet poster and the van. */
const OWN_SLOT = /^(team:|fleet$|van$)/
/** A strip's cells crop: a photo of people goes in only with clear room above and beside every head (not a head at the top of the frame). */
const roomy = (p: LibraryPhoto) =>
  (p.faces ?? '')
    .split(';')
    .filter(Boolean)
    .every((b) => {
      const [x0, y0, x1, y1] = b.split(',').map(Number)
      return y0 - (y1 - y0) * 0.15 >= 0.05 && x0 >= 0.03 && x1 <= 0.97
    })
const free = (p: LibraryPhoto) => !p.roles.some((r) => OWN_SLOT.test(r)) && roomy(p)
const byQuality = (a: LibraryPhoto, b: LibraryPhoto) => b.quality - a.quality || a.id.localeCompare(b.id)

/** "Recent work" layouts (styles/cms.css .wg--…) and how many photos each holds. */
export const WORK_LAYOUTS = {lead: 3, row: 4, mosaic: 5} as const
export type WorkLayout = keyof typeof WORK_LAYOUTS
/** The layout for a page, by its slug, so neighbouring pages of one type don't look alike. */
export const workLayout = (slug: string, from: WorkLayout[] = ['lead', 'row', 'mosaic']) => from[hashOf(slug) % from.length]

/**
 * A service page's "Recent work": the library's photos of that service's work (job photos and the crew at it), best
 * first and rotated by the service, then photos of the same subject; never one the page already shows. Fewer than
 * three: none. Marks them shown.
 */
export function serviceWork(slug: string, subject: string | undefined, shown: Set<string>, count: number): WorkPhoto[] {
  const usable = LIBRARY_PHOTOS.filter((p) => free(p) && !shown.has(p.id))
  const own = usable.filter((p) => p.services.includes(slug)).sort(byQuality)
  // photos of the same kind of thing as the service's own stand in (another meter-main for panels, another
  // chandelier for hanging lights), never just the same broad subject: a chandelier is not LED lighting
  const kinds = new Set(LIBRARY_PHOTOS.filter((p) => p.services.includes(slug)).map((p) => p.shows))
  const same = subject === 'lighting' || subject === 'panel' ? usable.filter((p) => !own.includes(p) && p.subject === subject && kinds.has(p.shows)).sort(byQuality) : []
  const seed = hashOf(slug)
  const ordered = [...rotate(own, seed), ...rotate(same, seed)]
  // one photo of each kind of thing first (a chandelier, a sconce, a pendant), so the strip is never three of a kind
  const picks: LibraryPhoto[] = []
  for (const perKind of [1, 2])
    for (const p of ordered)
      if (picks.length < count && !picks.includes(p) && picks.filter((q) => q.shows === p.shows).length < perKind) picks.push(p)
  if (picks.length < 3) return []
  picks.forEach((p) => shown.add(p.id))
  return picks.map(asWork)
}

/** What a city's "Recent work" draws on: the crew at work and finished jobs (no portraits, line-ups or trucks). */
const AT_WORK = new Set(['tech-at-work', 'commercial', 'recessed', 'chandelier-pendant', 'troubleshooting', 'outlet-switch', 'exterior-light', 'meter-service', 'panel'])
const cityWorkPool = () => {
  // photos a city page shows elsewhere (heroes, glance photos, the band, the services' own photos) stay out, so the
  // windows below never overlap
  const elsewhere = (p: LibraryPhoto) => p.roles.some((r) => /^(cityHero|cityGlance|ctaBand|serviceMain):?/.test(r))
  const usable = LIBRARY_PHOTOS.filter((p) => free(p) && !elsewhere(p) && p.quality >= 3)
  // dealt round the kinds of thing they show (chandeliers, sconces, panels, outlets…), so a window of four is a mix
  const dealt = (list: LibraryPhoto[]) => {
    const kinds = [...new Set(list.map((p) => p.shows))].map((k) => list.filter((p) => p.shows === k))
    return Array.from({length: Math.max(0, ...kinds.map((k) => k.length))}, (_, i) => kinds.flatMap((k) => (k[i] ? [k[i]] : []))).flat()
  }
  const people = dealt(usable.filter((p) => p.kind === 'people' && AT_WORK.has(p.shows)).sort(byQuality))
  const jobs = dealt(usable.filter((p) => p.kind === 'job' && (p.subject === 'lighting' || p.subject === 'panel' || p.subject === 'wiring')).sort(byQuality))
  return {people, jobs}
}

/**
 * A city page's "Recent work": a mix of the crew at work and finished jobs, a different window of the library for each
 * city (`index`, its place in the city order), so no two city pages show the same photos. The caption says what the
 * photo shows, never where it was taken. Skips photos the page already shows; marks its picks shown.
 */
export function cityWork(index: number, shown: Set<string>, count: number): WorkPhoto[] {
  const {people, jobs} = cityWorkPool()
  const cities = 10
  // the crew at work in every strip while the library has enough of them (they repeat across cities before jobs do)
  const perPeople = Math.min(people.length >= 2 * cities ? 2 : people.length >= 5 ? 1 : 0, count - 1)
  const perJobs = count - perPeople
  // each city starts a fixed stride along the list (whatever its layout holds), so neighbouring cities never share a photo
  const window = (list: LibraryPhoto[], n: number) => {
    const out: LibraryPhoto[] = []
    const start = index * Math.max(n, Math.floor(list.length / cities))
    for (let k = start; out.length < n && k < start + list.length; k++) {
      const p = list[k % list.length]
      if (!shown.has(p.id) && !out.includes(p)) out.push(p)
    }
    return out
  }
  const ppl = window(people, perPeople)
  const job = window(jobs, perJobs)
  // people first in the lead cell when there is one: a face is the strongest photo in the strip
  const picks = [...ppl.slice(0, 1), ...job.slice(0, 1), ...ppl.slice(1), ...job.slice(1)].slice(0, count)
  if (picks.length < 3) return []
  picks.forEach((p) => shown.add(p.id))
  return picks.map(asWork)
}
