// Fixed brand photos that components are designed around (their crops keep every
// face clear). They are Sanity assets (migration/brand-photos), served sized by
// Sanity's image CDN like any CMS image; `faces` lists the head boxes the layout
// keeps clear (x0,y0,x1,y1 as fractions of the photo), for QA tooling.
import type {ImageRef} from './types'
import {resolveImage} from './image'
import LIBRARY from './library-photos.json'

function asset(id: string, alt: string): ImageRef {
  return {alt, asset: {_id: id, url: ''}}
}

/**
 * The owner's photo library (migration/brand-photos/library.json, uploaded by upload.mjs and
 * registered by registry.mjs): what each photo shows (`subject`, `services`), whether people
 * are in it (`kind`, with their head boxes in `faces`), and the slots it was picked for
 * (`roles`: "cityHero:gilbert", "ctaBand", "serviceSecond:panels", "team:cody-taylor", …).
 */
export interface LibraryPhoto {
  id: string
  name: string
  alt: string
  /** A short factual caption (the alt's first clause); it never names a place. */
  caption: string
  kind: 'job' | 'people'
  /** What the library's catalogue says it shows, finer than `subject` (chandelier-pendant, tech-at-work, crew-group, …). */
  shows: string
  subject?: PhotoSubject
  services: string[]
  faces?: string
  orientation: 'landscape' | 'portrait' | 'square'
  quality: number
  roles: string[]
  /** A city hero's frame (Sanity crop fractions): the heads start at 71.5% of it, under the sky. */
  heroCrop?: {top: number; left: number; bottom: number; right: number}
  /** Photos from one shoot of one subject (the same truck): a page shows at most one of them. */
  group?: string
  /** Where the subject sits (fractions), for frames that crop the photo. */
  hotspot?: {x: number; y: number}
}
export const LIBRARY_PHOTOS = LIBRARY as LibraryPhoto[]
/** The library photo picked for a slot ("van", "cityHero:gilbert"), if any. */
export const photoFor = (role: string) => LIBRARY_PHOTOS.find((p) => p.roles.includes(role))
export const libraryImage = (p: LibraryPhoto, alt = p.alt): ImageRef => ({...asset(p.id, alt), ...(p.hotspot ? {hotspot: {...p.hotspot, width: 1, height: 1}} : {})})
function libraryRole(role: string) {
  const p = photoFor(role)
  if (!p) throw new Error(`brand-photos: no library photo for "${role}" (migration/brand-photos/library.json)`)
  return p
}

/** A Wire Guy electrician seen from behind, looking at a company van (the original of the old 1,280 px export). */
const VAN = libraryRole('van')
export const VAN_PHOTO = {
  image: libraryImage(VAN, 'A Wire Guy electrician, seen from behind in a company shirt with the phone number on the back, looking at a company van'),
  faces: VAN.faces!,
}

/** The valley poster: the fleet in the desert under the real sky (the full-resolution original, graded like the old export). */
const FLEET = libraryRole('fleet')
export const FLEET_PHOTO = {
  image: libraryImage(FLEET, 'Three Wire Guy Electric vans and a company pickup lined up in the desert, with four electricians and the mountains behind them'),
  faces: FLEET.faces!,
}

/**
 * Emma, the office manager who answers the phone, for the call buttons (header and phone call bar): her
 * portrait cropped to a square around her head box with room for hair and a little
 * shoulder (the head stays whole inside the frame).
 */
const EMMA = libraryRole('team:emma-woolington')
const emmaCrop = () => {
  const [x0, y0, x1, y1] = EMMA.faces!.split(',').map(Number)
  const side = Math.min(1, Math.max(x1 - x0, y1 - y0) * 1.5)
  const left = Math.min(Math.max(0, (x0 + x1) / 2 - side / 2), 1 - side)
  const top = Math.min(Math.max(0, (y0 + y1) / 2 - side / 2), 1 - side)
  return {left, top, right: 1 - left - side, bottom: 1 - top - side}
}
export const OFFICE_FACE: ImageRef = {...libraryImage(EMMA, ''), hotspot: undefined, crop: emmaCrop()}

