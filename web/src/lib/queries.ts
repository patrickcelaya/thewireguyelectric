// GROQ queries and typed fetchers. Every page's data comes through here.
import {defineQuery} from 'groq'
import {fetchQuery} from './sanity'
import {buildRedirectMap} from './links'
import type {
  FaqItem,
  ImageRef,
  JobOpening,
  LocationDoc,
  LocationSummary,
  PageDoc,
  PageSection,
  PostCategoryDoc,
  PostDoc,
  PostCard,
  PostIndexEntry,
  PostSummary,
  ProjectSummary,
  ResolvedTrustItem,
  Review,
  ServiceCard,
  ServiceCategoryDoc,
  ServiceCategoryGroup,
  ServiceDoc,
  ServicesSection,
  ServiceSummary,
  SiteSettings,
  TeamMember,
  TeamMemberSummary,
  TrustItem,
} from './types'

const IMAGE = /* groq */ `{
  alt,
  caption,
  crop,
  hotspot,
  "asset": asset->{_id, url, metadata{lqip, dimensions{width, height}}},
  "legacyUrl": _sanityAsset
}`

/** Image inside an array (keeps _key). */
const KEYED_IMAGE = /* groq */ `{
  _key,
  alt,
  caption,
  crop,
  hotspot,
  "asset": asset->{_id, url, metadata{lqip, dimensions{width, height}}},
  "legacyUrl": _sanityAsset
}`

const RICH_TEXT = /* groq */ `[]{
  ...,
  _type == "figure" => {
    "asset": asset->{_id, url, metadata{lqip, dimensions{width, height}}},
    "legacyUrl": _sanityAsset
  }
}`

const SEO = /* groq */ `seo{title, description, noIndex, "ogImage": ogImage${IMAGE}}`

const FAQS = /* groq */ `faqs[]{_key, question, answer${RICH_TEXT}}`

/** A shared faq document. */
const FAQ_DOC = /* groq */ `{_id, question, answer${RICH_TEXT}, topic}`

const NAMED_LINK = /* groq */ `{name, "slug": slug.current}`

/**
 * A city's bare name ("Gilbert") for chips, cards and links. Some location
 * documents still hold the full H1 in `name`, so derive it from cityNameForSeo
 * ("Gilbert, AZ") when that is set. Evaluated in the scope of a location document.
 */
const CITY_NAME = /* groq */ `coalesce(string::split(cityNameForSeo, ",")[0], name)`

/** A location as a NamedLink: the bare city name and slug. */
const LOCATION_LINK = /* groq */ `{"name": ${CITY_NAME}, "slug": slug.current}`

const SERVICE_FIELDS = /* groq */ `
  _id,
  name,
  "slug": slug.current,
  shortDescription,
  "mainImage": mainImage${IMAGE},
  "category": category->{name, "slug": slug.current}`

const SERVICE_CARD = /* groq */ `{${SERVICE_FIELDS}
}`

/** A service as a section card: summary plus display title/text/image. */
const SERVICE_SECTION_CARD = /* groq */ `{${SERVICE_FIELDS},
  "title": name,
  "text": shortDescription,
  "image": mainImage${IMAGE}
}`

const POST_CARD = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  featured,
  "mainImage": mainImage${IMAGE},
  "category": category->{name, "slug": slug.current},
  "service": relatedServices[0]->${NAMED_LINK}
}`

const LOCATION_CARD = /* groq */ `{
  _id,
  name,
  "slug": slug.current,
  "shortName": ${CITY_NAME},
  cityNameForSeo,
  cardBlurb,
  description,
  neighborhoods,
  geo,
  "mainImage": mainImage${IMAGE}
}`

const HOME_CITY = /* groq */ `{name, cardBlurb, "image": image${IMAGE}, neighborhoods, county, utilityProviders}`

const REVIEW = /* groq */ `{
  _id,
  authorName,
  rating,
  text,
  date,
  source,
  sourceUrl,
  featured,
  "location": location->{"city": ${CITY_NAME}}.city,
  "locationSlug": location->slug.current,
  "service": service->name,
  "serviceSlug": service->slug.current
}`

const REVIEW_SNIPPET = /* groq */ `{_key, text, rating, "review": review->${REVIEW}}`

const FEATURE_ITEM = /* groq */ `{_key, title, text, icon, link, "service": service->${NAMED_LINK}}`

const TEAM_CARD = /* groq */ `{_id, name, role, "slug": slug.current, "photo": photo${IMAGE}}`

const TEAM_MEMBER = /* groq */ `{
  _id, name, role, "slug": slug.current, credentials, yearsExperience, bio${RICH_TEXT}, "photo": photo${IMAGE}
}`

const JOB = /* groq */ `{
  _id, title, description${RICH_TEXT}, employmentType, datePosted, validThrough, baseSalary, minExperienceMonths
}`

const PROJECT_CARD = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  summary,
  completedAt,
  neighborhood,
  "mainImage": mainImage${IMAGE},
  "gallery": gallery[]${KEYED_IMAGE},
  "location": location->{name, "slug": slug.current, "shortName": ${CITY_NAME}},
  "services": services[]->${NAMED_LINK},
  "review": review->${REVIEW}
}`

