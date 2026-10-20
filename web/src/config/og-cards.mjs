// Draws every page's share card (og:image, 1200×630 JPEG) once the build is done. The pages
// leave a spec each while they prerender (src/lib/og-card.ts: headline, eyebrow, rating line
// and the photo panel already cut to its box); this draws them with satori (layout to SVG),
// resvg (SVG to pixels) and sharp (JPEG) into /og/… of the build output. The Vercel adapter
// copies them to .vercel/output/static afterwards, like build-info.json. A photo that can't be
// fetched gives that page the typographic card for this build (with a warning), not a failed build.
//
// The design follows the site: bone background, petrol type in Red Hat Display, a copper
// eyebrow, the logo, the rating and licence under a short copper rule, and the photo full
// height at the right. With no photo, the right panel is petrol with the copper bulb.
//
// Cards are cached by their spec in node_modules/.cache/og-cards/drawn, so a build only draws
// what changed. Bump CARD_VERSION when the design changes.
import {createHash} from 'node:crypto'
import {mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import satori from 'satori'
import {Resvg} from '@resvg/resvg-js'
import sharp from 'sharp'

const CARD_VERSION = 2
const W = 1200
const H = 630
const CACHE = join('node_modules', '.cache', 'og-cards')
const SPECS = join(CACHE, 'specs')
const DRAWN = join(CACHE, 'drawn')

const BONE = '#F7F3EC'
const INK = '#0F2A35'
const INK_SOFT = '#3E5560'
const COPPER = '#AA502E'
const COPPER_700 = '#8E4024'
const CREAM = '#FFF4EC'

/** A satori element (the React element shape, without React). */
function h(type, style, ...children) {
  const kids = children.flat().filter((c) => c !== undefined && c !== null && c !== false && c !== '')
  return {type, props: {style, children: kids.length > 1 ? kids : kids[0]}}
}
const img = (src, style) => ({type: 'img', props: {src, width: style.width, height: style.height, style}})

/** The headline size: as large as reads well, smaller for a long one, so it stays within four lines. */
function titleSize(title, column) {
  const n = title.length
  const base = n <= 28 ? 68 : n <= 44 ? 60 : n <= 62 ? 52 : n <= 80 ? 46 : 42
  return column < 600 ? Math.round(base * 0.84) : base
}

const star = (size) => ({
  type: 'svg',
  props: {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    children: [{type: 'path', props: {fill: COPPER, d: 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z'}}],
  },
})

/** The copper bulb of the favicon, in cream on copper, for the card with no photo. */
const bulb = (size) => ({
  type: 'svg',
  props: {
    width: size,
    height: size,
    viewBox: '0 0 512 512',
    children: [
      {type: 'circle', props: {cx: 256, cy: 256, r: 256, fill: COPPER}},
      {
        type: 'g',
        props: {
          transform: 'translate(128.5 62) scale(.85)',
          children: [
            {type: 'path', props: {fill: 'none', stroke: CREAM, 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M104 300 C104 262 36 232 36 152 C36 86 88 36 150 36 C212 36 264 86 264 150 C264 176 254 196 238 214 C222 232 196 232 192 214 C188 196 212 184 228 196 C244 208 222 234 210 250 C200 264 196 282 196 300'}},
            {type: 'rect', props: {x: 96, y: 318, width: 108, height: 20, rx: 10, fill: CREAM}},
            {type: 'rect', props: {x: 104, y: 350, width: 92, height: 20, rx: 10, fill: CREAM}},
            {type: 'path', props: {fill: CREAM, d: 'M114 382 H186 A36 36 0 0 1 114 382 Z'}},
          ],
        },
      },
    ],
  },
})

function card(spec, assets) {
  const panel = spec.photo ? spec.photo.width : 380
  const column = W - panel
  const size = titleSize(spec.title, column)
  const line = {display: 'flex', alignItems: 'center', fontFamily: 'Red Hat Text', fontWeight: 500, fontSize: 22, color: INK_SOFT}
  const text = h(
    'div',
    {display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: column, height: H, padding: '52px 56px 50px 64px', backgroundColor: BONE},
    img(assets.logo, {width: 116, height: 104, objectFit: 'contain', objectPosition: 'left'}),
    h(
      'div',
      {display: 'flex', flexDirection: 'column'},
      spec.eyebrow && h('div', {fontFamily: 'Red Hat Text', fontWeight: 700, fontSize: 21, letterSpacing: 2.5, textTransform: 'uppercase', color: COPPER_700, marginBottom: 18}, spec.eyebrow),
      h('div', {fontFamily: 'Red Hat Display', fontWeight: 800, fontSize: size, lineHeight: 1.06, letterSpacing: -0.8, color: INK, lineClamp: 4}, spec.title),
    ),
    h(
      'div',
      {display: 'flex', flexDirection: 'column'},
      h('div', {width: 56, height: 4, borderRadius: 2, backgroundColor: COPPER, marginBottom: 18}),
      // one line beside a narrow photo; in a narrow column (a wide group photo) the licence goes under the rating
      column >= 600
        ? h('div', line, spec.rating && star(24), spec.rating && h('div', {marginLeft: 8}, spec.rating), spec.rating && spec.licence && h('div', {margin: '0 12px'}, '·'), spec.licence && h('div', {}, spec.licence))
        : h('div', {display: 'flex', flexDirection: 'column'}, spec.rating && h('div', line, star(24), h('div', {marginLeft: 8}, spec.rating)), spec.licence && h('div', {...line, marginTop: 6, marginLeft: 32}, spec.licence)),
    ),
  )
  const right = spec.photo
    ? img(assets.photo, {width: panel, height: H, objectFit: 'cover'})
    : h('div', {display: 'flex', alignItems: 'center', justifyContent: 'center', width: panel, height: H, backgroundColor: INK}, bulb(200))
  return h('div', {display: 'flex', width: W, height: H, backgroundColor: BONE}, text, right)
}

async function dataUri(url) {
  const res = await fetch(url, {signal: AbortSignal.timeout(30_000)})
  if (!res.ok) throw new Error(`${res.status} for ${url}`)
  return `data:${res.headers.get('content-type') ?? 'image/jpeg'};base64,${Buffer.from(await res.arrayBuffer()).toString('base64')}`
}

/** Runs `fn` over `items`, `n` at a time. */
async function pool(items, n, fn) {
  const queue = [...items]
  await Promise.all(Array.from({length: n}, async () => {
    while (queue.length) await fn(queue.shift())
  }))
}

/** @returns {import('astro').AstroIntegration} */
export function ogCards() {
  return {
    name: 'og-cards',
    hooks: {
      // a page that no longer exists leaves no spec behind
      'astro:build:start': async () => {
        await rm(SPECS, {recursive: true, force: true})
      },
      'astro:build:done': async ({dir, logger}) => {
        const started = Date.now()
        const files = await readdir(SPECS).catch(() => [])
        if (!files.length) return logger.warn('no share cards to draw (no specs in node_modules/.cache/og-cards/specs)')
        const fontDir = new URL('../assets/fonts/og/', import.meta.url)
        const font = async (file, name, weight) => ({name, weight, style: 'normal', data: await readFile(new URL(file, fontDir))})
        const fonts = await Promise.all([font('redhat-display-800.ttf', 'Red Hat Display', 800), font('redhat-text-500.ttf', 'Red Hat Text', 500), font('redhat-text-700.ttf', 'Red Hat Text', 700)])
        const logo = `data:image/png;base64,${(await readFile(new URL('../../public/logo.png', import.meta.url))).toString('base64')}`
        await mkdir(DRAWN, {recursive: true})
        let drawn = 0
        let cached = 0
        await pool(files, 6, async (name) => {
          const spec = JSON.parse(await readFile(join(SPECS, name), 'utf8'))
          const key = createHash('sha256').update(JSON.stringify({CARD_VERSION, spec})).digest('hex').slice(0, 24)
          const cachedFile = join(DRAWN, `${key}.jpg`)
          let jpg = await readFile(cachedFile).catch(() => undefined)
          if (jpg) cached++
          else {
            const photo = spec.photo
              ? await dataUri(spec.photo.url).catch((error) => logger.warn(`${spec.path}: no photo for its share card (${error.message}); the typographic card instead`))
              : undefined
            const svg = await satori(card(photo ? spec : {...spec, photo: undefined}, {logo, photo}), {width: W, height: H, fonts})
            const png = new Resvg(svg, {fitTo: {mode: 'width', value: W}, font: {loadSystemFonts: false}}).render().asPng()
            jpg = await sharp(png).jpeg({quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4'}).toBuffer()
            // a stand-in is not cached, so the next build tries the photo again
            if (photo || !spec.photo) await writeFile(cachedFile, jpg)
            drawn++
          }
          const out = new URL(`.${spec.file}`, dir)
          await mkdir(new URL('.', out), {recursive: true})
          await writeFile(out, jpg)
        })
        logger.info(`${files.length} share cards in /og (${drawn} drawn, ${cached} from the cache) in ${((Date.now() - started) / 1000).toFixed(1)} s`)
      },
    },
  }
}
