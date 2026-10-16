// Geometry of the valley map (components/sections/Valley.astro), computed at build
// time from the relief's own coordinate space (data/relief.json) and the city list.
//
// The relief image (public/img/relief/relief-{1200,1800,2600}.{avif,webp}) and
// data/relief.json come from scripts/valley/relief.py (USGS elevation tiles; see
// docs/DESIGN_SYSTEM.md, "Valley map"). relief.json holds the crop, the image's
// aspect ratio, each town's USGS GNIS point and the range labels, as fractions of
// the image. A city with no point there is placed from its Sanity `geo`.
//
// One copper wire runs through the towns in the order of the index beside the map
// (the order of the `cities` passed in), as a smoothed centripetal Catmull-Rom
// curve whose legs bow outward from the valley's centre; after the last town it
// runs on and draws a small bulb (the logo's outline). Each town lights when the
// eased draw actually reaches it (easeTime).
import reliefJson from '../data/relief.json'
import {BULB_BARS} from './bulb'
import type {City} from './cities'

type Pt = [number, number]
type Seg = [Pt, Pt, Pt, Pt]

interface ReliefData {
  /** [west, east, south, north] in degrees. */
  crop: [number, number, number, number]
  /** Image width / height. */
  aspect: number
  /** slug → [x, y] as fractions of the image (USGS GNIS points). */
  cities: Record<string, [number, number]>
  /** key → [label, x, y]. */
  mountains: Record<string, [string, number, number]>
}
const relief = reliefJson as unknown as ReliefData

/** SVG user space: 1000 units wide, the relief's aspect ratio. */
const VW = 1000
const VH = Math.round((VW / relief.aspect) * 100) / 100
const [LNG0, LNG1, LAT0, LAT1] = relief.crop

/**
 * Which side of its light each town's label sits on, per layout: d desktop
 * (≥ 1280 px), t tablet (700–1279), m phone. One of r l t b tr tl br bl, chosen so
 * no label sits on the wire, another light or label, or under the index panel at
 * any width of that layout (the round-5 mockups' optimize-labels.mjs, checked by
 * labels.mjs). Towns not listed put their label on the right.
 */
const LABEL_SIDES: Record<'d' | 't' | 'm', Record<string, string>> = {
  d: {mesa: 't', gilbert: 'r', chandler: 'br', ahwatukee: 'l', tempe: 'l', phoenix: 'l', scottsdale: 'tl', 'fountain-hills': 't', 'apache-junction': 'l', 'queen-creek': 'bl', 'san-tan-valley': 'bl'},
  t: {mesa: 'tr', gilbert: 'r', chandler: 'br', ahwatukee: 'l', tempe: 'l', phoenix: 'l', scottsdale: 'b', 'fountain-hills': 't', 'apache-junction': 'l', 'queen-creek': 'bl', 'san-tan-valley': 'tr'},
  m: {mesa: 'r', gilbert: 'r', chandler: 'b', ahwatukee: 'bl', tempe: 'l', phoenix: 'b', scottsdale: 'tl', 'fountain-hills': 't', 'apache-junction': 'l', 'queen-creek': 'bl', 'san-tan-valley': 'bl'},
}

/** The ranges a local navigates by (the others sit under the panel, off the edge or on a town's label). */
const RANGE_LABELS = ['mcdowell', 'phxmtns', 'santan'] as const

/** The logo's bulb outline as cubic segments, in its 300 × 430 box (lib/bulb.ts BULB_PATH). */
const BULB_SEGS: Array<[Pt, Pt, Pt]> = [
  [[104, 262], [36, 232], [36, 152]],
  [[36, 86], [88, 36], [150, 36]],
  [[212, 36], [264, 86], [264, 150]],
  [[264, 176], [254, 196], [238, 214]],
  [[222, 232], [196, 232], [192, 214]],
  [[188, 196], [212, 184], [228, 196]],
  [[244, 208], [222, 234], [210, 250]],
  [[200, 264], [196, 282], [196, 300]],
]
const BULB_START: Pt = [104, 300]
/** 300-unit bulb box → 27 user units wide (~50 px on a 1440 screen, ~26 px on a phone). */
const BULB_K = 0.09