const SITE_SETTINGS = /* groq */ `*[_id == "siteSettings"][0]`

/** Every page-builder section with its references resolved. Lists are filtered and limited in normalizeSections(). */
const SECTIONS = /* groq */ `sections[]{
  ...,
  _type == "heroSection" => {
    "image": image${IMAGE},
    "reviewSnippets": coalesce(reviewSnippets[]${REVIEW_SNIPPET}, [])
  },
  _type == "richTextSection" => {body${RICH_TEXT}},
  _type == "mediaTextSection" => {"image": image${IMAGE}, body${RICH_TEXT}},
  _type == "servicesSection" => {
    "category": category->${NAMED_LINK},
    "services": coalesce(select(
      count(services) > 0 => services[]{
        _key,
        _type == "reference" => @->${SERVICE_SECTION_CARD},
        _type == "serviceCard" => {
          ...service->${SERVICE_SECTION_CARD},
          "title": coalesce(title, service->name),
          "text": coalesce(text, service->shortDescription),
          "image": select(defined(image) => image${IMAGE}, service->mainImage${IMAGE})
        }
      },
      *[_type == "service" && defined(slug.current) && (!defined(^.category) || category._ref == ^.category._ref)]
        | order(coalesce(order, 999) asc, name asc, _id asc)${SERVICE_SECTION_CARD}
    ), []),
    "categoryInfo": select(layout == "grouped" => *[_type == "serviceCategory" && defined(slug.current)]{
      _id, name, "slug": slug.current, heading, description${RICH_TEXT}
    })
  },
  _type == "locationsSection" => {
    "locations": coalesce(select(
      count(locations) > 0 => locations[]->${LOCATION_CARD},
      *[_type == "location" && defined(slug.current)] | order(name asc, _id asc)${LOCATION_CARD}
    ), []),
    "homeCity": select(includeHomeCity != false => ${SITE_SETTINGS}.homeCity${HOME_CITY})
  },
  _type == "reviewsSection" => {
    "location": location->${LOCATION_LINK},
    "service": service->${NAMED_LINK},
    "picked": count(coalesce(reviews, [])) > 0,
    "reviews": coalesce(select(
      count(reviews) > 0 => reviews[]->${REVIEW},
      *[_type == "review"
        && (!defined(^.location) || location._ref == ^.location._ref)
        && (!defined(^.service) || service._ref == ^.service._ref)
      ] | order(coalesce(featured, false) desc, date desc, _id asc)${REVIEW}
    ), [])
  },
  _type == "faqSection" => {
    "image": image${IMAGE},
    "faqs": coalesce(select(
      count(faqs) > 0 => faqs[]->${FAQ_DOC},
      defined(topic) => *[_type == "faq" && topic == ^.topic] | order(coalesce(order, 999) asc, _id asc)${FAQ_DOC}
    ), []),
    "groups": coalesce(groups[]{
      _key,
      heading,
      topic,
      "faqs": coalesce(select(
        count(faqs) > 0 => faqs[]->${FAQ_DOC},
        defined(topic) => *[_type == "faq" && topic == ^.topic] | order(coalesce(order, 999) asc, _id asc)${FAQ_DOC}
      ), [])
    }, [])
  },
  _type == "teamSection" => {
    "members": coalesce(select(
      count(members) > 0 => members[]->${TEAM_MEMBER},
      *[_type == "teamMember" && showOnTeamPage != false] | order(coalesce(order, 999) asc, name asc, _id asc)${TEAM_MEMBER}
    ), [])
  },
  _type == "postsSection" => {
    "category": category->${NAMED_LINK},
    "picked": count(coalesce(posts, [])) > 0,
    "posts": coalesce(select(
      count(posts) > 0 => posts[]{
        _key,
        _type == "reference" => @->${POST_CARD},
        _type == "postCard" => {...post->${POST_CARD}, label, coverWords, "cover": image${IMAGE}}
      },
      featuredFirst == true => *[_type == "post" && defined(slug.current) && defined(publishedAt) && (!defined(^.category) || category._ref == ^.category._ref)]
        | order(coalesce(featured, false) desc, publishedAt desc, _id asc)${POST_CARD},
      *[_type == "post" && defined(slug.current) && defined(publishedAt) && (!defined(^.category) || category._ref == ^.category._ref)]
        | order(publishedAt desc, _id asc)${POST_CARD}
    ), [])
  },
  _type == "jobsSection" => {
    "jobs": *[_type == "jobOpening" && isOpen != false] | order(datePosted desc, _id asc)${JOB}
  },
  _type == "ctaSection" => {
    "cta": select(defined(cta.heading) => cta, ${SITE_SETTINGS}.ctaBand)
  },
  _type == "trustBarSection" => {"items": coalesce(items, [])},
  _type == "featureGridSection" => {
    "image": image${IMAGE},
    "items": coalesce(select(
      siteList == "valueProps" => ${SITE_SETTINGS}.valueProps[]${FEATURE_ITEM},
      siteList == "capabilities" => ${SITE_SETTINGS}.capabilities[]${FEATURE_ITEM},
      items[]${FEATURE_ITEM}
    ), [])
  },
  _type == "teamIntroSection" => {
    "image": image${IMAGE},
    "body": coalesce(body[]{
      ...,
      markDefs[]{
        ...,
        _type == "teamMemberMention" => {"member": member->${TEAM_CARD}}
      }
    }, []),
    "people": coalesce(select(
      count(people) > 0 => people[]->${TEAM_CARD},
      body[].markDefs[_type == "teamMemberMention"].member->${TEAM_CARD}
    ), [])
  },
  _type == "quoteSection" => {
    "person": person->${TEAM_CARD},
    "review": review->${REVIEW},
    "image": image${IMAGE}
  },
  _type == "gallerySection" => {
    "images": coalesce(images[]{
      _key, alt, caption, crop, hotspot,
      "asset": asset->{_id, url, metadata{lqip, dimensions{width, height}}},
      "legacyUrl": _sanityAsset,
      "service": service->${NAMED_LINK},
      "location": location->${LOCATION_LINK}
    }, []),
    "projects": coalesce(projects[]->${PROJECT_CARD}, [])
  },
  _type == "officeLocationsSection" => {
    "offices": coalesce(${SITE_SETTINGS}.addresses[coalesce(count(^.offices), 0) == 0 || addressLocality in ^.offices]{
      ...,
      "locationSlug": locationPage->slug.current
    }, [])
  },
  _type == "processStepsSection" => {"steps": coalesce(steps, [])},
  _type == "priceGuideSection" => {
    "rows": coalesce(rows[]{
      _key,
      label,
      "low": coalesce(low, service->priceRange.low),
      "high": coalesce(high, service->priceRange.high),
      unit,
      note,
      "service": service->${NAMED_LINK},
      "guide": guide->{title, "slug": slug.current}
    }, [])
  },
  _type == "highlightsSection" => {
    "image": image${IMAGE},
    "checklist": coalesce(checklist, []),
    asideBody${RICH_TEXT}
  }
}`

