// JSON-LD builders. Everything is emitted as a single @graph per page, with
// stable @ids so Google (and AI search) can tie every page back to one business
// entity. The business node (on every page) defines the shared entities once: the
// service-area cities (lib/places.ts), the licence and the logo; other nodes point at
// them, at the services (/services/<slug>#service) and at the posts (#article) by @id.
import type {FaqItem, ImageRef, JobOpening, LocationDoc, PortableTextValue, PostalAddress, PostDoc, PostSummary, ServiceDoc, ServiceSummary, SiteSettings} from './types'
import {SITE_URL, absoluteUrl, type Crumb} from './seo'
import {imageDimensions, imageUrl, hasImage} from './image'
import {businessSummary} from './site'
import {portableTextToHtml} from './portable-text'
import {placeId, placeNode, servedCities, servedPlaceRefs} from './places'
import {serviceTopic} from './format'

export const BUSINESS_ID = `${SITE_URL}/#business`
export const WEBSITE_ID = `${SITE_URL}/#website`
const LOGO_ID = `${SITE_URL}/#logo`
const LICENSE_ID = `${SITE_URL}/#roc-license`
const LOGO_URL = `${SITE_URL}/logo.png`
const HOME_URL = `${SITE_URL}/`

/** The shorter names people search for the business by. */
const ALTERNATE_NAMES = ['The Wire Guy', 'Wire Guy Electric']

type Node = Record<string, unknown>

export function toPlainText(blocks?: PortableTextValue) {
  if (!blocks) return ''
  return blocks
    .filter((b) => b._type === 'block' && Array.isArray(b.children))
    .map((b) => (b.children as Array<{text?: string}>).map((c) => c.text ?? '').join(''))
    .join('\n\n')
    .trim()
}

const DAY_MAP: Record<string, string> = {
  Monday: 'Monday', Tuesday: 'Tuesday', Wednesday: 'Wednesday', Thursday: 'Thursday', Friday: 'Friday', Saturday: 'Saturday', Sunday: 'Sunday',
}

/** A service's entity @id (its page's Service node). */
export const serviceId = (slug: string) => `${absoluteUrl(`/services/${slug}`)}#service`
/** A post's entity @id (its page's BlogPosting node). */
export const articleId = (slug: string) => `${absoluteUrl(`/blog-posts/${slug}`)}#article`

/** A service named where it is mentioned: its @id, name and page. */
/**
 * A service's entity name: its page's H1 (heading), else its name. The same everywhere its @id appears (its page,
 * the business's catalogue and knowsAbout, related services), and the last crumb of its page.
 */
export const serviceName = (sv: {name: string; heading?: string | null}) => sv.heading?.trim() || sv.name
/** The kind of service, short and in sentence case: "Electrical troubleshooting", "Panel replacements". */
const serviceType = (sv: {name: string; slug: string}) => serviceTopic(sv).replace(/^./, (c) => c.toUpperCase())
const serviceRef = (sv: {name: string; slug: string; heading?: string | null}): Node => ({'@type': 'Service', '@id': serviceId(sv.slug), name: serviceName(sv), url: absoluteUrl(`/services/${sv.slug}`)})
/** A post named where it is mentioned: its @id, headline and page. */
const articleRef = (p: {title: string; slug: string}): Node => ({'@type': 'BlogPosting', '@id': articleId(p.slug), headline: p.title, url: absoluteUrl(`/blog-posts/${p.slug}`)})

/** An image as an ImageObject: a JPEG rendition at most `width` wide, with its size (and an @id when it is shared). */
export function imageObjectNode(image: ImageRef | null | undefined, opts: {id?: string; width?: number} = {}): Node | undefined {
  const size = imageDimensions(image)
  if (!hasImage(image) || !size) return undefined
  const width = Math.min(opts.width ?? 1200, size.width)
  return {
    '@type': 'ImageObject',
    '@id': opts.id,
    url: imageUrl(image, {width, format: 'jpg'}),
    width,
    height: Math.round((width / size.width) * size.height),
  }
}

