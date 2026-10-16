// Fixed brand photos that components are designed around (their crops keep every
// face clear). They are Sanity assets (migration/brand-photos), served sized by
// Sanity's image CDN like any CMS image; `faces` lists the head boxes the layout
// keeps clear (x0,y0,x1,y1 as fractions of the photo), for QA tooling.
import type {ImageRef} from './types'
import {resolveImage} from './image'

function asset(id: string, alt: string): ImageRef {
  return {alt, asset: {_id: id, url: ''}}
}

/** The estimate band: a Wire Guy electrician seen from behind, looking at a company van. */
export const VAN_PHOTO = {
  image: asset(
    'image-039889c72aabf099f0b700d9e4f9dc301153852e-1280x853-avif',
    'A Wire Guy electrician, seen from behind in a company shirt with the phone number on the back, looking at a company van',
  ),
  faces: '0.25,0.27,0.375,0.415',
}

/**
 * The valley poster: the fleet in the desert under the real sky. The largest export
 * is 1,086 px; for big screens it is served as carefully enlarged copies (Lanczos
 * plus a light unsharp mask) from public/img until the original arrives.
 */
export const FLEET_PHOTO = {
  image: asset(
    'image-69873586fe760f2a1192b56c3bc9202d34fdedbb-1086x724-avif',
    'Three Wire Guy Electric vans and a company pickup lined up in the desert, with four electricians and the Superstition Mountains behind them',
  ),
  enlarged: [
    {src: '/img/fleet-1600.avif', width: 1600},
    {src: '/img/fleet-2172.avif', width: 2172},
  ],
  faces: '0.255,0.715,0.295,0.775;0.435,0.715,0.48,0.775;0.595,0.72,0.635,0.78;0.755,0.72,0.795,0.78',
}

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
  [VAN_PHOTO.image.asset!._id]: VAN_PHOTO.faces,
  [FLEET_PHOTO.image.asset!._id]: FLEET_PHOTO.faces,
}

/** The head boxes of a company photo of people, for data-faces (undefined for every other image). */
export function facesOf(image: ImageRef | null | undefined) {
  const r = resolveImage(image)
  return r?.kind === 'sanity' ? PHOTO_FACES[r.ref] : undefined
}

/** Two of the crew walking up a customer's front path: "we come to you" (city pages). */
export const WALK_PHOTO = {
  image: asset(
    'image-573850cd5522597a7b86b1fc602e4e369ef9a9af-1125x1104-jpg',
    'Two Wire Guy Electric technicians walking up a customer’s front path in an Arizona neighborhood',
  ),
}

/**
 * The company's own job photos without people (finished rooms, panels, tools): the only
 * photos a template may lay a full copper tint over, and the covers the CMS templates
 * give a guide whose own image is stock. Most service and post images imported from
 * Webflow are stock (redesign asset audit, section 4), so a template shows a CMS photo
 * large only when it is listed here or in PHOTO_FACES. Add new job photos here.
 */
export const JOB_PHOTOS: ImageRef[] = [
  asset('image-cb001b94a2ca55b0d2c7ccecb4b2641334220a3c-1280x1256-png', 'A new Siemens panel with labeled breakers next to an SRP meter on a stucco wall'),
  asset('image-1a1a63ffa572abef13cc6693c8bf6e80602a0a7d-3924x5887-jpg', 'Pliers, wire strippers and a voltage tester on a coil of yellow wire'),
  asset('image-8ac78ca58f507beef3cc08a6e092ec742956e3e2-1280x960-jpg', 'A remodeled kitchen with recessed lights over a marble-look island'),
  asset('image-77b2debafc6c3cd45ac8cfbf5109126a1c0e2574-1536x2048-webp', 'A Tesla Wall Connector installed on a garage wall'),
  asset('image-f9be117f7e0a911de638ca5b42fd0ca9a1caf0d8-3748x2811-jpg', 'Soaking tub alcove lit by LED cove and toe-kick lighting below plantation shutters'),
  asset('image-8418e8bb0d98b7681c7a2fa81807df71b08646a6-2048x1536-jpg', 'A front walk lined with lamp posts and roses at a brick home'),
  asset('image-ed1de73427c40093df37f55b742ec7dbede75d0c-4284x5712-jpg', 'Recessed lights in the vaulted ceiling of a kitchen'),
  asset('image-49a454c64fdde0f5b5fc7b306b53f880eef5c97f-960x1280-jpg', 'Chandelier hanging over a dining table in a room with a coffered ceiling and wainscoting'),
  asset('image-d338d7dc5dae879faa96751651f476d868aa99e6-1186x1120-avif', 'A remodeled kitchen at night lit by recessed ceiling lights'),
  asset('image-d11c56eea7e73639905734cb2b5137587ae500d0-853x1280-avif', 'Klein wire strippers, linesman pliers and a voltage tester on a coil of yellow Romex cable'),
]
const JOB_PHOTO_IDS = new Set(JOB_PHOTOS.map((p) => p.asset!._id))

/**
 * Whether a CMS image is one of the company's own photos, and whether people are in
 * it: "job" (no people: may sit under a full tint), "people" (faces listed above:
 * shown in natural colour, faces in frame) or undefined (stock, or not known).
 */
export function companyPhoto(image: ImageRef | null | undefined): 'job' | 'people' | undefined {
  const r = resolveImage(image)
  if (r?.kind !== 'sanity') return undefined
  if (PHOTO_FACES[r.ref]) return 'people'
  return JOB_PHOTO_IDS.has(r.ref) ? 'job' : undefined
}
