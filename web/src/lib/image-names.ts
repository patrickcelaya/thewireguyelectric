// File names for the company's own photos on Sanity's image CDN (the "vanity name" after
// the asset's file name: …/<id>-<w>x<h>.<ext>/<name>). Image search reads a file name as
// a light hint, so each one says what the photo shows, never a place or a keyword the
// photo doesn't show. They are fixed per asset because the same photo carries slightly
// different alt text in different documents, and one photo must keep one URL on a page
// (its preload and its <img>). Every other image is named from its own alt text
// (lib/image.ts). Kept apart from brand-photos.ts, which imports lib/image.ts.
import LIBRARY from './library-photos.json'

export const IMAGE_NAMES: Record<string, string> = {
  // people
  'image-dbea2749464c7bb96fabc1ff06cd7add6f0f9a07-2542x1694-avif': 'wire-guy-electric-crew-and-trucks',
  'image-69873586fe760f2a1192b56c3bc9202d34fdedbb-1086x724-avif': 'wire-guy-electric-fleet-superstition-mountains',
  'image-039889c72aabf099f0b700d9e4f9dc301153852e-1280x853-avif': 'wire-guy-electric-technician-and-service-van',
  'image-bc523b429c9142dbf137a3e9aefcf4c050e9a43b-1086x724-avif': 'electricians-on-ladders-installing-lighting',
  'image-c892be993e9cc5f76be656862cbf6badf2a285bb-926x976-avif': 'ev-charger-installation-garage',
  'image-c1559eab13664ab87065c86bb6f3ea6385d5fe71-1160x1094-avif': 'electrician-working-wires-ceiling-opening',
  'image-573850cd5522597a7b86b1fc602e4e369ef9a9af-1125x1104-jpg': 'wire-guy-electric-technicians-front-path',
  'image-065450abf7a3f92cf2c8a12567fd107624696b97-1280x853-avif': 'wire-guy-electric-technicians-wrapped-van',
  'image-51d3154248a973b707481de374e6ec157bb85546-1280x853-avif': 'wire-guy-electric-technicians-pickup-tailgate',
  'image-2c9400de0ad740f382a00e4d7ec354818f6c0a5b-724x1086-avif': 'owner-steven-taylor-service-van',
  'image-5e79d62040719ac1ff05cd89850d18710d0e18aa-1086x724-avif': 'owner-steven-taylor-van-logo',
  'image-006950d5c7c46bf87a6b88cc37a3407d93f31809-1080x1236-png': 'electricians-pulling-cable-tenant-improvement',
  // job photos (no people)
  'image-cb001b94a2ca55b0d2c7ccecb4b2641334220a3c-1280x1256-png': 'siemens-electrical-panel-srp-meter',
  'image-1a1a63ffa572abef13cc6693c8bf6e80602a0a7d-3924x5887-jpg': 'pliers-wire-strippers-voltage-tester',
  'image-8ac78ca58f507beef3cc08a6e092ec742956e3e2-1280x960-jpg': 'kitchen-remodel-recessed-lights-island',
  'image-77b2debafc6c3cd45ac8cfbf5109126a1c0e2574-1536x2048-webp': 'tesla-wall-connector-garage-wall',
  'image-f9be117f7e0a911de638ca5b42fd0ca9a1caf0d8-3748x2811-jpg': 'soaking-tub-led-cove-lighting',
  'image-8418e8bb0d98b7681c7a2fa81807df71b08646a6-2048x1536-jpg': 'lamp-posts-brick-front-walk',
  'image-ed1de73427c40093df37f55b742ec7dbede75d0c-4284x5712-jpg': 'recessed-lights-vaulted-kitchen-ceiling',
  'image-49a454c64fdde0f5b5fc7b306b53f880eef5c97f-960x1280-jpg': 'chandelier-over-dining-table',
  'image-d338d7dc5dae879faa96751651f476d868aa99e6-1186x1120-avif': 'kitchen-recessed-lights-at-night',
  'image-d11c56eea7e73639905734cb2b5137587ae500d0-853x1280-avif': 'wire-strippers-pliers-voltage-tester-romex',
  // the four of the crew at a new panel (a post's own photo)
  'image-06e0b3fd4f83f9990bbd9f130cf956025cebdcf1-1633x1088-png': 'wire-guy-electric-crew-thumbs-up-new-panel',
  // the owner's photo library (migration/brand-photos/library.json): each file's own name, which says what it shows
  ...Object.fromEntries(LIBRARY.map((p) => [p.id, p.name])),
}