/** The wire's draw: atlas.css animates it with cubic-bezier(.2, 0, .6, 1). */
const DRAW_EASE: [number, number, number, number] = [0.2, 0, 0.6, 1]

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])
const f1 = (n: number) => n.toFixed(1)
const fp = (p: Pt) => `${f1(p[0])} ${f1(p[1])}`
const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d

/** Web Mercator, as the terrain tiles are. */
const mercY = (lat: number) => (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2

/** A city's point as fractions (x, y) of the relief image. */
function cityPoint(city: City): Pt | undefined {
  const known = relief.cities[city.slug]
  if (known) return [known[0], known[1]]
  if (!city.geo) return undefined
  const x = (city.geo.lng - LNG0) / (LNG1 - LNG0)
  const y = (mercY(city.geo.lat) - mercY(LAT1)) / (mercY(LAT0) - mercY(LAT1))
  return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? [x, y] : undefined
}

/**
 * The route as one smooth wire: centripetal Catmull-Rom tangents (alpha .5); where
 * the route doubles back the tangent is lengthened so it rounds the turn instead
 * of folding into a cusp; each leg bows outward from the valley's centre by `bow`
 * of its chord. A leg through the middle (no clear outward side) bows away from the
 * nearest other town instead, leaving that town's label room.
 */
function catmull(pts: Pt[], alpha = 0.5, hairpin = 2.5, bow = 0.05): Seg[] {
  const C: Pt = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
  const first: Pt = [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]]
  const n = pts.length
  const last: Pt = [2 * pts[n - 1][0] - pts[n - 2][0], 2 * pts[n - 1][1] - pts[n - 2][1]]
  const P = [first, ...pts, last]
  const tangent = (i: number): [Pt, number] => {
    const [p0, p1, p2] = [P[i - 1], P[i], P[i + 1]]
    const t1 = Math.max(1e-6, dist(p0, p1) ** alpha)
    const t2 = Math.max(1e-6, dist(p1, p2) ** alpha)
    const v: Pt = [0, 1].map((k) => (p1[k] - p0[k]) / t1 - (p2[k] - p0[k]) / (t1 + t2) + (p2[k] - p1[k]) / t2) as Pt
    const a: Pt = [p1[0] - p0[0], p1[1] - p0[1]]
    const b: Pt = [p2[0] - p1[0], p2[1] - p1[1]]
    const cos = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b) + 1e-9)
    return [v, 1 + hairpin * Math.max(0, -cos)]
  }
  const segs: Seg[] = []
  for (let i = 1; i < P.length - 2; i++) {
    const [p1, p2] = [P[i], P[i + 1]]
    const [v1, s1] = tangent(i)
    const [v2, s2] = tangent(i + 1)
    const t2 = Math.max(1e-6, dist(p1, p2) ** alpha)
    let c1: Pt = [p1[0] + (t2 * v1[0] * s1) / 3, p1[1] + (t2 * v1[1] * s1) / 3]
    let c2: Pt = [p2[0] - (t2 * v2[0] * s2) / 3, p2[1] - (t2 * v2[1] * s2) / 3]
    const L = dist(p1, p2) || 1
    let nrm: Pt = [(p1[1] - p2[1]) / L, (p2[0] - p1[0]) / L]
    const m: Pt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
    let dot = nrm[0] * (m[0] - C[0]) + nrm[1] * (m[1] - C[1])
    let b = bow
    if (Math.abs(dot) < 0.3 * L) {
      const others = pts.filter((x) => x !== p1 && x !== p2)
      const q = others.reduce((best, x) => (dist(x, m) < dist(best, m) ? x : best), others[0])
      if (q) {
        dot = -(nrm[0] * (q[0] - m[0]) + nrm[1] * (q[1] - m[1]))
        b = bow * 3
      }
    }
    if (dot < 0) nrm = [-nrm[0], -nrm[1]]
    c1 = [c1[0] + nrm[0] * b * L, c1[1] + nrm[1] * b * L]
    c2 = [c2[0] + nrm[0] * b * L, c2[1] + nrm[1] * b * L]
    segs.push([p1, c1, c2, p2])
  }
  return segs
}