// Profile links. sameAs states identity, so it takes only full https profile URLs: never a
// link shortener (share.google, goo.gl, bit.ly), whose target can change under it.
const SHORTENER = /^https?:\/\/(?:[^/]*\.)?(?:share\.google|goo\.gl|bit\.ly)(?:\/|$)/i
const GOOGLE_MAPS_PLACE = /^https:\/\/(?:www\.)?google\.[a-z.]+\/maps\b/i

function profileUrls(urls: Array<string | null | undefined>) {
  const ok = urls.filter((u): u is string => Boolean(u && /^https:\/\//i.test(u) && !SHORTENER.test(u)))
  return [...new Set(ok)]
}

/** The office's Google Maps place URL (a ?cid= link) when one is known, else its stored map link (the footer's). */
function mapUrl(a: PostalAddress | undefined, profiles: Array<string | null | undefined> = []) {
  return profileUrls([...profiles, a?.googleMapsUrl]).find((u) => GOOGLE_MAPS_PLACE.test(u)) ?? a?.googleMapsUrl
}

/** The licence, defined once on the business; the branch refers to it. */
function licenseNode(s: SiteSettings): Node | undefined {
  if (!s.rocLicense) return undefined
  return {
    '@type': 'EducationalOccupationalCredential',
    '@id': LICENSE_ID,
    // only the number: the site states no licence class
    name: `Arizona ROC contractor license #${s.rocLicense}`,
    credentialCategory: 'license',
    identifier: s.rocLicense,
    url: s.rocLicenseUrl,
    recognizedBy: {'@type': 'GovernmentOrganization', name: 'Arizona Registrar of Contractors', url: 'https://roc.az.gov/'},
  }
}

export function businessNode(s: SiteSettings, services?: Array<{name: string; slug: string; heading?: string | null}>): Node {
  const main = mainAddresses(s)[0]
  const cities = servedCities(s)
  const served = new Set(cities.map((c) => c.slug))
  const photo = imageObjectNode(s.defaultOgImage)
  const node: Node = {
    '@type': 'Electrician',
    '@id': BUSINESS_ID,
    name: s.businessName,
    alternateName: ALTERNATE_NAMES,
    legalName: s.legalName,
    // the factual sentence the homepage shows, written from Site settings (lib/site.ts)
    description: businessSummary(s) ?? s.description,
    // the homepage's canonical URL
    url: HOME_URL,
    telephone: s.phoneE164,
    email: s.email,
    priceRange: s.priceRange,
    foundingDate: s.foundingDate,
    // the Person node on /our-team has the same @id
    founder: s.founders?.map((f) => ({'@type': 'Person', '@id': f.slug ? absoluteUrl(`/our-team#${f.slug}`) : undefined, name: f.name})),
    // a real photo of the crew (Site settings → default share image) and the logo; the PNG from
    // /public is a stable URL in a format every consumer of the logo accepts
    image: photo ? [photo, LOGO_URL] : LOGO_URL,
    logo: {'@type': 'ImageObject', '@id': LOGO_ID, url: LOGO_URL, contentUrl: LOGO_URL, width: 500, height: 447, caption: s.businessName},
    identifier: s.rocLicense ? {'@type': 'PropertyValue', name: 'ROC License', value: s.rocLicense} : undefined,
    hasCredential: licenseNode(s),
    knowsAbout: services?.length ? services.map(serviceName) : undefined,
    // The main entity is the headquarters. Offices with their own Google Business
    // Profile are entities of their own (branchNodes), in every page's graph.
    address: mainAddresses(s).map(postalAddressNode),
    geo: main?.geo ? {'@type': 'GeoCoordinates', latitude: main.geo.lat, longitude: main.geo.lng} : undefined,
    // the headquarters' Google Business Profile: its Maps place URL when Site settings lists one, else the footer's link
    hasMap: mapUrl(main, s.sameAs ?? []),
    contactPoint: s.phoneE164
      ? {'@type': 'ContactPoint', telephone: s.phoneE164, email: s.email, contactType: 'customer service', areaServed: 'US-AZ', availableLanguage: 'en'}
      : undefined,
    subOrganization: branchAddresses(s).length ? branchAddresses(s).map((a) => ({'@id': branchId(a)})) : undefined,
    openingHoursSpecification: s.openingHours?.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => DAY_MAP[d] ?? d),
      opens: h.opens,
      closes: h.closes,
    })),
    // every city served, Mesa (the headquarters) first, each defined here once per page
    areaServed: cities.map((c) => placeNode(c, served)),
    // No aggregateRating: Google ignores ratings a business publishes about itself
    // (no stars for self-serving reviews). The rating is shown visibly in the trust bar.
    hasOfferCatalog: services?.length
      ? {
          '@type': 'OfferCatalog',
          name: 'Electrical Services',
          itemListElement: services.map((sv) => ({'@type': 'Offer', itemOffered: serviceRef(sv)})),
        }
      : undefined,
    sameAs: profileUrls(s.sameAs ?? []).length ? profileUrls(s.sameAs ?? []) : undefined,
  }
  return node
}