/** Cache a zero-argument query for the duration of the build (the footer and schema use these on every page). */
function memo<T>(fn: () => Promise<T>) {
  let cached: Promise<T> | undefined
  return () => (cached ??= fn())
}

// ---------------------------------------------------------------------------
// Site settings (memoized for the whole build)

let settingsPromise: Promise<SiteSettings> | undefined

export function getSettings() {
  settingsPromise ??= fetchQuery<SiteSettings | null>(
    defineQuery(`*[_type == "siteSettings" && _id == "siteSettings"][0]{
      ...,
      "logo": logo${IMAGE},
      "defaultOgImage": defaultOgImage${IMAGE},
      "founders": founders[]->{name, role, "slug": slug.current},
      "addresses": addresses[]{..., "locationSlug": locationPage->slug.current},
      "serviceAreas": serviceAreas[]->{name, "slug": slug.current, "shortName": ${CITY_NAME}, geo},
      "homeCity": homeCity${HOME_CITY},
      "heroQuotes": heroQuotes[]${REVIEW_SNIPPET},
      "valueProps": valueProps[]${FEATURE_ITEM},
      "capabilities": capabilities[]${FEATURE_ITEM}
    }`),
  ).then((s) => {
    if (!s) throw new Error('siteSettings document is missing')
    return s
  })
  return settingsPromise
}

