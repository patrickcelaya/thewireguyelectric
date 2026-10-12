// GROQ queries and typed fetchers. Every page's data comes through here.
import {defineQuery} from 'groq'
import {fetchQuery} from './sanity'
import type {
  FaqItem,
  ImageRef,
  JobOpening,
  LocationDoc,
  PageDoc,
  PostCategoryDoc,
  PostDoc,
  PostSummary,
  Review,
  ServiceCategoryDoc,
  ServiceDoc,
  ServiceSummary,
  SiteSettings,
  TeamMember,
} from './types'

const IMAGE = /* groq */ `{
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

const SERVICE_CARD = /* groq */ `{
  _id,
  name,
  "slug": slug.current,
  shortDescription,
  "mainImage": mainImage${IMAGE},
  "category": category->{name, "slug": slug.current}
}`

const POST_CARD = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  featured,
  "mainImage": mainImage${IMAGE},
  "category": category->{name, "slug": slug.current}
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
      "founders": founders[]->{name, role},
      "addresses": addresses[]{..., "locationSlug": locationPage->slug.current},
      "serviceAreas": serviceAreas[]->{name, "slug": slug.current, geo}
    }`),
  ).then((s) => {
    if (!s) throw new Error('siteSettings document is missing')
    return s
  })
  return settingsPromise
}

// ---------------------------------------------------------------------------
// Pages

export function getPage(slug: string) {
  return fetchQuery<PageDoc | null>(
    defineQuery(`*[_type == "page" && slug.current == $slug][0]{
      _id, _updatedAt, title, "slug": slug.current, heading, intro,
      sections[]{
        ...,
        _type == "heroSection" => {..., "image": image${IMAGE}},
        _type == "mediaTextSection" => {..., "image": image${IMAGE}, body${RICH_TEXT}},
        _type == "richTextSection" => {..., body${RICH_TEXT}},
        _type == "servicesSection" => {..., "services": services[]->${SERVICE_CARD}, "category": category->{"slug": slug.current}},
        _type == "reviewsSection" => {..., "reviews": reviews[]->},
        _type == "faqSection" => {..., "faqs": faqs[]->{_id, question, answer${RICH_TEXT}}}
      },
      ${SEO}
    }`),
    {slug},
  )
}

export function getPageSlugs() {
  return fetchQuery<string[]>(defineQuery(`*[_type == "page" && defined(slug.current)].slug.current`))
}

// ---------------------------------------------------------------------------
// Services

export const getServices = memo(() =>
  fetchQuery<ServiceSummary[]>(
    defineQuery(`*[_type == "service" && defined(slug.current)] | order(coalesce(order, 999) asc, name asc)${SERVICE_CARD}`),
  ),
)

export function getService(slug: string) {
  return fetchQuery<ServiceDoc | null>(
    defineQuery(`*[_type == "service" && slug.current == $slug][0]{
      _id, _updatedAt, name, "slug": slug.current, heading, shortDescription,
      "mainImage": mainImage${IMAGE},
      body${RICH_TEXT},
      priceRange,
      ${FAQS},
      "category": category->{name, "slug": slug.current},
      "relatedServices": coalesce(
        relatedServices[]->${SERVICE_CARD},
        *[_type == "service" && category._ref == ^.category._ref && _id != ^._id] | order(coalesce(order, 999) asc)[0...4]${SERVICE_CARD}
      ),
      "relatedPosts": coalesce(
        relatedPosts[]->${POST_CARD},
        *[_type == "post" && references(^._id)] | order(publishedAt desc)[0...3]${POST_CARD}
      ),
      ${SEO}
    }`),
    {slug},
  )
}

export function getServiceCategories() {
  return fetchQuery<ServiceCategoryDoc[]>(
    defineQuery(`*[_type == "serviceCategory" && defined(slug.current)] | order(name asc){
      _id, _updatedAt, name, "slug": slug.current, heading, description${RICH_TEXT},
      "services": *[_type == "service" && category._ref == ^._id] | order(coalesce(order, 999) asc, name asc)${SERVICE_CARD},
      ${SEO}
    }`),
  )
}

// ---------------------------------------------------------------------------
// Locations

export const getLocations = memo(() =>
  fetchQuery<LocationDoc[]>(
    defineQuery(`*[_type == "location" && defined(slug.current)] | order(name asc){
      _id, _updatedAt, name, "slug": slug.current, cityNameForSeo, heading, description,
      "mainImage": mainImage${IMAGE},
      body${RICH_TEXT},
      geo, county, zipCodes, neighborhoods, utilityProviders,
      permitNotes${RICH_TEXT},
      "featuredServices": featuredServices[]->${SERVICE_CARD},
      ${FAQS},
      "reviews": *[_type == "review" && location._ref == ^._id] | order(date desc)[0...6]{_id, authorName, rating, text, date, source},
      ${SEO}
    }`),
  ),
)

// ---------------------------------------------------------------------------
// Blog

export const getPosts = memo(() =>
  fetchQuery<PostSummary[]>(
    defineQuery(`*[_type == "post" && defined(slug.current) && defined(publishedAt)] | order(publishedAt desc)${POST_CARD}`),
  ),
)

export function getPost(slug: string) {
  return fetchQuery<PostDoc | null>(
    defineQuery(`*[_type == "post" && slug.current == $slug][0]{
      _id, _updatedAt, title, "slug": slug.current, excerpt, publishedAt, updatedAt,
      "mainImage": mainImage${IMAGE},
      body${RICH_TEXT},
      "category": category->{name, "slug": slug.current},
      "author": author->{name, role, "slug": slug.current, credentials, "photo": photo${IMAGE}},
      "reviewedBy": reviewedBy->{name, role},
      "relatedServices": relatedServices[]->${SERVICE_CARD},
      ${FAQS},
      ${SEO}
    }`),
    {slug},
  )
}

export function getPostCategories() {
  return fetchQuery<PostCategoryDoc[]>(
    defineQuery(`*[_type == "postCategory" && defined(slug.current)] | order(name asc){
      _id, _updatedAt, name, "slug": slug.current, description,
      "posts": *[_type == "post" && category._ref == ^._id && defined(publishedAt)] | order(publishedAt desc)${POST_CARD},
      ${SEO}
    }`),
  )
}

// ---------------------------------------------------------------------------
// Supporting content

export function getTeam() {
  return fetchQuery<TeamMember[]>(
    defineQuery(`*[_type == "teamMember" && showOnTeamPage != false] | order(coalesce(order, 999) asc, name asc){
      _id, name, role, credentials, yearsExperience, bio${RICH_TEXT}, "photo": photo${IMAGE}
    }`),
  )
}

export function getFaqs(topic?: string) {
  return fetchQuery<FaqItem[]>(
    defineQuery(`*[_type == "faq" && (!defined($topic) || topic == $topic)] | order(coalesce(order, 999) asc){
      _id, question, answer${RICH_TEXT}, topic
    }`),
    {topic: topic ?? null},
  )
}

export function getFeaturedReviews(limit = 6) {
  return fetchQuery<Review[]>(
    defineQuery(`*[_type == "review"] | order(featured desc, date desc)[0...12]{_id, authorName, rating, text, date, source, "location": location->name}`),
  ).then((r) => r.slice(0, limit))
}

export function getOpenJobs() {
  return fetchQuery<JobOpening[]>(
    defineQuery(`*[_type == "jobOpening" && isOpen != false] | order(datePosted desc){
      _id, title, description${RICH_TEXT}, employmentType, datePosted, validThrough, baseSalary
    }`),
  )
}

export type {ImageRef}
