// Shapes returned by the queries in ./queries.ts. (Replace with Sanity TypeGen
// output once the project exists: `pnpm --filter studio typegen`.)

export type PortableTextValue = Array<{_type: string; _key: string; [key: string]: unknown}>

export interface ImageRef {
  alt?: string
  caption?: string
  crop?: {top: number; bottom: number; left: number; right: number}
  hotspot?: {x: number; y: number; width: number; height: number}
  asset?: {_id: string; url: string; metadata?: {lqip?: string; dimensions?: {width: number; height: number}}} | null
  /** Pre-import only: "image@<webflow cdn url>" */
  legacyUrl?: string
}

export interface Seo {
  title?: string
  description?: string
  noIndex?: boolean
  ogImage?: ImageRef
}

export interface LinkItem {
  label: string
  href: string
}

export interface PostalAddress {
  label?: string
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
  geo?: {lat: number; lng: number}
  googleMapsUrl?: string
  gbpName?: string
  /** Slug of the city page this office's Google Business Profile links to. */
  locationSlug?: string
  phone?: string
  appointmentOnly?: boolean
}

export interface SiteSettings {
  businessName: string
  legalName?: string
  tagline?: string
  description?: string
  phone: string
  phoneE164: string
  email?: string
  addresses?: PostalAddress[]
  openingHours?: Array<{days: string[]; opens: string; closes: string}>
  emergencyService?: boolean
  priceRange?: string
  foundingDate?: string
  founders?: Array<{name: string; role?: string}>
  rocLicense?: string
  reviewSummary?: {ratingValue?: number; reviewCount?: number; source?: string; reviewsUrl?: string}
  badges?: string[]
  sameAs?: string[]
  serviceAreas?: Array<{name: string; slug: string; geo?: {lat: number; lng: number}}>
  sisterCompanies?: LinkItem[]
  logo?: ImageRef
  headerNav?: LinkItem[]
  footerNav?: LinkItem[]
  primaryCta?: LinkItem
  titleSuffix?: string
  defaultOgImage?: ImageRef
  ga4MeasurementId?: string
  googleSiteVerification?: string
}

export interface FaqItem {
  _id?: string
  _key?: string
  question: string
  answer: PortableTextValue
  topic?: string
}

export interface Review {
  _id: string
  authorName: string
  rating: number
  text: string
  date?: string
  source?: string
  location?: string
}

export interface ServiceSummary {
  _id: string
  name: string
  slug: string
  shortDescription?: string
  mainImage?: ImageRef
  category?: {name: string; slug: string}
}

export interface PostSummary {
  _id: string
  title: string
  slug: string
  excerpt?: string
  publishedAt: string
  featured?: boolean
  mainImage?: ImageRef
  category?: {name: string; slug: string}
}

export interface ServiceDoc extends ServiceSummary {
  _updatedAt: string
  heading?: string
  body?: PortableTextValue
  priceRange?: {low?: number; high?: number; note?: string}
  faqs?: FaqItem[]
  relatedServices?: ServiceSummary[]
  relatedPosts?: PostSummary[]
  seo?: Seo
}

export interface ServiceCategoryDoc {
  _id: string
  _updatedAt: string
  name: string
  slug: string
  heading?: string
  description?: PortableTextValue
  services: ServiceSummary[]
  seo?: Seo
}

export interface LocationDoc {
  _id: string
  _updatedAt: string
  name: string
  slug: string
  cityNameForSeo?: string
  heading?: string
  description?: string
  mainImage?: ImageRef
  body?: PortableTextValue
  geo?: {lat: number; lng: number}
  county?: string
  zipCodes?: string[]
  neighborhoods?: string[]
  utilityProviders?: string[]
  permitNotes?: PortableTextValue
  featuredServices?: ServiceSummary[]
  faqs?: FaqItem[]
  reviews?: Review[]
  seo?: Seo
}

export interface PostDoc extends PostSummary {
  _updatedAt: string
  updatedAt?: string
  body?: PortableTextValue
  author?: {name: string; role?: string; slug?: string; credentials?: string[]; photo?: ImageRef}
  reviewedBy?: {name: string; role?: string}
  relatedServices?: ServiceSummary[]
  faqs?: FaqItem[]
  seo?: Seo
}

export interface PostCategoryDoc {
  _id: string
  _updatedAt: string
  name: string
  slug: string
  description?: string
  posts: PostSummary[]
  seo?: Seo
}

export interface TeamMember {
  _id: string
  name: string
  role?: string
  credentials?: string[]
  yearsExperience?: number
  bio?: PortableTextValue
  photo?: ImageRef
}

export interface JobOpening {
  _id: string
  title: string
  description: PortableTextValue
  employmentType?: string
  datePosted: string
  validThrough?: string
  baseSalary?: {min?: number; max?: number; unit?: string}
}

export type PageSection = {_type: string; _key: string; [key: string]: any}

export interface PageDoc {
  _id: string
  _updatedAt: string
  title: string
  slug: string
  heading?: string
  intro?: string
  sections?: PageSection[]
  seo?: Seo
}