/** Alias of getSettings() (same memoized promise), named after the document type. */
export const getSiteSettings = getSettings

// ---------------------------------------------------------------------------
// Pages

export async function getPage(slug: string): Promise<PageDoc | null> {
  const page = await fetchQuery<PageDoc | null>(
    defineQuery(`*[_type == "page" && slug.current == $slug][0]{
      _id, _updatedAt, title, "slug": slug.current, heading, intro,
      ${SECTIONS},
      ${SEO}
    }`),
    {slug},
  )
  return page ? {...page, sections: normalizeSections(page.sections)} : null
}

export function getPageSlugs() {
  return fetchQuery<string[]>(defineQuery(`*[_type == "page" && defined(slug.current)].slug.current`))
}

/** Default number of items for list sections when the editor left `limit` empty (the Studio's initial values). */
const DEFAULT_LIMITS = {postsSection: 3, reviewsSection: 6} as const

function applyLimit<T>(items: T[], limit: number | undefined, fallback: number) {
  const n = limit ?? fallback
  return n > 0 ? items.slice(0, n) : items
}

/** Drop dangling references (deleted documents resolve to null or to an object without _id). */
function present<T>(items: Array<T | null | undefined> | null | undefined): T[] {
  return (items ?? []).filter((item): item is T => Boolean(item && (!(typeof item === 'object' && '_id' in item) || (item as {_id?: string})._id)))
}

type CategoryInfo = Omit<ServiceCategoryGroup, 'services'>
/** servicesSection as the query returns it, before normalizeSections() turns categoryInfo into groups. */
type RawServicesSection = ServicesSection & {categoryInfo?: CategoryInfo[] | null}
/** reviewsSection / postsSection as the query returns them: `picked` is true when the editor picked the items. */
type RawPicked<T> = T & {picked?: boolean | null}

function uniqueById<T extends {_id: string}>(items: T[]) {
  const seen = new Set<string>()
  return items.filter((item) => (seen.has(item._id) ? false : (seen.add(item._id), true)))
}

/**
 * Post-query clean-up that GROQ can't express: apply `limit` to automatic lists
 * (GROQ can't slice by a field; picked items are always shown in full), drop
 * dangling references, de-duplicate mentioned people, and group service cards by
 * category for the "grouped" layout.
 */
