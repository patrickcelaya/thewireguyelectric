// Fixed brand photos that components are designed around (their crops keep every
// face clear). They are Sanity assets (migration/brand-photos), served sized by
// Sanity's image CDN like any CMS image; `faces` lists the head boxes the layout
// keeps clear (x0,y0,x1,y1 as fractions of the photo), for QA tooling.
import type {ImageRef} from './types'

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
