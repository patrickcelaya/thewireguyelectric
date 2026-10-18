#!/usr/bin/env node
// SEO crawler: records every on-page SEO signal for a site so a migration can be
// checked against it. Run against the live Webflow site to produce the baseline,
// then against a Vercel preview to produce a candidate for scripts/seo/parity.mjs.
//
//   node scripts/seo/crawl.mjs --base https://www.thewireguyelectric.com --out migration/seo-baseline.json
//   node scripts/seo/crawl.mjs --base https://<preview>.vercel.app --paths-from migration/seo-baseline.json --out migration/seo-candidate.json
//
// URLs come from <base>/sitemap.xml, from --paths-from (a previous crawl), from
// --extra paths, and from internal links discovered while crawling.

import { writeFile, readFile } from 'node:fs/promises';
import * as cheerio from 'cheerio';

const args = parseArgs(process.argv.slice(2));
const base = new URL(args.base ?? 'https://www.thewireguyelectric.com');
const out = args.out ?? 'migration/seo-crawl.json';
const concurrency = Number(args.concurrency ?? 4);
const maxPages = Number(args.max ?? 2000);
const userAgent = 'WireGuySEOParity/1.0 (+migration audit)';
// Protected Vercel deployments: pass the project's "Protection Bypass for
// Automation" secret via VERCEL_AUTOMATION_BYPASS_SECRET.
const requestHeaders = {
  'user-agent': userAgent,
  ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? {'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET} : {}),
};

// Pages that exist on the current site but aren't in its sitemap, plus legacy and
// junk URLs whose status we want on record.
const DEFAULT_EXTRA = [
  '/sister-companies',
  '/posts-categories/commercial',
  '/posts-categories/industrial',
  '/posts-categories/lighting',
  '/services-categories/commercial',
  '/services-categories/residential',
  '/templates/style-guide',
  '/templates/coming-soon',
  '/401',
  '/this-page-should-404',
];

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

// Treat www and apex as the same site so links to either are followed.
function sameSite(u) {
  const strip = (h) => h.replace(/^www\./, '');
  return strip(u.hostname) === strip(base.hostname) ||
    (args['link-host'] && strip(u.hostname) === strip(args['link-host']));
}

function normalizePath(href, from) {
  try {
    const u = new URL(href, from);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!sameSite(u) && !u.hostname.endsWith('thewireguyelectric.com')) return null;
    return u.pathname;
  } catch {
    return null;
  }
}

async function fetchSitemapPaths() {
  try {
    const res = await fetch(new URL('/sitemap.xml', base), { headers: requestHeaders });
    if (!res.ok) return [];
    const xml = await res.text();
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
    const paths = [];
    for (const loc of locs) {
      if (loc.endsWith('.xml')) {
        // Sitemap index: pull child sitemaps too.
        const child = await fetch(new URL(new URL(loc).pathname, base), { headers: requestHeaders });
        if (child.ok) {
          const cxml = await child.text();
          for (const m of cxml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) paths.push(new URL(m[1]).pathname);
        }
      } else {
        paths.push(new URL(loc).pathname);
      }
    }
    return paths;
  } catch (err) {
    console.warn(`sitemap fetch failed: ${err.message}`);
    return [];
  }
}

/** Off the site: neither the crawled host (www or apex) nor one of the business's own hosts (as normalizePath). */
const offSite = (u) => !sameSite(u) && !u.hostname.endsWith('thewireguyelectric.com');

async function fetchWithChain(path) {
  const chain = [];
  let url = new URL(path, base);
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, { redirect: 'manual', headers: requestHeaders });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = new URL(res.headers.get('location'), url);
      chain.push({ status: res.status, from: url.href, to: next.href });
      await res.arrayBuffer().catch(() => {});
      // a redirect off the site (the /review short link to Google's review form) ends here: the crawl
      // records where it goes and never fetches someone else's pages (or Google's sign-in page) as ours
      if (offSite(next)) return { res: null, finalUrl: next.href, chain, external: true, status: res.status };
      url = next;
      continue;
    }
    return { res, finalUrl: url.href, chain };
  }
  return { res: null, finalUrl: url.href, chain, error: 'too many redirects' };
}

