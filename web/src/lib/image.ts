import {createImageUrlBuilder} from '@sanity/image-url'
import type {ImageRef} from './types'
import {sanityDataset, sanityProjectId} from './sanity'

const builder = sanityProjectId ? createImageUrlBuilder({projectId: sanityProjectId, dataset: sanityDataset}) : null

/** Pre-import images are stored as "image@<url>"; return the bare URL. */
function legacySrc(image: ImageRef) {
  return image.legacyUrl?.replace(/^image@/, '')
}

export function hasImage(image?: ImageRef | null): image is ImageRef {
  return Boolean(image && (image.asset?.url || image.legacyUrl))
}

export function imageDimensions(image: ImageRef) {
  return image.asset?.metadata?.dimensions
}

/** URL for one rendition. Sanity's CDN negotiates AVIF/WebP via auto=format. */
export function imageUrl(image: ImageRef, opts: {width?: number; height?: number; format?: 'jpg'} = {}) {
  if (builder && image.asset?._id) {
    let b = builder.image(image as never).quality(75)
    b = opts.format ? b.format(opts.format) : b.auto('format')
    if (opts.width) b = b.width(opts.width)
    if (opts.height) b = b.height(opts.height).fit('crop')
    return b.url()
  }
  return image.asset?.url ?? legacySrc(image) ?? ''
}

/** srcset for responsive images; empty for legacy images that can't be resized. */
export function imageSrcSet(image: ImageRef, widths: number[], aspect?: number) {
  if (!builder || !image.asset?._id) return undefined
  return widths
    .map((w) => `${imageUrl(image, {width: w, height: aspect ? Math.round(w / aspect) : undefined})} ${w}w`)
    .join(', ')
}

/** 1200×630 social image. */
export function ogImageUrl(image?: ImageRef | null) {
  if (!hasImage(image)) return undefined
  return imageUrl(image, {width: 1200, height: 630, format: 'jpg'})
}