function postalAddressNode(a: PostalAddress) {
  return {
    '@type': 'PostalAddress',
    streetAddress: a.streetAddress,
    addressLocality: a.addressLocality,
    addressRegion: a.addressRegion,
    postalCode: a.postalCode,
    addressCountry: 'US',
  }
}

const mainAddresses = (s: SiteSettings) => (s.addresses ?? []).filter((a) => !a.locationSlug)
const branchAddresses = (s: SiteSettings) => (s.addresses ?? []).filter((a) => a.locationSlug)
/** The @id of an office with its own Google Business Profile (its city page's #business). */
export const branchId = (a: PostalAddress) => `${absoluteUrl(`/locations/${a.locationSlug}`)}#business`

/** The office whose Google Business Profile links to this city page, if any. */
export function branchFor(s: SiteSettings, locationSlug: string) {
  return branchAddresses(s).find((a) => a.locationSlug === locationSlug)
}

/** A city by @id when the business's areaServed defines it on the page, else in full. */
function cityRef(s: SiteSettings, slug: string, name: string, geo?: {lat: number; lng: number} | null): Node {
  const served = new Set(servedCities(s).map((c) => c.slug))
  return served.has(slug) ? {'@id': placeId(slug)} : placeNode({slug, name, geo: geo ?? undefined}, served)
}

/** A second office with its own Google Business Profile (e.g. Scottsdale), as its own entity. */
export function branchNode(s: SiteSettings, a: PostalAddress): Node {
  const sameAs = profileUrls([a.googleMapsUrl, ...(a.sameAs ?? [])])
  return {
    '@type': 'Electrician',
    '@id': branchId(a),
    // Same brand unless the Google Business Profile uses a different name.
    name: a.gbpName ?? s.businessName,
    url: absoluteUrl(`/locations/${a.locationSlug}`),
    telephone: a.phone ?? s.phoneE164,
    email: s.email,
    priceRange: s.priceRange,
    image: LOGO_URL,
    address: postalAddressNode(a),
    geo: a.geo ? {'@type': 'GeoCoordinates', latitude: a.geo.lat, longitude: a.geo.lng} : undefined,
    // No opening hours: the office is by appointment, and its own profile's hours aren't confirmed
    // (seo-requirements §3.5: state hours for an office only when they match its Google Business Profile).
    areaServed: a.locationSlug ? cityRef(s, a.locationSlug, a.addressLocality ?? a.locationSlug) : undefined,
    parentOrganization: {'@id': BUSINESS_ID},
    identifier: s.rocLicense ? {'@type': 'PropertyValue', name: 'ROC License', value: s.rocLicense} : undefined,
    hasCredential: s.rocLicense ? {'@id': LICENSE_ID} : undefined,
    // its own profiles (never the footer's share link); none until they are recorded
    sameAs: sameAs.length ? sameAs : undefined,
    hasMap: mapUrl(a, a.sameAs ?? []),
  }
}

/** Every office with its own Google Business Profile, so the graph carries both offices' full NAP on every page. */
export function branchNodes(s: SiteSettings): Node[] {
  return branchAddresses(s).map((a) => branchNode(s, a))
}

export function websiteNode(s: SiteSettings): Node {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: HOME_URL,
    name: s.businessName,
    alternateName: ALTERNATE_NAMES,
    publisher: {'@id': BUSINESS_ID},
    inLanguage: 'en-US',
  }
}

