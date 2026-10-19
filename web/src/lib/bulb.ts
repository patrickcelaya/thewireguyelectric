// The light bulb: the logo's own single-line outline, in a 300 × 430 box. One
// path, drawn by the wire (components/ui/Bulb.astro), used as a sprite symbol
// (MiniBulb, the menu sign-off) and at the end of the valley map's wire.

/** From the left of the base, up and around the glass, the filament loop, back down to the right of the base. */
export const BULB_PATH =
  'M104 300 C104 262 36 232 36 152 C36 86 88 36 150 36 C212 36 264 86 264 150 C264 176 254 196 238 214 ' +
  'C222 232 196 232 192 214 C188 196 212 184 228 196 C244 208 222 234 210 250 C200 264 196 282 196 300'

/** The same outline drawn the other way, for a wire that comes in from the right. */
export const BULB_PATH_REVERSED =
  'M196 300 C196 282 200 264 210 250 C222 234 244 208 228 196 C212 184 188 196 192 214 C196 232 222 232 238 214 ' +
  'C254 196 264 176 264 150 C264 86 212 36 150 36 C88 36 36 86 36 152 C36 232 104 262 104 300'

/** The two bars and the cap of the base: x, y, width, height (rx 10). */
export const BULB_BARS: Array<[number, number, number, number]> = [
  [96, 318, 108, 20],
  [104, 350, 92, 20],
]
export const BULB_CAP = 'M114 382 H186 A36 36 0 0 1 114 382 Z'

/**
 * The lead-in wire, level with the base. Its default start reaches far past the
 * edge, so it looks right without JS; site.ts moves it to the exact edge of its field.
 */
export const BULB_LEAD = {
  left: 'M-1400 352 H64 Q104 352 104 312 L104 300',
  right: 'M1700 352 H236 Q196 352 196 312 L196 300',
} as const