/**
 * Head boxes (x0,y0,x1,y1 as fractions of the uncropped photo) of the company's
 * photos of people, by Sanity asset. SanityImage writes them to data-faces wherever
 * the photo is used, so the QA face checks (faces.mjs) can prove no layout ever
 * crops, covers or fades a face. Photos without people have no entry.
 */
const PHOTO_FACES: Record<string, string> = {
  // the crew of six in front of the trucks (the homepage hero)
  'image-dbea2749464c7bb96fabc1ff06cd7add6f0f9a07-2542x1694-avif':
    '0.155,0.578,0.22,0.675;0.275,0.46,0.34,0.57;0.415,0.49,0.48,0.59;0.54,0.465,0.605,0.575;0.675,0.46,0.735,0.57;0.79,0.505,0.86,0.605',
  // two electricians on ladders under a vaulted ceiling
  'image-bc523b429c9142dbf137a3e9aefcf4c050e9a43b-1086x724-avif': '0.19,0.26,0.31,0.38;0.56,0.29,0.66,0.42',
  // EV charger install in a garage
  'image-c892be993e9cc5f76be656862cbf6badf2a285bb-926x976-avif': '0.545,0.22,0.67,0.36',
  // troubleshooting at a ceiling opening
  'image-c1559eab13664ab87065c86bb6f3ea6385d5fe71-1160x1094-avif': '0.17,0.27,0.43,0.54',
  // two inspectors walking up a front path
  'image-573850cd5522597a7b86b1fc602e4e369ef9a9af-1125x1104-jpg': '0.27,0.40,0.38,0.55;0.55,0.40,0.64,0.54',
  // four of the crew at the wrapped van
  'image-065450abf7a3f92cf2c8a12567fd107624696b97-1280x853-avif': '0.13,0.32,0.18,0.41;0.30,0.36,0.37,0.45;0.65,0.30,0.72,0.40;0.84,0.32,0.90,0.41',
  // four of the crew on a pickup's tailgate
  'image-51d3154248a973b707481de374e6ec157bb85546-1280x853-avif': '0.25,0.31,0.33,0.46;0.40,0.34,0.485,0.46;0.60,0.30,0.67,0.44;0.74,0.32,0.815,0.45',
  // Steven, with Cody behind him, at the vans
  'image-2c9400de0ad740f382a00e4d7ec354818f6c0a5b-724x1086-avif': '0.355,0.355,0.46,0.46;0.725,0.445,0.795,0.5',
  // owner Steven Taylor in black and white at the van's logo (/services, /faq)
  'image-5e79d62040719ac1ff05cd89850d18710d0e18aa-1086x724-avif': '0.55,0.24,0.64,0.425',
  // tenant improvement cable pull: the electrician at the panel and one in the doorway (the man at the left
  // edge faces away from the camera)
  'image-006950d5c7c46bf87a6b88cc37a3407d93f31809-1080x1236-png': '0.60,0.27,0.67,0.34;0.505,0.335,0.545,0.375',
  // team portraits (/our-team, /about-us, /careers): Steven, Cody, Cade, Wade, Emma, Lauren at the block wall,
  // Blake and Brandon at a van, Stephanie
  'image-670f75dc6fee57481242beee31390bce48dccf2b-1280x1280-avif': '0.41,0.12,0.59,0.35',
  'image-a30bc40663b4594c58a9438436fc2f2114f8541c-1280x1280-avif': '0.41,0.19,0.59,0.40',
  'image-b949dcb5714cacc742d0b3510df1819740666e02-1280x1280-avif': '0.42,0.19,0.58,0.39',
  'image-0603eb2e57308ea387e15ef783bd34f3fbf1fc92-1280x1280-avif': '0.39,0.20,0.56,0.40',
  'image-273b8e2ee4862226cb9abdad24a43110fd162481-1280x1280-avif': '0.40,0.25,0.61,0.49',
  'image-bc51135bd08e5fee5d91ba562c6ce65b8884e307-1280x1280-avif': '0.39,0.25,0.59,0.49',
  'image-93e149ea8e7a592e9d305c197b9c5b235c40e141-1280x960-jpg': '0.41,0.255,0.485,0.38',
  'image-630b928b18849bf1ee4a32a0fc96b32a5fccc28a-1280x960-jpg': '0.36,0.25,0.44,0.385',
  'image-7f5550e12af844babb390fc349948db55fb34598-1280x960-jpg': '0.40,0.23,0.62,0.44',
  // the old exports of the estimate band's and the valley poster's photos (the library holds their originals)
  'image-039889c72aabf099f0b700d9e4f9dc301153852e-1280x853-avif': '0.25,0.27,0.375,0.415',
  'image-69873586fe760f2a1192b56c3bc9202d34fdedbb-1086x724-avif': '0.255,0.715,0.295,0.775;0.435,0.715,0.48,0.775;0.595,0.72,0.635,0.78;0.755,0.72,0.795,0.78',
  // four of the crew giving a thumbs-up beside a new panel and meter on a block wall (the bucket hat at the left
  // touches the top of the frame in the photo itself)
  'image-06e0b3fd4f83f9990bbd9f130cf956025cebdcf1-1633x1088-png': '0.15,0.004,0.265,0.161;0.379,0.42,0.464,0.60;0.571,0.41,0.65,0.59;0.674,0.146,0.75,0.32',
  // the library: every photo of people, with its head boxes (each checked by eye on the photo)
  ...Object.fromEntries(LIBRARY_PHOTOS.filter((p) => p.kind === 'people').map((p) => [p.id, p.faces!])),
}