export function webPageNode(opts: {path: string; title: string; description?: string; type?: string; breadcrumbs?: Crumb[]; primaryImage?: string | Node}): Node {
  const url = absoluteUrl(opts.path)
  return {
    '@type': opts.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.title,
    description: opts.description,
    isPartOf: {'@id': WEBSITE_ID},
    about: {'@id': BUSINESS_ID},
    primaryImageOfPage: typeof opts.primaryImage === 'string' ? {'@type': 'ImageObject', url: opts.primaryImage} : opts.primaryImage,
    breadcrumb: opts.breadcrumbs?.length ? {'@id': `${url}#breadcrumb`} : undefined,
    inLanguage: 'en-US',
  }
}

export function blogNode(s: SiteSettings, posts: Array<{title: string; slug: string; publishedAt: string}>): Node {
  const url = absoluteUrl('/blog')
  return {
    '@type': 'Blog',
    '@id': `${url}#blog`,
    url,
    name: `${s.businessName} Blog`,
    publisher: {'@id': BUSINESS_ID},
    // every post /blog lists (all of them, on one page), each by its post page's @id
    blogPost: posts.map((p) => ({...articleRef(p), datePublished: p.publishedAt})),
  }
}

export function breadcrumbNode(path: string, crumbs: Crumb[]): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({'@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path)})),
  }
}

/**
 * A service page's Service: what the page shows of it. `image` only when the page shows
 * that photo (a stock image the page hides stays out of the markup); the related
 * services and guides are the cards the page shows. No offers or prices: the owner
 * publishes no prices on service pages.
 */
export function serviceNode(
  service: ServiceDoc,
  s: SiteSettings,
  description?: string,
  opts: {image?: ImageRef; related?: ServiceSummary[]; guides?: PostSummary[]} = {},
): Node {
  const url = absoluteUrl(`/services/${service.slug}`)
  return {
    '@type': 'Service',
    '@id': serviceId(service.slug),
    name: serviceName(service),
    serviceType: serviceType(service),
    description,
    url,
    image: imageObjectNode(opts.image),
    provider: {'@id': BUSINESS_ID},
    areaServed: servedPlaceRefs(s),
    category: service.category?.name,
    isRelatedTo: opts.related?.length ? opts.related.map(serviceRef) : undefined,
    subjectOf: opts.guides?.length ? opts.guides.map(articleRef) : undefined,
  }
}

/** Services as an ItemList (a CollectionPage's mainEntity): each one's name and page. */
export function serviceListNode(services: Array<{name: string; slug: string}>): Node {
  return {
    '@type': 'ItemList',
    itemListElement: services.map((sv, i) => ({'@type': 'ListItem', position: i + 1, name: sv.name, url: absoluteUrl(`/services/${sv.slug}`)})),
  }
}

/** The commercial landing page's service: commercial electrical work, by the business, across its service area. */
export function commercialServiceNode(path: string, s: SiteSettings, services: Array<{name: string; slug: string}>): Node {
  const url = absoluteUrl(path)
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: 'Commercial electrical services',
    serviceType: 'Commercial electrician',
    url,
    provider: {'@id': BUSINESS_ID},
    areaServed: servedPlaceRefs(s),
    hasOfferCatalog: services.length
      ? {
          '@type': 'OfferCatalog',
          name: 'Commercial electrical services',
          itemListElement: services.map((sv) => ({'@type': 'Offer', itemOffered: serviceRef(sv)})),
        }
      : undefined,
  }
}

/**
 * A city page's Service: electrical work in that city, by the office whose Google
 * Business Profile lands on the page (Scottsdale) or else the business, listing the
 * services the page shows as cards.
 */
export function locationServiceNode(location: LocationDoc, s: SiteSettings, opts: {provider?: string; services?: ServiceSummary[]} = {}): Node {
  const url = absoluteUrl(`/locations/${location.slug}`)
  const city = location.shortName || location.name
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: `Electrician in ${location.cityNameForSeo ?? location.name}`,
    serviceType: 'Electrician',
    description: location.description,
    provider: {'@id': opts.provider ?? BUSINESS_ID},
    areaServed: cityRef(s, location.slug, city, location.geo),
    hasOfferCatalog: opts.services?.length
      ? {
          '@type': 'OfferCatalog',
          name: `Electrical services in ${city}`,
          itemListElement: opts.services.map((sv) => ({'@type': 'Offer', itemOffered: serviceRef(sv)})),
        }
      : undefined,
    url,
  }
}

