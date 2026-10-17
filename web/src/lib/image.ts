// Image URLs. Every CMS image is served by Sanity's image CDN (sized, AVIF/WebP via
// auto=format, crop and hotspot honoured), whichever dataset the build reads:
//
// - Images whose asset is in the dataset (asset._id) use it directly.
// - Images the local dataset still stores as "image@<webflow url>" (not imported
//   yet there) are mapped to the Sanity asset the production import made from the
//   same file (data/legacy-images.json, from scripts/migrate/legacy-image-map.mjs).
//   An image with no such asset is treated as missing: nothing is ever loaded from
//   Webflow's CDN.
//
// Every URL carries a file name after the asset's (…/<id>-<w>x<h>.<ext>/<name>): the
// company photos' fixed names (lib/image-names.ts), else the image's own alt text. The
// name comes from the image, never from an alt passed for one use, so a preload and
// its <img> always ask for the same URL.
import {createImageUrlBuilder} from '@sanity/image-url'
import type {ImageRef} from './types'
import {sanityDataset, sanityProjectId} from './sanity'
import {IMAGE_NAMES} from './image-names'
import legacyImages from '../data/legacy-images.json'

/** The project whose CDN serves the images, also when the build reads the local dataset. */
export const IMAGE_PROJECT_ID = sanityProjectId || 'qhi2uf0l'

const builder = createImageUrlBuilder({projectId: IMAGE_PROJECT_ID, dataset: sanityDataset})

const LEGACY = legacyImages as Record<string, {asset: string; width: number; height: number}>

type Crop = NonNullable<ImageRef['crop']>

/** An image resolved to the Sanity asset that serves it. */
export interface ResolvedImage {
  ref: string
  width: number
  height: number
  crop?: Crop
  hotspot?: ImageRef['hotspot']
  /** The file name the CDN serves it under (no extension), when it has one. */
  name?: string
}

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

/** An image's alt text; Webflow's "inherit" placeholder (`__wf_reserved_inherit`) is no alt. */
export function imageAlt(image?: ImageRef | null) {
  const alt = image?.alt?.trim()
  return alt && !/^__wf_/.test(alt) ? alt : undefined
}

/** "Lamp posts lighting a brick front walk" → "lamp-posts-lighting-a-brick-front-walk" (ASCII, at most 8 words). */
function fileName(text: string) {
  const words = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return words.slice(0, 8).join('-') || undefined
}

const nameFor = (ref: string, image: ImageRef) => IMAGE_NAMES[ref] ?? fileName(imageAlt(image) ?? '')

export function resolveImage(image?: ImageRef | null): ResolvedImage | undefined {
  if (!image) return undefined
  const crop = image.crop ?? undefined
  const hotspot = image.hotspot ?? undefined
  const id = image.asset?._id
  if (id) {
    const size = image.asset?.metadata?.dimensions ?? sizeFromId(id)
    if (size) return {ref: id, width: size.width, height: size.height, crop, hotspot, name: nameFor(id, image)}
  }
  const legacy = image.legacyUrl?.replace(/^image@/, '')
  if (!legacy) return undefined
  const mapped = LEGACY[legacy]
  if (mapped) return {ref: mapped.asset, width: mapped.width, height: mapped.height, crop, hotspot, name: nameFor(mapped.asset, image)}
  if (!warned.has(legacy)) {
    warned.add(legacy)
    console.warn(`[image] no Sanity asset for ${legacy}; run scripts/migrate/legacy-image-map.mjs`)
  }
  return undefined
}

export function hasImage(image?: ImageRef | null): image is ImageRef {
  return Boolean(resolveImage(image))
}

/** The displayed size of the whole image (after the editor's crop), for width/height attributes. */
export function imageDimensions(image?: ImageRef | null) {
  const r = resolveImage(image)
  if (!r) return undefined
  const c = r.crop
  const width = Math.round(r.width * (1 - (c ? c.left + c.right : 0)))
  const height = Math.round(r.height * (1 - (c ? c.top + c.bottom : 0)))
  return {width, height}
}

function sanityUrl(r: ResolvedImage, opts: ImageUrlOptions) {
  let b = builder.image({asset: {_ref: r.ref}, crop: r.crop, hotspot: r.hotspot} as never).quality(opts.quality ?? 75)
  b = opts.format ? b.format(opts.format) : b.auto('format')
  if (opts.width) b = b.width(Math.round(opts.width))
  if (opts.width && opts.height) b = b.height(Math.round(opts.height)).fit('crop')
  if (r.name) b = b.vanityName(opts.format ? `${r.name}.${opts.format}` : r.name)
  return b.url()
}

/**
 * The editor's hotspot as a CSS object-position ("50% 34%"), relative to the
 * rendition (after the crop), for photos a frame crops with object-fit: cover.
 * Undefined when the image has no hotspot.
 */
export function imageFocus(image?: ImageRef | null) {
  const h = image?.hotspot
  if (!h) return undefined
  const c = image?.crop
  const along = (v: number, start = 0, end = 0) => Math.min(100, Math.max(0, ((v - start) / (1 - start - end)) * 100))
  const pct = (n: number) => `${Math.round(n * 10) / 10}%`
  return `${pct(along(h.x, c?.left, c?.right))} ${pct(along(h.y, c?.top, c?.bottom))}`
}

/** URL for one rendition. */
export function imageUrl(image: ImageRef | null | undefined, opts: ImageUrlOptions = {}) {
  const r = resolveImage(image)
  return r ? sanityUrl(r, opts) : ''
}

/**
 * srcset over `widths`, capped at the image's own width (no upscaled copies). With
 * `aspect` (width / height) every rendition is cropped to that ratio. Undefined when
 * the image can't be served.
 */
export function imageSrcSet(image: ImageRef | null | undefined, widths: number[], aspect?: number) {
  const r = resolveImage(image)
  if (!r) return undefined
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
