// The share cards in the built site (src/config/og-cards.mjs, src/lib/og-card.ts): every page's og:image
// and twitter:image is its own card under /og, a 1200×630 JPEG in the build, and in a card made from a
// photo of people every head lies inside the photo panel. Reads the last build (PUBLIC_SANITY_PROJECT_ID=
// pnpm --filter web build) and the card specs it left; skipped when there is none.
import assert from 'node:assert/strict'
import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {join, relative, sep} from 'node:path'
import {fileURLToPath} from 'node:url'
import {test} from 'node:test'
import sharp from 'sharp'

const root = fileURLToPath(new URL('../.vercel/output/static/', import.meta.url))
const specsDir = fileURLToPath(new URL('../node_modules/.cache/og-cards/specs/', import.meta.url))
const built = existsSync(join(root, 'og', 'index.jpg')) && existsSync(specsDir)
const SITE = 'https://www.thewireguyelectric.com'

const htmlFiles = (d) => readdirSync(d, {withFileTypes: true}).flatMap((e) => (e.isDirectory() ? htmlFiles(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : []))
const pagePath = (file) => {
  const rel = relative(root, file).split(sep).join('/')
  return rel === 'index.html' ? '/' : `/${rel.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`
}
const meta = (html, attr, name) => new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`).exec(html)?.[1]

test('the share cards', {skip: !built && 'no build with share cards in web/.vercel/output'}, async (t) => {
  const pages = htmlFiles(root).map((f) => ({path: pagePath(f), html: readFileSync(f, 'utf8')}))
  const specs = readdirSync(specsDir).map((f) => JSON.parse(readFileSync(join(specsDir, f), 'utf8')))

  await t.test("every page's og:image and twitter:image is its own card", () => {
    const wrong = pages.filter(({path, html}) => {
      const og = meta(html, 'property', 'og:image')
      const file = `/og${path === '/' ? '/index' : path}.jpg`
      return og !== `${SITE}${file}` || meta(html, 'name', 'twitter:image') !== og || !existsSync(join(root, file))
    })
    assert.deepEqual(wrong.map((p) => p.path), [])
  })

  await t.test('every card is a 1200×630 JPEG', async () => {
    const wrong = []
    for (const spec of specs) {
      const m = await sharp(join(root, spec.file)).metadata()
      if (m.format !== 'jpeg' || m.width !== 1200 || m.height !== 630) wrong.push(`${spec.file}: ${m.format} ${m.width}×${m.height}`)
    }
    assert.deepEqual(wrong, [])
  })

  await t.test("every head in a card's photo lies inside the photo panel", () => {
    const library = JSON.parse(readFileSync(new URL('../src/lib/library-photos.json', import.meta.url), 'utf8'))
    const brand = readFileSync(new URL('../src/lib/brand-photos.ts', import.meta.url), 'utf8')
    const facesOf = (ref) => library.find((p) => p.id === ref)?.faces ?? new RegExp(`'${ref}': '([^']+)'`).exec(brand)?.[1]
    const wrong = []
    let people = 0
    for (const spec of specs.filter((s) => s.photo && facesOf(s.photo.ref))) {
      people++
      const [w, h] = spec.photo.ref.match(/-(\d+)x(\d+)-/).slice(1).map(Number)
      const [rx, ry, rw] = new URL(spec.photo.url).searchParams.get('rect').split(',').map(Number)
      const k = spec.photo.width / rw
      const out = facesOf(spec.photo.ref)
        .split(';')
        .map((b) => b.split(',').map(Number))
        .filter(([x0, y0, x1, y1]) => (x0 * w - rx) * k < 0 || (y0 * h - ry) * k < 0 || (x1 * w - rx) * k > spec.photo.width || (y1 * h - ry) * k > 630)
      if (out.length) wrong.push(spec.path)
    }
    assert.ok(people > 0, 'some cards are made from photos of people')
    assert.deepEqual(wrong, [])
  })
})