/** The head boxes of a company photo of people, for data-faces (undefined for every other image). */
export function facesOf(image: ImageRef | null | undefined) {
  const ref = resolveImage(image)?.ref
  return ref ? PHOTO_FACES[ref] : undefined
}

/**
 * The head boxes of a photo of people in the frame it is served in: after the editor's crop and, with `aspect`, after
 * the CDN's crop to that ratio around the hotspot (lib/image.ts), as fractions of what the visitor gets. data-faces must
 * describe the served image, or the QA face check would test the wrong places.
 */
export function facesInFrame(image: ImageRef | null | undefined, aspect?: number) {
  const faces = facesOf(image)
  const r = resolveImage(image)
  if (!faces || !r) return faces
  const c = r.crop ?? {top: 0, left: 0, bottom: 0, right: 0}
  // the frame after the editor's crop, in fractions of the whole photo
  let x0 = c.left, y0 = c.top, fw = 1 - c.left - c.right, fh = 1 - c.top - c.bottom
  if (aspect) {
    const w = r.width * fw, h = r.height * fh
    const hx = r.hotspot?.x ?? 0.5, hy = r.hotspot?.y ?? 0.5
    if (w / h > aspect) {
      const cw = (h * aspect) / r.width
      x0 = Math.min(Math.max(hx - cw / 2, x0), x0 + fw - cw)
      fw = cw
    } else {
      const ch = w / aspect / r.height
      y0 = Math.min(Math.max(hy - ch / 2, y0), y0 + fh - ch)
      fh = ch
    }
  }
  if (!x0 && !y0 && fw === 1 && fh === 1) return faces
  const k = (v: number) => Math.round(v * 1000) / 1000
  return faces
    .split(';')
    .map((b) => {
      const [a, bb, cc, d] = b.split(',').map(Number)
      return [k((a - x0) / fw), k((bb - y0) / fh), k((cc - x0) / fw), k((d - y0) / fh)].join(',')
    })
    .join(';')
}

/**
 * Whether every head in a photo of people has room around it inside the photo itself (15% of its height above, 6% of
 * its width at each side, as the QA face check asks). A head at the photo's own edge (the bucket hat in the four at the
 * new panel) can't be framed with room by any layout, so the pickers leave such a photo out. True for job photos.
 */
export function headsHaveRoom(image: ImageRef | null | undefined) {
  return (facesOf(image) ?? '')
    .split(';')
    .filter(Boolean)
    .every((b) => {
      const [x0, y0, x1, y1] = b.split(',').map(Number)
      return y0 - (y1 - y0) * 0.15 >= 0 && x0 - (x1 - x0) * 0.06 >= 0 && x1 + (x1 - x0) * 0.06 <= 1
    })
}

/** Two of the crew walking up a customer's front path: "we come to you" (city pages). */
export const WALK_PHOTO = {
  image: asset(
    'image-573850cd5522597a7b86b1fc602e4e369ef9a9af-1125x1104-jpg',
    'Two Wire Guy Electric technicians walking up a customer’s front path in an Arizona neighborhood',
  ),
}

