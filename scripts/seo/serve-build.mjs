#!/usr/bin/env node
// Serves web/.vercel/output the way Vercel's router does (redirect routes,
// filesystem lookup with directory index, 404 fallback), so the SEO parity
// crawl can run against a local build before anything is deployed.
//
//   node scripts/seo/serve-build.mjs [--port 4321] [--dir web/.vercel/output]
//
// It's an approximation of the routes this project emits, not a full Build
// Output API implementation; always re-run the parity crawl on a real Vercel
// preview before launch.

import http from 'node:http'
import {readFile, stat} from 'node:fs/promises'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const port = Number(args.port ?? 4321)
const outDir = path.resolve(args.dir ?? 'web/.vercel/output')
const staticDir = path.join(outDir, 'static')
const config = JSON.parse(await readFile(path.join(outDir, 'config.json'), 'utf8'))

const TYPES = {'.html': 'text/html; charset=utf-8', '.xml': 'application/xml', '.txt': 'text/plain', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'}

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

async function send(res, file, status = 200, extraHeaders = {}) {
  const body = await readFile(file)
  res.writeHead(status, {'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', ...extraHeaders})
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
        if (file) return send(res, file, 200, headers)
        afterFilesystem = true
        continue
      }
      const match = new RegExp(route.src).exec(pathname)
      if (!match) continue
      const sub = (s) => s.replace(/\$(\d+)/g, (_, n) => match[Number(n)] ?? '')
      if (route.status >= 300 && route.status < 400 && route.headers?.Location) {
        res.writeHead(route.status, {location: sub(route.headers.Location)})
        return res.end()
      }
      if (route.continue) {
        Object.assign(headers, route.headers)
        continue
      }
      if (afterFilesystem && route.dest) {
        if (route.dest.startsWith('/')) {
          const file = await findFile(route.dest)
          if (file) return send(res, file, route.status ?? 200, headers)
        }
        res.writeHead(501, {'content-type': 'text/plain'})
        return res.end(`function route ${route.dest} is not emulated locally`)
      }
    }
    res.writeHead(404)
    res.end()
  })
  .listen(port, () => console.log(`Serving ${outDir} at http://localhost:${port}`))
