// The service-area cities as structured-data entities. The business's areaServed defines
// each city once per page (#business, every page's graph): its name, its Wikipedia and
// Wikidata pages (data/places.json, checked by scripts/seo/check-places.mjs), its centre
// when the location document has one, and the place it lies in. Every other node points
// at a city by its @id, so the graph names each place exactly once.
import type {SiteSettings} from './types'
import {SITE_URL} from './seo'
import {serviceAreaCities, type City} from './cities'
import places from '../data/places.json'

interface PlaceInfo {
  type: 'City' | 'Place'
  wikidata: string
  wikipedia: string
  gnis?: number
  /** A neighbourhood's city (Ahwatukee lies in Phoenix). */
  within?: string
}

const CITIES = places.cities as Record<string, PlaceInfo>

type Node = Record<string, unknown>

export const ARIZONA_ID = `${SITE_URL}/#arizona`

/** The @id of a service-area city ("mesa" for the home city, else the location slug). */
export const placeId = (slug: string) => `${SITE_URL}/#area-${slug}`

const wikidata = (id: string) => `https://www.wikidata.org/wiki/${id}`

/** The state every city lies in, once per page. */
export function arizonaNode(): Node {
  return {'@type': 'State', '@id': ARIZONA_ID, name: places.state.name, sameAs: [places.state.wikipedia, wikidata(places.state.wikidata)]}
}

/** A city's full node: name, Wikipedia and Wikidata, its centre when known, and the place it lies in. */
export function placeNode(city: Pick<City, 'slug' | 'name' | 'geo'>, served: Set<string>): Node {
  const info = CITIES[city.slug]
  const within = info?.within && served.has(info.within) ? {'@id': placeId(info.within)} : {'@id': ARIZONA_ID}
  return {
    '@type': info?.type ?? 'City',
    '@id': placeId(city.slug),
    name: city.name,
    sameAs: info ? [info.wikipedia, wikidata(info.wikidata)] : undefined,
    geo: city.geo ? {'@type': 'GeoCoordinates', latitude: city.geo.lat, longitude: city.geo.lng} : undefined,
    containedInPlace: within,
  }
}

/**
 * Every city the business serves, in the site's city order: Mesa (the homepage, from
 * Site settings → Home city) first, then the service areas (lib/cities.ts).
 */
export function servedCities(s: SiteSettings): City[] {
  return serviceAreaCities(s.homeCity, (s.serviceAreas ?? []).map((a) => ({slug: a.slug, name: a.name, shortName: a.shortName, geo: a.geo})))
}

/** References to every served city, for a node whose area is the whole service area. */
export function servedPlaceRefs(s: SiteSettings) {
  return servedCities(s).map((c) => ({'@id': placeId(c.slug)}))
}