/**
 * Steven at a service van, Cody behind him (a portrait): the city glance photo where the walk-up photo is
 * already on the page as the Electrical Safety Inspections card, so no photo shows twice.
 */
export const VANS_PHOTO = {
  image: asset(
    'image-2c9400de0ad740f382a00e4d7ec354818f6c0a5b-724x1086-avif',
    'Owner Steven Taylor standing beside a Wire Guy Electric service van with a ladder rack, a second technician behind him',
  ),
}

/**
 * What a job photo shows, so a guide card shows a photo of its own subject (postCover).
 * `subject` is what it is a photo of; `also` names other subjects it suits (the lamp-lined
 * front walk is exterior work and lighting). `services` names the services whose work it
 * shows, by what is in the photo (recessed lights, a chandelier, LED cove lighting): a guide
 * whose first service is listed, or whose first service's own photo it is, shows one of these
 * or none (the EV charger install photo has a person in it, so the Wall Connector stands in
 * for it). A photo of a narrow subject (`narrow`: the EV charger) is never borrowed for another
 * subject. The tools flat-lay is the neutral photo: it suits a guide with no subject of its
 * own (troubleshooting, safety).
 */
export type PhotoSubject = 'lighting' | 'panel' | 'tools' | 'ev' | 'exterior' | 'wiring' | 'fleet'
const PHOTO_SUBJECTS: readonly string[] = ['lighting', 'panel', 'tools', 'ev', 'exterior', 'wiring', 'fleet'] satisfies PhotoSubject[]
/** Whether a blog topic's slug is also a photo subject (lighting is; commercial is not). */
export const isPhotoSubject = (slug: string): slug is PhotoSubject => PHOTO_SUBJECTS.includes(slug)
/**
 * Services whose work is a subject of its own that the library has no photo of yet (no pool, spa or hot tub
 * photo). A guide card labeled with one shows a photo of it or none, like any other subject (postCover): never
 * the panel or tools photos a card with no subject (troubleshooting, safety) falls back to. Take a service off
 * once the library has a photo of its work.
 */
export const UNPHOTOGRAPHED_SERVICES: readonly string[] = ['hot-tub-pool-spa-electrical']
interface JobPhoto {
  image: ImageRef
  subject: PhotoSubject
  also?: PhotoSubject[]
  services?: string[]
  narrow?: boolean
}

/**
 * The company's own job photos without people (finished rooms, panels, tools): the only
 * photos a template may lay a full copper tint over, and the covers the CMS templates
 * give a guide whose own image is stock. Most service and post images imported from
 * Webflow are stock (redesign asset audit, section 4), so a template shows a CMS photo
 * large only when it is listed here or in PHOTO_FACES. Add new job photos here, with
 * what they show, in the same words as the service document that uses the photo
 * (migration/content-data/cms-templates.json serviceAlts), so one photo has one alt. The one exception is a post's own image the owner approved
 * (post.showMainImage, lib/cms.ts ownPostImage): on blog pages only, never under a tint,
 * never on a service or city page; it is not a job photo and is never listed here.
 */
