// Image URLs. Every CMS image is served by Sanity's image CDN (sized, AVIF/WebP via
// auto=format, crop and hotspot honoured), whichever dataset the build reads:
//
// - Images whose asset is in the dataset (asset._id) use it directly.
// - Images the local dataset still stores as "image@<webflow url>" (not imported
//   yet there) are mapped to the Sanity asset the production import made from the
//   same file (data/legacy-images.json, from scripts/migrate/legacy-image-map.mjs),
//   or, failing that, to the local mirror of Webflow's files under /wf/a
//   (data/webflow-mirror.json). An image with neither is treated as missing:
//   nothing is ever loaded from Webflow's CDN.
import {createImageUrlBuilder} from '@sanity/image-url'
import type {ImageRef} from './types'
import {sanityDataset, sanityProjectId} from './sanity'
import legacyImages from '../data/legacy-images.json'
import webflowMirror from '../data/webflow-mirror.json'

/** The project whose CDN serves the images, also when the build reads the local dataset. */
export const IMAGE_PROJECT_ID = sanityProjectId || 'qhi2uf0l'

const builder = createImageUrlBuilder({projectId: IMAGE_PROJECT_ID, dataset: sanityDataset})

const LEGACY = legacyImages as Record<string, {asset: string; width: number; height: number}>
const MIRROR = webflowMirror as Record<string, string>

type Crop = NonNullable<ImageRef['crop']>

/** An image resolved to something we can serve. */
export type ResolvedImage =
  | {kind: 'sanity'; ref: string; width: number; height: number; crop?: Crop; hotspot?: ImageRef['hotspot']}
  | {kind: 'static'; src: string}

export interface ImageUrlOptions {
  width?: number
  /** With a width: crop to this exact box (the hotspot decides what stays). */
  height?: number
  format?: 'jpg' | 'png' | 'webp'
  quality?: number
}

/** Sanity asset ids carry the original size: image-<hash>-<w>x<h>-<ext>. */
function sizeFromId(id: string) {
  const m = id.match(/-(\d+)x(\d+)-[a-z0-9]+$/)
  return m ? {width: Number(m[1]), height: Number(m[2])} : undefined
}

const warned = new Set<string>()

export function resolveImage(image?: ImageRef | null): ResolvedImage | undefined {
  if (!image) return undefined
  const crop = image.crop ?? undefined
  const hotspot = image.hotspot ?? undefined
  const id = image.asset?._id
  if (id) {
    const size = image.asset?.metadata?.dimensions ?? sizeFromId(id)
    if (size) return {kind: 'sanity', ref: id, width: size.width, height: size.height, crop, hotspot}
  }
  const legacy = image.legacyUrl?.replace(/^image@/, '')
  if (!legacy) return undefined
  const mapped = LEGACY[legacy]
  if (mapped) return {kind: 'sanity', ref: mapped.asset, width: mapped.width, height: mapped.height, crop, hotspot}
  if (MIRROR[legacy]) return {kind: 'static', src: MIRROR[legacy]}
  if (!warned.has(legacy)) {
    warned.add(legacy)
    console.warn(`[image] no Sanity asset or local copy for ${legacy}; run scripts/migrate/legacy-image-map.mjs`)
  }
  return undefined
}

export function hasImage(image?: ImageRef | null): image is ImageRef {
  return Boolean(resolveImage(image))
}

/** The displayed size of the whole image (after the editor's crop), for width/height attributes. */
export function imageDimensions(image?: ImageRef | null) {
  const r = resolveImage(image)
  if (r?.kind !== 'sanity') return undefined
  const c = r.crop
  const width = Math.round(r.width * (1 - (c ? c.left + c.right : 0)))
  const height = Math.round(r.height * (1 - (c ? c.top + c.bottom : 0)))
  return {width, height}
}

function sanityUrl(r: Extract<ResolvedImage, {kind: 'sanity'}>, opts: ImageUrlOptions) {
  let b = builder.image({asset: {_ref: r.ref}, crop: r.crop, hotspot: r.hotspot} as never).quality(opts.quality ?? 75)
  b = opts.format ? b.format(opts.format) : b.auto('format')
  if (opts.width) b = b.width(Math.round(opts.width))
  if (opts.width && opts.height) b = b.height(Math.round(opts.height)).fit('crop')
  return b.url()
}

/** URL for one rendition. */
export function imageUrl(image: ImageRef | null | undefined, opts: ImageUrlOptions = {}) {
  const r = resolveImage(image)
  if (!r) return ''
  return r.kind === 'sanity' ? sanityUrl(r, opts) : r.src
}

/**
 * srcset over `widths`, capped at the image's own width (no upscaled copies). With
 * `aspect` (width / height) every rendition is cropped to that ratio. Undefined for
 * images that can't be resized (the local mirror).
 */
export function imageSrcSet(image: ImageRef | null | undefined, widths: number[], aspect?: number) {
  const r = resolveImage(image)
  if (r?.kind !== 'sanity') return undefined
  const own = imageDimensions(image)?.width ?? r.width
  const usable = [...new Set(widths.map((w) => Math.min(w, own)))].sort((a, b) => a - b)
  return usable.map((w) => `${sanityUrl(r, {width: w, height: aspect ? w / aspect : undefined})} ${w}w`).join(', ')
}

/**
 * Attributes for <link rel="preload" as="image"> of the page's LCP image, matching
 * the <img> SanityImage renders with the same widths, sizes and aspect.
 */
export function imagePreload(image: ImageRef | null | undefined, widths: number[], sizes: string, aspect?: number) {
  const srcset = imageSrcSet(image, widths, aspect)
  if (!srcset) return undefined
  return {imagesrcset: srcset, imagesizes: sizes}
}

/** 1200×630 social image. */
export function ogImageUrl(image?: ImageRef | null) {
  if (!hasImage(image)) return undefined
  return imageUrl(image, {width: 1200, height: 630, format: 'jpg'})
}