function bezierLength([p0, c1, c2, p1]: Seg, steps = 48) {
  const at = (t: number): Pt => {
    const u = 1 - t
    return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k]) as Pt
  }
  let len = 0
  let prev = at(0)
  for (let i = 1; i <= steps; i++) {
    const next = at(i / steps)
    len += dist(prev, next)
    prev = next
  }
  return len
}

const line = (a: Pt, b: Pt): Seg => [a, [a[0] + (b[0] - a[0]) / 3, a[1] + (b[1] - a[1]) / 3], [a[0] + (2 * (b[0] - a[0])) / 3, a[1] + (2 * (b[1] - a[1])) / 3], b]

/** The moment (a fraction of the draw's duration) at which the eased draw has covered `f` of the wire. */
export function easeTime(f: number, [x1, y1, x2, y2] = DRAW_EASE) {
  const bez = (s: number, a: number, b: number) => 3 * (1 - s) ** 2 * s * a + 3 * (1 - s) * s * s * b + s ** 3
  let lo = 0
  let hi = 1
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (bez(mid, y1, y2) < f) lo = mid
    else hi = mid
  }
  return bez((lo + hi) / 2, x1, x2)
}

export interface ValleyPin {
  slug: string
  name: string
  /** Position as percentages of the stage. */
  x: string
  y: string
  /** When this town lights, as a fraction of the draw (CSS --t). */
  t: number
  sides: {d: string; t: string; m: string}
}

export interface ValleyGeometry {
  viewBox: string
  /** The wire's path data (route, tail, lead-in and the bulb's outline). */
  wire: string
  pins: ValleyPin[]
  bulb: {glass: string; bars: Array<{x: string; y: string; width: string; height: string; rx: string}>; cap: string; cx: string; cy: string; haloR: string}
  ranges: Array<{key: string; label: string; x: string; y: string}>
  /** CSS custom properties for the stage: the aspect ratio and the box it keeps in view. */
  stageStyle: string
}

