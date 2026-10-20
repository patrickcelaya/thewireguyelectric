// Every HTML page leaves the build with a line break after each block-level closing
// tag. Astro drops whitespace that contains a newline, so <li>…</li><li>… arrives
// glued; browsers lay blocks out apart, but text extractors (the SEO crawl, AI and
// search crawlers reading .text()) would read "Read moreEV Chargers". Script, style,
// textarea and pre contents are left untouched. Prerendered pages pay this once, at
// build time; server responses that aren't HTML pass straight through.
import {defineMiddleware} from 'astro:middleware'

const BLOCK_END =
  /(<\/(?:address|article|aside|blockquote|button|dd|details|div|dl|dt|figcaption|figure|footer|form|h[1-6]|header|label|li|main|nav|ol|p|section|summary|table|td|th|tr|ul)>)(?=<)/g
const VERBATIM = /(<(script|style|textarea|pre)\b[\s\S]*?<\/\2>)/

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()
  if (!response.headers.get('content-type')?.startsWith('text/html')) return response
  const parts = (await response.text()).split(VERBATIM)
  // split() with two capture groups yields [text, verbatim block, tag name, text, …]
  const html = parts.map((part, i) => (i % 3 === 0 ? part.replace(BLOCK_END, '$1\n') : i % 3 === 1 ? part : '')).join('')
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(html, {status: response.status, statusText: response.statusText, headers})
})
