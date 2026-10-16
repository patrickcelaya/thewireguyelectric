// JSON-LD builders. Everything is emitted as a single @graph per page, with
// stable @ids so Google (and AI search) can tie every page back to one business
// entity.
import type {FaqItem, JobOpening, LocationDoc, PortableTextValue, PostDoc, PostalAddress, ServiceDoc, SiteSettings} from './types'
import {SITE_URL, absoluteUrl, type Crumb} from './seo'
import {imageUrl, hasImage} from './image'

export const BUSINESS_ID = `${SITE_URL}/#business`
export const WEBSITE_ID = `${SITE_URL}/#website`

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

export function businessNode(s: SiteSettings, services?: Array<{name: string; slug: string}>): Node {
  const node: Node = {
    '@type': 'Electrician',
    '@id': BUSINESS_ID,
    name: s.businessName,
    legalName: s.legalName,
    description: s.description,
    url: SITE_URL,
    telephone: s.phoneE164,
    email: s.email,
    priceRange: s.priceRange,
    foundingDate: s.foundingDate,
    founder: s.founders?.map((f) => ({'@type': 'Person', name: f.name})),
    // PNG from /public: a stable URL in a format every consumer of the logo accepts.
    image: `${SITE_URL}/logo.png`,
    logo: {'@type': 'ImageObject', url: `${SITE_URL}/logo.png`, width: 500, height: 447},
    identifier: s.rocLicense ? {'@type': 'PropertyValue', name: 'ROC License', value: s.rocLicense} : undefined,
    // The main entity is the headquarters. Offices with their own Google Business
    // Profile are entities of their own (branchNodes), in every page's graph.
    address: mainAddresses(s).map(postalAddressNode),
    geo: mainAddresses(s)[0]?.geo ? {'@type': 'GeoCoordinates', latitude: mainAddresses(s)[0].geo!.lat, longitude: mainAddresses(s)[0].geo!.lng} : undefined,
    subOrganization: branchAddresses(s).length ? branchAddresses(s).map((a) => ({'@id': branchId(a)})) : undefined,
    openingHoursSpecification: s.openingHours?.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days.map((d) => DAY_MAP[d] ?? d),
      opens: h.opens,
      closes: h.closes,
    })),
    areaServed: s.serviceAreas?.map((a) => ({'@type': 'City', name: a.name})),
    // No aggregateRating: Google ignores ratings a business publishes about itself
    // (no stars for self-serving reviews). The rating is shown visibly in the trust bar.
    hasOfferCatalog: services?.length
      ? {
          '@type': 'OfferCatalog',
          name: 'Electrical Services',
          itemListElement: services.map((sv) => ({'@type': 'Offer', itemOffered: {'@type': 'Service', name: sv.name, url: absoluteUrl(`/services/${sv.slug}`)}})),
        }
      : undefined,
    sameAs: s.sameAs?.length ? s.sameAs : undefined,
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

/** A second office with its own Google Business Profile (e.g. Scottsdale), as its own entity. */
export function branchNode(s: SiteSettings, a: PostalAddress): Node {
  return {
    '@type': 'Electrician',
    '@id': branchId(a),
    // Same brand unless the Google Business Profile uses a different name.
    name: a.gbpName ?? s.businessName,
    url: absoluteUrl(`/locations/${a.locationSlug}`),
    telephone: a.phone ?? s.phoneE164,
    email: s.email,
    priceRange: s.priceRange,
    image: `${SITE_URL}/logo.png`,
    address: postalAddressNode(a),
    geo: a.geo ? {'@type': 'GeoCoordinates', latitude: a.geo.lat, longitude: a.geo.lng} : undefined,
    openingHoursSpecification: s.openingHours?.map((h) => ({'@type': 'OpeningHoursSpecification', dayOfWeek: h.days, opens: h.opens, closes: h.closes})),
    areaServed: {'@type': 'City', name: a.addressLocality},
    parentOrganization: {'@id': BUSINESS_ID},
    identifier: s.rocLicense ? {'@type': 'PropertyValue', name: 'ROC License', value: s.rocLicense} : undefined,
    sameAs: a.googleMapsUrl ? [a.googleMapsUrl] : undefined,
    hasMap: a.googleMapsUrl,
  }
}