/** The map for these cities, in this order (the index's order). Cities without a known point are left off the map. */
export function valleyGeometry(cities: City[]): ValleyGeometry | undefined {
  const placed = cities.flatMap((c) => {
    const p = cityPoint(c)
    return p ? [{city: c, frac: p, pt: [p[0] * VW, p[1] * VH] as Pt}] : []
  })
  if (placed.length < 2) return undefined
  const pts = placed.map((p) => p.pt)
  const segs = catmull(pts)

  // the end bulb: right of the last town and a little lower, so the tail leaves on the route's heading and enters
  // the bulb's base from the left, like the estimate band's wire
  const lastPt = pts[pts.length - 1]
  const ox = lastPt[0] + 24 - 64 * BULB_K
  const oy = lastPt[1] + 30 - 352 * BULB_K
  const T = (p: Pt): Pt => [ox + p[0] * BULB_K, oy + p[1] * BULB_K]
  const lead0 = T([40, 352])
  const end = segs[segs.length - 1]
  const hx = end[3][0] - end[2][0]
  const hy = end[3][1] - end[2][1]
  const hl = Math.hypot(hx, hy) || 1
  const tail: Seg = [lastPt, [lastPt[0] + (hx / hl) * 14, lastPt[1] + (hy / hl) * 14], [lead0[0] - 12, lead0[1]], lead0]
  const lead: Seg[] = [line(lead0, T([64, 352])), [T([64, 352]), T([86, 352]), T([104, 334]), T([104, 312])], line(T([104, 312]), T([104, 300]))]
  const body: Seg[] = []
  let cur = BULB_START
  for (const [c1, c2, p] of BULB_SEGS) {
    body.push([T(cur), T(c1), T(c2), T(p)])
    cur = p
  }
  const all = [...segs, tail, ...lead, ...body]
  const lens = all.map((s) => bezierLength(s))
  const total = lens.reduce((a, b) => a + b, 0)
  const at = new Map<string, number>([[placed[0].city.slug, 0]])
  let acc = 0
  placed.slice(1).forEach((p, i) => {
    acc += lens[i]
    at.set(p.city.slug, round(easeTime(acc / total)))
  })

  const curve = (list: Seg[]) => list.map(([, c1, c2, p1]) => `C${fp(c1)} ${fp(c2)} ${fp(p1)}`).join(' ')
  const k = BULB_K
  // the cap under the bars (lib/bulb.ts BULB_CAP, scaled into user space)
  const cap = `M${f1(ox + 114 * k)} ${f1(oy + 382 * k)} H${f1(ox + 186 * k)} A${f1(36 * k)} ${f1(36 * k)} 0 0 1 ${f1(ox + 114 * k)} ${f1(oy + 382 * k)} Z`

  // the box the stage keeps in view: every town with its label, and the end bulb
  const xs = placed.map((p) => p.frac[0])
  const ys = placed.map((p) => p.frac[1])
  const bx1 = (ox + 280 * k) / VW
  const by1 = (oy + 430 * k) / VH
  const mcdowellY = relief.mountains.mcdowell[2]
  const box = {
    cx0: round(Math.min(...xs) - 0.03),
    cx1: round(Math.max(Math.max(...xs) + 0.02, bx1 + 0.012)),
    cy0: round(Math.min(Math.min(...ys) - 0.045, mcdowellY - 0.025)),
    cy1: round(Math.max(Math.max(...ys) + 0.03, by1 + 0.012)),
    yE: round(placed[placed.length - 1].frac[1]),
  }

  const pct = (n: number) => `${(n * 100).toFixed(2)}%`
  return {
    viewBox: `0 0 ${VW} ${VH}`,
    wire: `M${fp(all[0][0])} ${curve(all)}`,
    pins: placed.map(({city, frac}) => ({
      slug: city.slug,
      name: city.name,
      x: pct(frac[0]),
      y: pct(frac[1]),
      t: at.get(city.slug) ?? 0,
      sides: {d: LABEL_SIDES.d[city.slug] ?? 'r', t: LABEL_SIDES.t[city.slug] ?? 'r', m: LABEL_SIDES.m[city.slug] ?? 'r'},
    })),
    bulb: {
      glass: `M${fp(T(BULB_START))} ${curve(body)} Z`,
      bars: BULB_BARS.map(([x, y, w, h]) => ({x: f1(ox + x * k), y: f1(oy + y * k), width: f1(w * k), height: f1(h * k), rx: f1(10 * k)})),
      cap,
      cx: f1(ox + 150 * k),
      cy: f1(oy + 150 * k),
      haloR: f1(150 * k * 3.2),
    },
    ranges: RANGE_LABELS.flatMap((key) => {
      const m = relief.mountains[key]
      return m ? [{key, label: m[0], x: pct(m[1]), y: pct(m[2])}] : []
    }),
    stageStyle: [`--A:${relief.aspect}`, ...Object.entries(box).map(([key, v]) => `--${key}:${v}`)].join(';'),
  }
}

/** The relief renditions (public/img/relief). */
export const RELIEF = {
  widths: [1200, 1800, 2600],
  /** Intrinsic size of the 1800 w rendition (the <img> fallback). */
  width: 1800,
  height: Math.round(1800 / relief.aspect),
  src: (w: number, ext: 'avif' | 'webp') => `/img/relief/relief-${w}.${ext}`,
}
