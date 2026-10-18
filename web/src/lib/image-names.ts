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
  'image-69873586fe760f2a1192b56c3bc9202d34fdedbb-1086x724-avif': 'wire-guy-electric-fleet-desert-mountains',
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
  // posts' own images the owner approved for the blog pages (migration/content-data/cms-templates.json postImages): stock
  // photos, each named for what is visible, never for the business or the crew
  'image-5032d66daf212057d4fc0f92529a1431890f8190-1280x1707-jpg': 'swimming-pool-ladder-blue-tile',
  'image-d3861a88111fdf1702cd75956a50d97a0830b767-1279x913-jpg': 'brick-guest-house-pine-trees',
  'image-7384f25ce4dd84bac4d35ab082379a540d92f4c8-1920x1280-jpg': 'evaporative-cooler-fan-motor',
  'image-f81e8caf318448d40a926941a51a617f6dc6ba20-1920x2881-jpg': 'air-conditioner-condenser-charging-post',
  'image-887a5ed1add6d588a61ca0d1168790e84e73cec7-1920x1280-jpg': 'smart-thermostat-on-wall',
  'image-49c1de66b44766c233d94d3effda3dae458b3c8d-1600x1068-jpg': 'ductless-mini-split-empty-room',
  'image-e43b53c8307cf61f22ded0d34c1cc001a9af8ed7-1600x2397-jpg': 'open-breaker-box-wires',
  'image-55d227b6b0c09119e3ee7992b0b5bf5ba7a58173-1600x1067-jpg': 'hand-adjusting-smart-thermostat',
  'image-c907c983c2b0fb691d585cd95d51ebd06050e28b-1920x2863-jpg': 'sun-setting-desert-mountains',
  'image-da769dd4a83a698125042d3f0337b1a950dcdaf4-1920x1505-jpg': 'air-conditioner-condenser-rain',
  'image-b747e28f15e9933adeb0560d04289087e88960a9-1920x2560-jpg': 'electric-car-charging-cable',
  'image-1ff821f4c77edac191873dc21b6a027d01905a7e-1920x1282-jpg': 'old-wires-open-electrical-boxes',
  'image-7c662be9ad73cdc74a70e97df0686bb15db349fe-1920x1280-jpg': 'two-story-house-garage-sunset',
  'image-b9ab85f3cc5bb7072cb475b6de45931af828907d-1920x2880-jpg': 'indoor-hot-tub-wooden-deck',
  'image-b5c31f2f760cef236a4253d54bc78a5a3fb2d8de-1920x1280-jpg': 'lantern-lamp-post-dusk',
  'image-74d6fb8bcfcc3bf59790eaf3606513a48f1ba2fe-1920x2876-jpg': 'loose-wires-open-wall-box',
  'image-dba14105ea8cf3afe84ae28be9ce41f2a62ac451-1920x1281-jpg': 'ceiling-fan-coffered-ceiling-arched-window',
  'image-b7e45f9b6ea7348161e67251af56125d40ede425-1920x1080-jpg': 'lightning-over-city-lights',
  'image-8d5849228d21053fecf2c70f149fc3f2d9e2bc4e-1919x1281-jpg': 'recessed-lights-cove-lighting-empty-room',
  'image-f11facbd6087d24f7745673773dfb73660781cff-1920x1013-jpg': 'multimeter-testing-control-panel',
  'image-e7b6a34f700ae5ff24351199054ee70595df5f3d-1920x1280-jpg': 'snow-red-rock-buttes-clouds',
  'image-8ad15dbfd8b239a8a0ceac8ad0edac09ea6f98f3-1920x1280-jpg': 'sun-over-desert-sand-dunes',
  'image-dd2fdc67e9ad0d479d4805cc8b022bed7464f070-1920x1184-jpg': 'lightning-bolt-night-sky',
  'image-0f53bad76d6d3c781cbf00e6ac1ca187a5191c76-1920x2880-jpg': 'sold-sign-house-keys',
  'image-eb0d9e90ef784032887ffdee52379a43ae5c132d-1920x1278-jpg': 'screwdriver-breaker-distribution-board',
  'image-62365373ae4d8a29a3beb072f54221a2a22cd449-1920x1440-jpg': 'filament-bulb-black-cord',
  'image-53c8c54ff56d8b54d5e74ee6b41fcc28b6fc5036-1920x1080-jpg': 'blazing-sun-orange-clouds',
  'image-332bf81124145ef0d4d24f3d75ba6f0d75d867d4-1920x1440-jpg': 'industrial-circuit-breaker-enclosure',
  'image-a3da99728981a43501bfa85438c6b3f878233968-1920x1280-jpg': 'breakers-wires-control-panel',
  'image-ee0ff920b8323fb6ca14c628bb7d4ac37d4b07de-1920x1280-jpg': 'glowing-filament-light-bulb',
  'image-4d9d751121a2f97760fddd86654415cf762293a3-1920x1440-jpg': 'prewired-breaker-panel-workbench',
  'image-b3fae047fcdaf9bd4b2fc1ec2358d82f5beacd99-1920x2879-jpg': 'modern-house-swimming-pool',
  'image-4ed783386f7f148a7222f58a5a3a2933ffca691e-5183x3351-webp': 'plug-adapters-smiley-face',
  // the owner's photo library (migration/brand-photos/library.json): each file's own name, which says what it shows
  ...Object.fromEntries(LIBRARY.map((p) => [p.id, p.name])),
}
