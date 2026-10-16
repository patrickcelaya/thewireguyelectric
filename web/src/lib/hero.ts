// The homepage hero photo's renditions. The <picture> (components/sections/HeroHome.astro)
// and the LCP preloads in the page's <head> (pages/index.astro) are built from the
// same list, so the browser fetches exactly one file, early.
import type {ImageRef} from './types'
import {imageSrcSet} from './image'

/**
 * Phones and portrait tablets show the crew at 136% of the width (sides trimmed,
 * every face in frame); wider screens at 100–112% (styles/home.css, "HERO").
 */
export const HERO_SOURCES = [
  {media: '(max-width:899px)', widths: [640, 828, 1080], sizes: '136vw'},
  {media: '(min-width:900px)', widths: [1080, 1280, 1600, 2048, 2542], sizes: '(min-width:1460px) 100vw, 112vw'},
] as const

/** <link rel="preload" as="image"> attributes for each source (none when the image can't be resized). */
export function heroPreloads(image: ImageRef | null | undefined) {
  return HERO_SOURCES.flatMap(({media, widths, sizes}) => {
    const imagesrcset = imageSrcSet(image, [...widths])
    return imagesrcset ? [{media, imagesrcset, imagesizes: sizes}] : []
  })
}