const JOB_PHOTO_LIST: JobPhoto[] = [
  {subject: 'panel', services: ['panels'], image: asset('image-cb001b94a2ca55b0d2c7ccecb4b2641334220a3c-1280x1256-png', 'A new Siemens electrical panel with labeled breakers next to an SRP meter on a stucco wall')},
  {subject: 'tools', image: asset('image-1a1a63ffa572abef13cc6693c8bf6e80602a0a7d-3924x5887-jpg', 'Pliers, wire strippers and a voltage tester on a coil of yellow wire')},
  {subject: 'lighting', services: ['electrical-remodels', 'recessed-lights-installation'], image: asset('image-8ac78ca58f507beef3cc08a6e092ec742956e3e2-1280x960-jpg', 'A finished kitchen remodel with recessed lights, white cabinets and a stone island')},
  // a portrait: card crops (1.6:1) keep the connector in frame, not the bare wall under it
  {
    subject: 'ev',
    narrow: true,
    services: ['ev-charger-installation'],
    image: {...asset('image-77b2debafc6c3cd45ac8cfbf5109126a1c0e2574-1536x2048-webp', 'A Tesla Wall Connector installed on a garage wall'), hotspot: {x: 0.5, y: 0.3, width: 1, height: 1}},
  },
  {subject: 'lighting', services: ['custom-lighting', 'led-lights'], image: asset('image-f9be117f7e0a911de638ca5b42fd0ca9a1caf0d8-3748x2811-jpg', 'Soaking tub alcove lit by LED cove and toe-kick lighting below plantation shutters')},
  {subject: 'exterior', also: ['lighting'], services: ['exterior-electrical'], image: asset('image-8418e8bb0d98b7681c7a2fa81807df71b08646a6-2048x1536-jpg', 'Lamp posts lighting a brick front walk lined with roses')},
  {subject: 'lighting', services: ['recessed-lights-installation'], image: asset('image-ed1de73427c40093df37f55b742ec7dbede75d0c-4284x5712-jpg', 'New recessed lights glowing in a vaulted kitchen ceiling')},
  {subject: 'lighting', services: ['fixture-replacements', 'hanging-lights'], image: asset('image-49a454c64fdde0f5b5fc7b306b53f880eef5c97f-960x1280-jpg', 'Chandelier hanging over a dining table in a room with a coffered ceiling and wainscoting')},
  {subject: 'lighting', services: ['recessed-lights-installation', 'electrical-remodels'], image: asset('image-d338d7dc5dae879faa96751651f476d868aa99e6-1186x1120-avif', 'A remodeled kitchen at night lit by recessed ceiling lights')},
  {subject: 'tools', image: asset('image-d11c56eea7e73639905734cb2b5137587ae500d0-853x1280-avif', 'Klein wire strippers, linesman pliers and a voltage tester on a coil of yellow Romex cable')},
  // the library's photos without people. `wiring` is outlets, switches and rough-in wiring; `fleet` (the vans and
  // trucks) and `ev` are narrow: a truck is never a guide's cover, an EV charger only an EV guide's
  ...LIBRARY_PHOTOS.filter((p) => p.kind === 'job').map((p) => ({
    subject: p.subject!,
    ...(p.services.length ? {services: p.services} : {}),
    ...(p.subject === 'ev' || p.subject === 'fleet' ? {narrow: true} : {}),
    image: libraryImage(p),
  })),
]
export const JOB_PHOTOS: ImageRef[] = JOB_PHOTO_LIST.map((p) => p.image)

/** The same photo uploaded twice (a smaller export of the tools flat-lay): the copy → the original. */
const SAME_PHOTO: Record<string, string> = {
  'image-d11c56eea7e73639905734cb2b5137587ae500d0-853x1280-avif': 'image-1a1a63ffa572abef13cc6693c8bf6e80602a0a7d-3924x5887-jpg',
}

/** Which photo an image is (a duplicate upload counts as its original), so a row of covers never shows one twice. */
export function photoId(image: ImageRef | null | undefined) {
  const ref = resolveImage(image)?.ref ?? ''
  return SAME_PHOTO[ref] ?? ref
}
const JOB_PHOTO_BY_ID = new Map(JOB_PHOTO_LIST.map((p) => [p.image.asset!._id, p]))

/** A company job photo's subject and reach (undefined for every other image). */
export function jobPhoto(image: ImageRef | null | undefined): Omit<JobPhoto, 'image'> | undefined {
  const ref = resolveImage(image)?.ref
  return ref ? JOB_PHOTO_BY_ID.get(ref) : undefined
}

/** The job photo as listed above (with its card hotspot), else the image itself. */
export function jobPhotoImage(image: ImageRef): ImageRef {
  const ref = resolveImage(image)?.ref
  return (ref && JOB_PHOTO_BY_ID.get(ref)?.image) || image
}

/**
 * Whether a CMS image is one of the company's own photos, and whether people are in
 * it: "job" (no people: may sit under a full tint), "people" (faces listed above:
 * shown in natural colour, faces in frame) or undefined (stock, or not known).
 */
export function companyPhoto(image: ImageRef | null | undefined): 'job' | 'people' | undefined {
  const ref = resolveImage(image)?.ref
  if (!ref) return undefined
  if (PHOTO_FACES[ref]) return 'people'
  return JOB_PHOTO_BY_ID.has(ref) ? 'job' : undefined
}