function normalizeSections(sections: PageSection[] | null | undefined): PageSection[] {
  return (sections ?? []).map((section): PageSection => {
    switch (section._type) {
      case 'servicesSection': {
        // A card whose service was deleted has no _id; drop it.
        const services = present<ServiceCard>(section.services).filter((s) => s._id)
        const {categoryInfo, ...rest} = section as RawServicesSection
        const groups =
          section.layout === 'grouped'
            ? [...new Set(services.map((s) => s.category?.slug).filter(Boolean))]
                .map((slug) => (categoryInfo ?? []).find((c) => c.slug === slug))
                .filter((c): c is CategoryInfo => Boolean(c))
                .map((c) => ({...c, services: services.filter((s) => s.category?.slug === c.slug)}))
            : undefined
        return {...rest, services, groups}
      }
      case 'locationsSection':
        return {...section, locations: present<LocationSummary>(section.locations)}
      case 'reviewsSection': {
        const {picked, ...rest} = section as RawPicked<typeof section>
        const reviews = present<Review>(section.reviews)
        return {...rest, reviews: picked ? reviews : applyLimit(reviews, section.limit, DEFAULT_LIMITS.reviewsSection)}
      }
      case 'faqSection':
        return {
          ...section,
          faqs: present<FaqItem>(section.faqs),
          groups: (section.groups ?? []).map((g) => ({...g, faqs: present<FaqItem>(g.faqs)})),
        }
      case 'teamSection':
        return {...section, members: present<TeamMember>(section.members)}
      case 'postsSection': {
        const {picked, ...rest} = section as RawPicked<typeof section>
        const posts = present<PostCard>(section.posts)
        return {...rest, posts: picked ? posts : applyLimit(posts, section.limit, DEFAULT_LIMITS.postsSection)}
      }
      case 'jobsSection':
        return {...section, jobs: present<JobOpening>(section.jobs)}
      case 'teamIntroSection':
        return {...section, people: uniqueById(present<TeamMemberSummary>(section.people))}
      case 'gallerySection':
        return {...section, projects: present<ProjectSummary>(section.projects)}
      default:
        return section
    }
  })
}

/**
 * Every FAQ shown on a page, across all FAQ sections and groups, de-duplicated.
 * A page emits one FAQPage node, built from exactly these visible questions.
 */
export function collectPageFaqs(page: Pick<PageDoc, 'sections'> | null | undefined): FaqItem[] {
  const seen = new Set<string>()
  const out: FaqItem[] = []
  for (const section of page?.sections ?? []) {
    if (section._type !== 'faqSection') continue
    for (const faq of [...section.faqs, ...section.groups.flatMap((g) => g.faqs)]) {
      const key = faq._id ?? faq._key ?? faq.question
      if (seen.has(key)) continue
      seen.add(key)
      out.push(faq)
    }
  }
  return out
}

/**
 * Turn trust strip items into display values, filling rating, license and year
 * founded from Site settings so they never drift. Empty `items` = the standard
 * strip (rating, license, year founded, then the badges). Facts whose source
 * value is missing are left out.
 */
