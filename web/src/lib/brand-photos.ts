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
  [VAN_PHOTO.image.asset!._id]: VAN_PHOTO.faces,
  [FLEET_PHOTO.image.asset!._id]: FLEET_PHOTO.faces,
}

/** The head boxes of a company photo of people, for data-faces (undefined for every other image). */
export function facesOf(image: ImageRef | null | undefined) {
  const r = resolveImage(image)
  return r?.kind === 'sanity' ? PHOTO_FACES[r.ref] : undefined
}