/** Every office with its own Google Business Profile, so the graph carries both offices' full NAP on every page. */
export function branchNodes(s: SiteSettings): Node[] {
  return branchAddresses(s).map((a) => branchNode(s, a))
}

export function websiteNode(s: SiteSettings): Node {
  return {'@type': 'WebSite', '@id': WEBSITE_ID, url: SITE_URL, name: s.businessName, publisher: {'@id': BUSINESS_ID}, inLanguage: 'en-US'}
}

export function webPageNode(opts: {path: string; title: string; description?: string; type?: string; breadcrumbs?: Crumb[]; primaryImage?: string}): Node {
  const url = absoluteUrl(opts.path)
  return {
    '@type': opts.type ?? 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: opts.title,
    description: opts.description,
    isPartOf: {'@id': WEBSITE_ID},
    about: {'@id': BUSINESS_ID},
    primaryImageOfPage: opts.primaryImage ? {'@type': 'ImageObject', url: opts.primaryImage} : undefined,
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
    blogPost: posts.slice(0, 20).map((p) => ({'@type': 'BlogPosting', headline: p.title, url: absoluteUrl(`/blog-posts/${p.slug}`), datePublished: p.publishedAt})),
  }
}

export function breadcrumbNode(path: string, crumbs: Crumb[]): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteUrl(path)}#breadcrumb`,
    itemListElement: crumbs.map((c, i) => ({'@type': 'ListItem', position: i + 1, name: c.name, item: absoluteUrl(c.path)})),
  }
}

export function serviceNode(service: ServiceDoc, s: SiteSettings, description?: string): Node {
  const url = absoluteUrl(`/services/${service.slug}`)
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: service.name,
    serviceType: service.name,
    description,
    url,
    image: hasImage(service.mainImage) ? imageUrl(service.mainImage, {width: 1200}) : undefined,
    provider: {'@id': BUSINESS_ID},
    areaServed: s.serviceAreas?.map((a) => ({'@type': 'City', name: a.name})),
    category: service.category?.name,
    offers:
      service.priceRange?.low && service.priceRange?.high
        ? {'@type': 'AggregateOffer', priceCurrency: 'USD', lowPrice: service.priceRange.low, highPrice: service.priceRange.high}
        : undefined,
  }
}

export function locationServiceNode(location: LocationDoc): Node {
  const url = absoluteUrl(`/locations/${location.slug}`)
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: `Electrician in ${location.cityNameForSeo ?? location.name}`,
    serviceType: 'Electrician',
    provider: {'@id': BUSINESS_ID},
    areaServed: {
      '@type': 'City',
      name: location.name,
      geo: location.geo ? {'@type': 'GeoCoordinates', latitude: location.geo.lat, longitude: location.geo.lng} : undefined,
      containedInPlace: {'@type': 'State', name: 'Arizona'},
    },
    url,
  }
}

export function blogPostingNode(post: PostDoc, description?: string): Node {
  const url = absoluteUrl(`/blog-posts/${post.slug}`)
  return {
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    headline: post.title,
    description,
    url,
    mainEntityOfPage: {'@id': `${url}#webpage`},
    image: hasImage(post.mainImage) ? imageUrl(post.mainImage, {width: 1200}) : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    author: post.author
      ? {'@type': 'Person', name: post.author.name, jobTitle: post.author.role, worksFor: {'@id': BUSINESS_ID}}
      : {'@id': BUSINESS_ID},
    publisher: {'@id': BUSINESS_ID},
    articleSection: post.category?.name,
    inLanguage: 'en-US',
  }
}

export function faqNode(path: string, faqs: FaqItem[]): Node | undefined {
  const items = faqs.filter((f) => f.question && f.answer)
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
    description: toPlainText(job.description),
    datePosted: job.datePosted,
    validThrough: job.validThrough,
    employmentType: job.employmentType,
    hiringOrganization: {'@id': BUSINESS_ID, '@type': 'Organization', name: s.businessName, sameAs: SITE_URL},
    jobLocation: addr
      ? {'@type': 'Place', address: {'@type': 'PostalAddress', streetAddress: addr.streetAddress, addressLocality: addr.addressLocality, addressRegion: addr.addressRegion, postalCode: addr.postalCode, addressCountry: 'US'}}
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