/**
 * A post's BlogPosting. `image` is the cover the page shows (with the page's
 * #primaryimage @id); `about` is the post's hub service (its first related service) and
 * `mentions` the others.
 */
export function blogPostingNode(post: PostDoc, description?: string, opts: {image?: Node} = {}): Node {
  const url = absoluteUrl(`/blog-posts/${post.slug}`)
  const [hub, ...others] = post.relatedServices ?? []
  return {
    '@type': 'BlogPosting',
    '@id': articleId(post.slug),
    headline: post.title,
    description,
    url,
    mainEntityOfPage: {'@id': `${url}#webpage`},
    image: opts.image,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: post.author
      ? {'@type': 'Person', name: post.author.name, jobTitle: post.author.role, worksFor: {'@id': BUSINESS_ID}}
      : {'@id': BUSINESS_ID},
    publisher: {'@id': BUSINESS_ID},
    isPartOf: {'@id': `${absoluteUrl('/blog')}#blog`},
    about: hub ? {'@id': serviceId(hub.slug)} : undefined,
    mentions: others.length ? others.map((sv) => ({'@id': serviceId(sv.slug)})) : undefined,
    articleSection: post.category?.name,
    inLanguage: 'en-US',
  }
}

/** The page that lists every shared question (faq documents), and the only one that marks them up. */
export const FAQ_PATH = '/faq'

/**
 * The page's FAQPage, from the questions it shows. A shared question (a faq document, which has an _id) is marked
 * up on /faq only, where every one is listed: Google asks for one marked-up instance of a Q&A that appears on
 * several pages. Other pages still show it, and mark up only their own questions (a service's, a city's or a
 * post's inline FAQs). scripts/seo/check-structured-data.mjs fails a question marked up on two indexable pages.
 */
export function faqNode(path: string, faqs: FaqItem[]): Node | undefined {
  const items = faqs.filter((f) => f.question && f.answer && (!f._id || path === FAQ_PATH))
  if (!items.length) return undefined
  return {
    '@type': 'FAQPage',
    '@id': `${absoluteUrl(path)}#faq`,
    mainEntity: items.map((f) => ({'@type': 'Question', name: f.question, acceptedAnswer: {'@type': 'Answer', text: toPlainText(f.answer)}})),
  }
}

export function jobPostingNode(job: JobOpening, s: SiteSettings): Node {
  const addr = s.addresses?.[0]
  return {
    '@type': 'JobPosting',
    title: job.title,
    // Google asks for the description as HTML
    description: portableTextToHtml(job.description) || undefined,
    identifier: {'@type': 'PropertyValue', name: s.businessName, value: job._id},
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType,
    // inline, not the business's @id: a second definition of that node would conflict with the Electrician one
    hiringOrganization: {'@type': 'Organization', name: s.businessName, url: HOME_URL, sameAs: HOME_URL, logo: LOGO_URL},
    jobLocation: addr
      ? {'@type': 'Place', address: {'@type': 'PostalAddress', streetAddress: addr.streetAddress, addressLocality: addr.addressLocality, addressRegion: addr.addressRegion, postalCode: addr.postalCode, addressCountry: 'US'}}
      : undefined,
    // only what the posting states: "4+ years" is 48 months; no salary unless the owner gives one
    experienceRequirements: job.minExperienceMonths
      ? {'@type': 'OccupationalExperienceRequirements', monthsOfExperience: job.minExperienceMonths}
      : undefined,
    baseSalary:
      job.baseSalary?.min
        ? {'@type': 'MonetaryAmount', currency: 'USD', value: {'@type': 'QuantitativeValue', minValue: job.baseSalary.min, maxValue: job.baseSalary.max, unitText: job.baseSalary.unit ?? 'HOUR'}}
        : undefined,
  }
}

/** Remove undefined values so the JSON stays clean. */
export function graph(nodes: Array<Node | undefined>) {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean).map((n) => JSON.parse(JSON.stringify(n))),
  }
}
