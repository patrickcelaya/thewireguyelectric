#!/usr/bin/env node
// Serves web/.vercel/output the way Vercel's router does (redirect routes,
// filesystem lookup with directory index, 404 fallback), so the SEO parity
// crawl can run against a local build before anything is deployed. Text responses
// are compressed (brotli, else gzip) and hashed assets cached as Vercel does, so
// local Lighthouse runs measure what visitors will get. Routes with `has`/`missing`
// host conditions are matched as if every request came to the production host (www),
// so the crawl sees what www serves (no noindex header, which the other hosts get);
// pass --host to answer as another host.
//
//   node scripts/seo/serve-build.mjs [--port 4321] [--dir web/.vercel/output] [--host www.thewireguyelectric.com]
//
// It's an approximation of the routes this project emits, not a full Build
// Output API implementation; always re-run the parity crawl on a real Vercel
// preview before launch.

import http from 'node:http'
import {readFile, stat} from 'node:fs/promises'
import path from 'node:path'
import zlib from 'node:zlib'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const port = Number(args.port ?? 4321)
const host = args.host ?? 'www.thewireguyelectric.com'
const outDir = path.resolve(args.dir ?? 'web/.vercel/output')
const staticDir = path.join(outDir, 'static')
const config = JSON.parse(await readFile(path.join(outDir, 'config.json'), 'utf8'))

const TYPES = {'.html': 'text/html; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon'}

async function findFile(pathname) {
  const clean = decodeURIComponent(pathname)
  for (const candidate of [clean, path.join(clean, 'index.html'), `${clean}.html`]) {
    const full = path.join(staticDir, candidate)
    if (!full.startsWith(staticDir)) return null
    try {
      if ((await stat(full)).isFile()) return full
    } catch {}
  }
  return null
}

/** Whether a route's `has`/`missing` conditions hold for this request (host conditions against `host`; other types are not emulated and fail). */
function conditionsHold(route, req) {
  const matches = (c) => {
    if (c.type !== 'host') return false
    const v = c.value
    if (v === undefined) return true
    if (typeof v === 'string') return new RegExp(`^(?:${v})$`, 'i').test(host)
    return (v.eq === undefined || v.eq === host) && (v.pre === undefined || host.startsWith(v.pre)) && (v.suf === undefined || host.endsWith(v.suf)) && (v.re === undefined || new RegExp(v.re).test(host))
  }
  return (route.has ?? []).every(matches) && !(route.missing ?? []).some(matches)
}

const COMPRESSIBLE = /^(text\/|application\/(xml|json)|image\/svg)/
const compressed = new Map()

/** The file's bytes in the best encoding the client accepts (compressed once per version of the file, then cached). */
function encode(file, version, body, type, accept = '') {
  if (!COMPRESSIBLE.test(type)) return {body}
  const encoding = /\bbr\b/.test(accept) ? 'br' : /\bgzip\b/.test(accept) ? 'gzip' : undefined
  if (!encoding) return {body}
  const key = `${encoding}:${file}:${version}`
  if (!compressed.has(key)) {
    compressed.set(key, encoding === 'br' ? zlib.brotliCompressSync(body, {params: {[zlib.constants.BROTLI_PARAM_QUALITY]: 11}}) : zlib.gzipSync(body, {level: 9}))
  }
  return {body: compressed.get(key), encoding}
}

async function send(req, res, file, status = 200, extraHeaders = {}) {
  const type = TYPES[path.extname(file)] ?? 'application/octet-stream'
  const {mtimeMs, size} = await stat(file)
  const {body, encoding} = encode(file, `${mtimeMs}:${size}`, await readFile(file), type, req.headers['accept-encoding'])
  res.writeHead(status, {'content-type': type, ...(encoding ? {'content-encoding': encoding, vary: 'accept-encoding'} : {}), ...extraHeaders})
  res.end(body)
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`)
    const pathname = url.pathname
    const headers = {}
    let afterFilesystem = false
    for (const route of config.routes) {
      if (route.handle === 'filesystem') {
        const file = await findFile(pathname)
        if (file) return send(req, res, file, 200, headers)
        afterFilesystem = true
        continue
      }
      const match = new RegExp(route.src).exec(pathname)
      if (!match || !conditionsHold(route, req)) continue
      const sub = (s) => s.replace(/\$(\d+)/g, (_, n) => match[Number(n)] ?? '')
      if (route.status >= 300 && route.status < 400 && route.headers?.Location) {
        res.writeHead(route.status, {...headers, location: sub(route.headers.Location)})
        return res.end()
      }
      if (route.continue) {
        Object.assign(headers, route.headers)
        continue
      }
      if (afterFilesystem && route.dest) {
        if (route.dest.startsWith('/')) {
          const file = await findFile(route.dest)
          if (file) return send(req, res, file, route.status ?? 200, headers)
        }
        res.writeHead(501, {'content-type': 'text/plain'})
        return res.end(`function route ${route.dest} is not emulated locally`)
      }
    }
    res.writeHead(404, headers)
    res.end()
  })
  .listen(port, () => console.log(`Serving ${outDir} at http://localhost:${port} as ${host}`))
