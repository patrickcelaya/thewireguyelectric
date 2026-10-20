// The service-area cities as one ordered list: Mesa (the homepage, from Site
// settings → Home city) and every location document. The header, the footer and
// the valley map all use this list, so a city added in Sanity shows up everywhere.
import type {HomeCity, LocationSummary} from './types'

export interface City {
  /** "mesa" for the home city, else the location slug. */
  slug: string
  /** Bare city name ("Gilbert"). */
  name: string
  /** "/" for Mesa, "/locations/<slug>" otherwise. */
  href: string
  /** One line of neighborhoods: the card blurb, else the neighborhood list. */
  detail?: string
  geo?: {lat: number; lng: number}
}

export const HOME_CITY_SLUG = 'mesa'

/**
 * The order cities are listed in everywhere: the route the valley map's wire takes
 * from Mesa (see lib/valley.ts), so the menus, the footer and the map's index read
 * the same. Cities not listed here follow, alphabetically.
 */
export const CITY_ORDER = ['mesa', 'gilbert', 'chandler', 'ahwatukee', 'tempe', 'phoenix', 'scottsdale', 'fountain-hills', 'apache-junction', 'queen-creek', 'san-tan-valley']

/** "A, B, and C" (no trailing punctuation). */
function listOf(names: string[]) {
  if (names.length < 3) return names.join(' and ')
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

function detailOf(blurb?: string | null, neighborhoods?: string[] | null) {
  const text = blurb?.trim() || (neighborhoods?.length ? listOf(neighborhoods) : '')
  return text.replace(/[.,;\s]+$/, '') || undefined
}

type LocationLike = Pick<LocationSummary, 'slug' | 'shortName' | 'name' | 'cardBlurb' | 'neighborhoods'> & {geo?: {lat: number; lng: number} | null}

export function serviceAreaCities(homeCity: HomeCity | null | undefined, locations: LocationLike[]): City[] {
  const cities: City[] = locations
    .filter((l) => l.slug)
    .map((l) => ({
      slug: l.slug,
      name: l.shortName || l.name,
      href: `/locations/${l.slug}`,
      detail: detailOf(l.cardBlurb, l.neighborhoods),
      geo: l.geo ?? undefined,
    }))
  if (!cities.some((c) => c.slug === HOME_CITY_SLUG)) {
    cities.push({slug: HOME_CITY_SLUG, name: homeCity?.name || 'Mesa', href: '/', detail: detailOf(homeCity?.cardBlurb, homeCity?.neighborhoods)})
  }
  const rank = (slug: string) => {
    const i = CITY_ORDER.indexOf(slug)
    return i < 0 ? CITY_ORDER.length : i
  }
  return cities.sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name))
}