function text($el) {
  return $el.text().replace(/\s+/g, ' ').trim();
}

function extract(html, pageUrl) {
  const $ = cheerio.load(html);
  const meta = (sel) => $(sel).attr('content')?.trim() ?? null;

  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      jsonLd.push(JSON.parse(raw));
    } catch {
      jsonLd.push({ _parseError: true, raw: raw.slice(0, 500) });
    }
  });
  const ldTypes = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const t = node['@type'];
    if (t) (Array.isArray(t) ? t : [t]).forEach((x) => ldTypes.add(x));
    Object.values(node).forEach(walk);
  };
  jsonLd.forEach(walk);

  const internalLinks = new Set();
  const externalLinks = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const p = normalizePath(href, pageUrl);
    if (p) internalLinks.add(p);
    else {
      try {
        const u = new URL(href, pageUrl);
        if (/^https?:$/.test(u.protocol)) externalLinks.add(u.href);
      } catch {}
    }
  });

  const images = [];
  $('img').each((_, el) => {
    const $el = $(el);
    images.push({
      src: $el.attr('src') ?? null,
      alt: $el.attr('alt') ?? null,
      width: $el.attr('width') ?? null,
      height: $el.attr('height') ?? null,
      loading: $el.attr('loading') ?? null,
    });
  });

  const telLinks = new Set();
  $('a[href^="tel:"]').each((_, el) => telLinks.add($(el).attr('href')));

  // Word count of visible body copy, ignoring nav/footer/scripts.
  const $body = $('body').clone();
  $body.find('script, style, noscript, nav, footer, header, svg').remove();
  const bodyText = text($body);

  return {
    lang: $('html').attr('lang') ?? null,
    title: text($('head > title').first()) || null,
    metaDescription: meta('meta[name="description"]'),
    metaRobots: meta('meta[name="robots"]'),
    canonical: $('link[rel="canonical"]').attr('href') ?? null,
    hreflang: $('link[rel="alternate"][hreflang]').map((_, el) => ({ lang: $(el).attr('hreflang'), href: $(el).attr('href') })).get(),
    og: {
      title: meta('meta[property="og:title"]'),
      description: meta('meta[property="og:description"]'),
      image: meta('meta[property="og:image"]'),
      type: meta('meta[property="og:type"]'),
      url: meta('meta[property="og:url"]'),
    },
    twitter: {
      card: meta('meta[name="twitter:card"]'),
      title: meta('meta[name="twitter:title"]'),
      description: meta('meta[name="twitter:description"]'),
      image: meta('meta[name="twitter:image"]'),
    },
    googleSiteVerification: meta('meta[name="google-site-verification"]'),
    h1: $('h1').map((_, el) => text($(el))).get(),
    h2: $('h2').map((_, el) => text($(el))).get(),
    h3: $('h3').map((_, el) => text($(el))).get(),
    wordCount: bodyText ? bodyText.split(' ').length : 0,
    jsonLdTypes: [...ldTypes].sort(),
    jsonLd,
    internalLinks: [...internalLinks].sort(),
    externalLinks: [...externalLinks].sort(),
    telLinks: [...telLinks],
    images,
    imagesMissingAlt: images.filter((i) => !i.alt).length,
    forms: $('form').map((_, el) => ({ action: $(el).attr('action') ?? null, name: $(el).attr('name') ?? $(el).attr('data-name') ?? null })).get(),
  };
}

