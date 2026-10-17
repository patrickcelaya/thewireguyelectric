// The homepage hero photo's renditions. The <picture> (components/sections/HeroHome.astro)
// and the LCP preloads in the page's <head> (pages/index.astro) are built from the
// same list, so the browser fetches exactly one file, early.
import type {ImageRef, PageSection} from './types'
import {imageDimensions, imagePreload, imageSrcSet} from './image'
import {facesOf} from './brand-photos'
import {facesFocus} from './cms'

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

/**
 * The inner hero's photo (components/sections/HeroInner.astro): a portrait photo stands
 * in a narrower column than a landscape one (`tall`); a landscape photo whose people
 * stand low under a big sky (the fleet) runs edge to edge below the words up to
 * 1,179 px (`low`, styles/pages.css). The <img> and the page's preload
 * (components/PageBuilderPage.astro) use the same renditions.
 */
export function innerHeroImage(image: ImageRef | null | undefined) {
  const size = imageDimensions(image)
  const tall = Boolean(size && size.height > size.width * 1.1)
  // the faces' vertical centre, in % of the photo's height ("50% 74.8%" → 74.8)
  const focusY = parseFloat(facesFocus(facesOf(image))?.split(' ')[1] ?? '0')
  const low = !tall && focusY > 60
  const band = low ? 1179 : 899
  return {tall, low, widths: [640, 828, 1086, 1280], sizes: `(max-width:${band}px) 100vw, ${tall ? '34vw' : '52vw'}`}
}

/** The preload for a page-builder page's LCP image: its hero's photo (none without one). */
export function innerHeroPreload(sections: PageSection[] | null | undefined) {
  const hero = sections?.find((s) => s._type === 'heroSection')
  const image = hero && 'image' in hero ? hero.image : undefined
  if (!image) return undefined
  const {widths, sizes} = innerHeroImage(image)
  return imagePreload(image, widths, sizes)
}