export function resolveTrustItems(items: TrustItem[] | null | undefined, settings: SiteSettings): ResolvedTrustItem[] {
  const list: TrustItem[] = items?.length
    ? items
    : [
        {_key: 'reviews', fact: 'reviews'},
        {_key: 'license', fact: 'license'},
        {_key: 'founded', fact: 'founded'},
        ...(settings.badges ?? []).map((label, i): TrustItem => ({_key: `badge${i}`, fact: 'custom', label})),
      ]
  const out: ResolvedTrustItem[] = []
  for (const item of list) {
    const base = {key: item._key, fact: item.fact, label: item.label, icon: item.icon}
    if (item.fact === 'reviews') {
      const r = settings.reviewSummary
      if (!r?.ratingValue) continue
      out.push({
        ...base,
        value: r.ratingValue.toFixed(1),
        rating: r.ratingValue,
        reviewCount: r.reviewCount,
        source: r.source,
        href: item.href ?? r.reviewsUrl ?? settings.googleBusinessProfileUrl,
      })
    } else if (item.fact === 'license') {
      if (!settings.rocLicense) continue
      out.push({...base, value: `ROC #${settings.rocLicense}`, href: item.href ?? settings.rocLicenseUrl})
    } else if (item.fact === 'founded') {
      if (!settings.foundingDate) continue
      out.push({...base, value: settings.foundingDate, href: item.href})
    } else if (item.value || item.label) {
      out.push({...base, value: item.value, href: item.href})
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Services

export const getServices = memo(() =>
  fetchQuery<ServiceSummary[]>(
    defineQuery(`*[_type == "service" && defined(slug.current)] | order(coalesce(order, 999) asc, name asc, _id asc)${SERVICE_CARD}`),
  ),
)

export function getService(slug: string) {
  return fetchQuery<ServiceDoc | null>(
    defineQuery(`*[_type == "service" && slug.current == $slug][0]{
      _id, _updatedAt, name, "slug": slug.current, heading, shortDescription, quickAnswer,
      "mainImage": mainImage${IMAGE},
      body${RICH_TEXT},
      "atAGlance": atAGlance[]{_key, label, value, detail},
      signs,
      priceRange,
      ${FAQS},
      "category": category->{name, "slug": slug.current},
      "relatedServices": coalesce(
        relatedServices[]->${SERVICE_CARD},
        *[_type == "service" && category._ref == ^.category._ref && _id != ^._id] | order(coalesce(order, 999) asc, _id asc)[0...4]${SERVICE_CARD}
      ),
      "relatedPosts": coalesce(
        relatedPosts[]->${POST_CARD},
        *[_type == "post" && references(^._id)] | order(publishedAt desc, _id asc)[0...3]${POST_CARD}
      ),
      "reviews": *[_type == "review" && service._ref == ^._id] | order(coalesce(featured, false) desc, date desc, _id asc)[0...6]${REVIEW},
      ${SEO}
    }`),
    {slug},
  )
}

export function getServiceCategories() {
  return fetchQuery<ServiceCategoryDoc[]>(
    defineQuery(`*[_type == "serviceCategory" && defined(slug.current)] | order(name asc, _id asc){
      _id, _updatedAt, name, "slug": slug.current, heading, description${RICH_TEXT},
      "services": *[_type == "service" && category._ref == ^._id] | order(coalesce(order, 999) asc, name asc, _id asc)${SERVICE_CARD},
      ${SEO}
    }`),
  )
}

// ---------------------------------------------------------------------------
// Locations

export const getLocations = memo(() =>
  fetchQuery<LocationDoc[]>(
    defineQuery(`*[_type == "location" && defined(slug.current)] | order(name asc, _id asc){
      _id, _updatedAt, name, "slug": slug.current,
      "shortName": ${CITY_NAME},
      cityNameForSeo, heading, description, cardBlurb,
      "mainImage": mainImage${IMAGE},
      body${RICH_TEXT},
      geo, county, zipCodes, neighborhoods, utilityProviders,
      permitNotes${RICH_TEXT},
      "featuredServices": featuredServices[]->${SERVICE_CARD},
      "nearbyLocations": nearbyLocations[]->${LOCATION_CARD},
      ${FAQS},
      "reviews": *[_type == "review" && location._ref == ^._id] | order(coalesce(featured, false) desc, date desc, _id asc)[0...6]${REVIEW},
      ${SEO}
    }`),
  ),
)

// ---------------------------------------------------------------------------
// Blog

export const getPosts = memo(() =>
  fetchQuery<PostSummary[]>(
    defineQuery(`*[_type == "post" && defined(slug.current) && defined(publishedAt)] | order(publishedAt desc, _id asc)${POST_CARD}`),
  ),
)

export function getPost(slug: string) {
  return fetchQuery<PostDoc | null>(
    defineQuery(`*[_type == "post" && slug.current == $slug][0]{
      _id, _updatedAt, title, "slug": slug.current, excerpt, quickAnswer, publishedAt, updatedAt,
      "mainImage": mainImage${IMAGE},
      body${RICH_TEXT},
      "category": category->{name, "slug": slug.current},
      "author": author->{name, role, "slug": slug.current, credentials, "photo": photo${IMAGE}},
      "reviewedBy": reviewedBy->{name, role, "slug": slug.current, credentials, "photo": photo${IMAGE}},
      "relatedServices": relatedServices[]->${SERVICE_CARD},
      "relatedPosts": *[_type == "post" && _id != ^._id && defined(slug.current) && defined(publishedAt) && references(^.relatedServices[]._ref)]
        | order(publishedAt desc, _id asc)[0...3]${POST_CARD},
      ${FAQS},
      ${SEO}
    }`),
    {slug},
  )
}

/**
 * Every post with the slugs of the services it supports and its body as plain text,
 * built once per build: the CMS templates pick guides from it (a city's guides are the
 * posts that name the city; see lib/cms.ts).
 */
export const getPostIndex = memo(() =>
  fetchQuery<PostIndexEntry[]>(
    defineQuery(`*[_type == "post" && defined(slug.current) && defined(publishedAt)] | order(publishedAt desc, _id asc){
      _id, title, "slug": slug.current, excerpt, publishedAt, featured,
      "mainImage": mainImage${IMAGE},
      "category": category->{name, "slug": slug.current},
      "services": coalesce(relatedServices[]->slug.current, []),
      "text": coalesce(pt::text(body), "")
    }`),
  ),
)

export function getPostCategories() {
  return fetchQuery<PostCategoryDoc[]>(
    defineQuery(`*[_type == "postCategory" && defined(slug.current)] | order(name asc, _id asc){
      _id, _updatedAt, name, "slug": slug.current, description,
      "posts": *[_type == "post" && category._ref == ^._id && defined(publishedAt)] | order(publishedAt desc, _id asc)${POST_CARD},
      ${SEO}
    }`),
  )
}

// ---------------------------------------------------------------------------
// Supporting content

export function getTeam() {
  return fetchQuery<TeamMember[]>(
    defineQuery(`*[_type == "teamMember" && showOnTeamPage != false] | order(coalesce(order, 999) asc, name asc, _id asc)${TEAM_MEMBER}`),
  )
}

export function getFaqs(topic?: string) {
  return fetchQuery<FaqItem[]>(
    defineQuery(`*[_type == "faq" && (!defined($topic) || topic == $topic)] | order(coalesce(order, 999) asc, _id asc){
      _id, question, answer${RICH_TEXT}, topic
    }`),
    {topic: topic ?? null},
  )
}

/** Shared questions (faq documents) tagged with a service (faq.services), in /faq order. */
export function getServiceFaqs(serviceId: string) {
  return fetchQuery<FaqItem[]>(
    defineQuery(`*[_type == "faq" && $id in services[]._ref] | order(coalesce(order, 999) asc, _id asc){
      _id, question, answer${RICH_TEXT}, topic
    }`),
    {id: serviceId},
  )
}

/**
 * Reviews, featured first then newest. `location` and `service` accept a document
 * _id or a slug. `limit` 0 or empty = all.
 */
export async function getReviews(options: {location?: string; service?: string; featuredOnly?: boolean; limit?: number} = {}) {
  const reviews = await fetchQuery<Review[]>(
    defineQuery(`*[_type == "review"
      && (!defined($location) || location._ref == $location || location->slug.current == $location)
      && (!defined($service) || service._ref == $service || service->slug.current == $service)
      && (!$featuredOnly || featured == true)
    ] | order(coalesce(featured, false) desc, date desc, _id asc)${REVIEW}`),
    {location: options.location ?? null, service: options.service ?? null, featuredOnly: options.featuredOnly ?? false},
  )
  return options.limit ? reviews.slice(0, options.limit) : reviews
}

/**
 * Projects (real jobs), newest first. `location` and `service` accept a document
 * _id or a slug. `limit` 0 or empty = all.
 */
export async function getProjects(options: {location?: string; service?: string; limit?: number} = {}) {
  const projects = await fetchQuery<ProjectSummary[]>(
    defineQuery(`*[_type == "project" && defined(slug.current)
      && (!defined($location) || location._ref == $location || location->slug.current == $location)
      && (!defined($service) || $service in services[]._ref || $service in services[]->slug.current)
    ] | order(completedAt desc, _createdAt desc, _id asc)${PROJECT_CARD}`),
    {location: options.location ?? null, service: options.service ?? null},
  )
  return options.limit ? projects.slice(0, options.limit) : projects
}

export function getOpenJobs() {
  return fetchQuery<JobOpening[]>(defineQuery(`*[_type == "jobOpening" && isOpen != false] | order(datePosted desc, _id asc)${JOB}`))
}

/**
 * Every redirect the site serves (the code table in config/redirects.mjs, the posts'
 * old /blog/ paths and enabled `redirect` documents), source → destination, one hop.
 * Content links are rewritten through it so no internal link points at a redirect
 * (lib/links.ts).
 */
export const getRedirectMap = memo(() =>
  fetchQuery<{redirects: Array<{source: string; destination: string}>; postSlugs: string[]}>(
    defineQuery(`{
      "redirects": *[_type == "redirect" && isEnabled != false && defined(source) && defined(destination)]{source, destination},
      "postSlugs": *[_type == "post" && defined(slug.current)].slug.current
    }`),
  ).then(({redirects, postSlugs}) =>
    buildRedirectMap(Object.fromEntries(redirects.map((r) => [r.source.replace(/\/$/, '') || '/', r.destination])), postSlugs),
  ),
)

export type {ImageRef}