async function crawlOne(path) {
  const started = Date.now();
  try {
    const { res, finalUrl, chain, error, external, status } = await fetchWithChain(path);
    if (external) return { path, status, finalUrl, redirectChain: chain, external: true, ms: Date.now() - started };
    if (!res) return { path, error, redirectChain: chain };
    const contentType = res.headers.get('content-type') ?? '';
    const record = {
      path,
      status: res.status,
      finalUrl,
      redirectChain: chain,
      contentType,
      xRobotsTag: res.headers.get('x-robots-tag'),
      ms: Date.now() - started,
    };
    if (contentType.includes('text/html')) {
      const html = await res.text();
      record.bytes = html.length;
      Object.assign(record, extract(html, finalUrl));
    } else {
      await res.arrayBuffer().catch(() => {});
    }
    return record;
  } catch (err) {
    return { path, error: err.message };
  }
}

async function main() {
  const seeds = new Set();
  for (const p of await fetchSitemapPaths()) seeds.add(p);
  const sitemapPaths = new Set(seeds);
  if (args['paths-from']) {
    const prev = JSON.parse(await readFile(args['paths-from'], 'utf8'));
    for (const p of Object.keys(prev.pages)) seeds.add(p);
  }
  for (const p of DEFAULT_EXTRA) seeds.add(p);
  // Every URL Search Console has seen (including typo URLs from external links).
  try {
    const tsv = await readFile('migration/seo-equity/gsc-pages-16mo.tsv', 'utf8');
    for (const line of tsv.split('\n').slice(1)) {
      const path = line.split('\t')[0];
      if (path?.startsWith('/') && !path.includes('?')) seeds.add(path);
    }
  } catch {}
  if (typeof args.extra === 'string') for (const p of args.extra.split(',')) seeds.add(p.trim());

  const queue = [...seeds];
  const seen = new Set(queue);
  const pages = {};
  let active = 0;

  await new Promise((resolve) => {
    const pump = () => {
      if (queue.length === 0 && active === 0) return resolve();
      while (active < concurrency && queue.length && Object.keys(pages).length + active < maxPages) {
        const path = queue.shift();
        active++;
        crawlOne(path).then((rec) => {
          rec.inSitemap = sitemapPaths.has(path);
          pages[path] = rec;
          // Follow internal links only from pages that resolved on this site.
          if (!args['no-discover'] && rec.status === 200 && rec.internalLinks) {
            for (const link of rec.internalLinks) {
              if (!seen.has(link) && !/\.(png|jpe?g|webp|avif|svg|gif|pdf|xml|ico|css|js)$/i.test(link)) {
                seen.add(link);
                queue.push(link);
              }
            }
          }
          active--;
          process.stdout.write(`\r${Object.keys(pages).length} crawled, ${queue.length} queued   `);
          pump();
        });
      }
      if (queue.length === 0 && active === 0) resolve();
    };
    pump();
  });

  const sorted = Object.fromEntries(Object.entries(pages).sort(([a], [b]) => a.localeCompare(b)));
  const summary = {
    total: Object.keys(sorted).length,
    byStatus: Object.values(sorted).reduce((acc, p) => ((acc[p.status ?? 'error'] = (acc[p.status ?? 'error'] ?? 0) + 1), acc), {}),
    inSitemap: sitemapPaths.size,
    discoveredNotInSitemap: Object.values(sorted).filter((p) => !p.inSitemap && p.status === 200).map((p) => p.path),
    missingCanonical: Object.values(sorted).filter((p) => p.status === 200 && !p.canonical).length,
    missingDescription: Object.values(sorted).filter((p) => p.status === 200 && !p.metaDescription).map((p) => p.path),
    multipleOrMissingH1: Object.values(sorted).filter((p) => p.status === 200 && p.h1?.length !== 1).map((p) => ({ path: p.path, h1: p.h1 })),
    duplicateTitles: Object.entries(
      Object.values(sorted).filter((p) => p.status === 200 && p.title).reduce((acc, p) => ((acc[p.title] ??= []).push(p.path), acc), {}),
    ).filter(([, v]) => v.length > 1),
  };

  await writeFile(out, JSON.stringify({ crawledAt: new Date().toISOString(), base: base.href, summary, pages: sorted }, null, 2));
  console.log(`\nwrote ${out}`);
  console.log(JSON.stringify(summary.byStatus));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
