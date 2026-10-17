// Shapes returned by the queries in ./queries.ts. (Replace with Sanity TypeGen
// output once the project exists: `pnpm --filter studio typegen`.)
//
// Conventions: optional fields may also come back as `null` from GROQ when the
// document has no value; lists that a section renders are always arrays (empty
// when there is nothing to show, and an empty list means "render nothing").
// See docs/CONTENT_MODEL.md for what every field is for.

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

/** A link target: a document's display name and slug. For a location, `name` is the bare city ("Gilbert"). */
export interface NamedLink {
  name: string
  slug: string
}

/** Icon tokens from the Studio's icon list; the design maps each to artwork. */
export type IconName =
  | 'bolt'
  | 'bulb'
  | 'plug'
  | 'panel'
  | 'evCharger'
  | 'wrench'
  | 'check'
  | 'shield'
  | 'badge'
  | 'star'
  | 'dollar'
  | 'clock'
  | 'calendar'
  | 'clipboard'
  | 'document'
  | 'home'
  | 'building'
  | 'users'
  | 'heart'
  | 'thumbsUp'
  | 'phone'
  | 'pin'

export interface PostalAddress {
  _key?: string
  label?: string
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
  geo?: {lat: number; lng: number}
  googleMapsUrl?: string
  /** Text of the footer link to googleMapsUrl (the live footer's wording); empty = the formatted address. */
  mapLinkText?: string
  gbpName?: string
  /** Slug of the city page this office's Google Business Profile links to. */
  locationSlug?: string
  phone?: string
  appointmentOnly?: boolean
  /** Footer and structured data only; never office cards, contact details or maps (a home address). */
  footerOnly?: boolean
}

export interface OpeningHours {
  days: string[]
  opens: string
  closes: string
}

/** callToAction object: CTA bands, Site settings → CTA band, inline rich-text CTAs. */
export interface CallToAction {
  heading?: string
  text?: string
  label?: string
  href?: string
  /** Short status line near the button, e.g. "Free estimates available". */
  statusText?: string
}

/** A short quote from a real review (hero quotes). */
export interface ReviewSnippet {
  _key?: string
  text: string
  /** Rating of the original review, when known. Prefer `review.rating` when a review is linked. */
  rating?: number | null
  review?: Review | null
}

/** featureItem object: a value prop card or a capability checklist item. */
export interface FeatureItem {
  _key?: string
  title: string
  text?: string
  icon?: IconName
  /** When set, the title links to /services/<slug>. */
  service?: NamedLink | null
  /** Optional text link under the item. */
  link?: LinkItem | null
}

/** Site settings → Home city: Mesa, which is the homepage rather than a location document. */
export interface HomeCity {
  name?: string
  cardBlurb?: string
  image?: ImageRef | null
  neighborhoods?: string[]
  county?: string
  utilityProviders?: string[]
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
  openingHours?: OpeningHours[]
  emergencyService?: boolean
  /** Honest hours / urgent-help line shown near phone numbers and forms. */
  availabilityNote?: string
  priceRange?: string
  foundingDate?: string
  founders?: Array<{name: string; role?: string}>
  rocLicense?: string
  /** Public AZ ROC lookup page for the license. */
  rocLicenseUrl?: string
  /** The main (Mesa) Google Business Profile. */
  googleBusinessProfileUrl?: string
  reviewSummary?: {ratingValue?: number; reviewCount?: number; source?: string; reviewsUrl?: string}
  badges?: string[]
  /** Shared hero quotes (city pages and any template without its own). */
  heroQuotes?: ReviewSnippet[] | null
  sameAs?: string[]
  /** `name` is the stored name (some still hold the full H1); `shortName` is the bare city. */
  serviceAreas?: Array<{name: string; slug: string; shortName: string; geo?: {lat: number; lng: number}}>
  homeCity?: HomeCity | null
  sisterCompanies?: LinkItem[]
  logo?: ImageRef
  headerNav?: LinkItem[]
  footerNav?: LinkItem[]
  primaryCta?: LinkItem
  /** Shared closing CTA band. */
  ctaBand?: CallToAction | null
  /** Shared "why choose us" items. */
  valueProps?: FeatureItem[] | null
  /** Shared "what we do" checklist items. */
  capabilities?: FeatureItem[] | null
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
  sourceUrl?: string
  featured?: boolean
  /** Bare city name of the review ("Gilbert"), when tagged. */
  location?: string
  locationSlug?: string
  /** Service name of the review, when tagged. */
  service?: string
  serviceSlug?: string
}

export interface ServiceSummary {
  _id: string
  name: string
  slug: string
  shortDescription?: string
  mainImage?: ImageRef
  category?: {name: string; slug: string}
}

/** A service card in a section: the service plus the card's display text (per-card overrides already applied). */
export interface ServiceCard extends ServiceSummary {
  _key?: string
  /** Card title: the custom title, else the service name. */
  title: string
  /** Card text: the custom blurb, else the short description. */
  text?: string
  /** Card image: the custom image, else the main image. */
  image?: ImageRef | null
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
  /** The service page the post supports (its first related service), when it has one. */
  service?: NamedLink | null
}

export interface LocationSummary {
  _id: string
  /** City name as stored (should be the bare city; see shortName). */
  name: string
  slug: string
  /** Bare city name for chips, breadcrumbs and cards ("Gilbert"), derived from cityNameForSeo when set. */
  shortName: string
  cityNameForSeo?: string
  cardBlurb?: string
  description?: string
  neighborhoods?: string[]
  mainImage?: ImageRef | null
  geo?: {lat: number; lng: number} | null
}

export interface TeamMemberSummary {
  _id: string
  name: string
  role?: string
  slug?: string
  photo?: ImageRef | null
}

export interface ServiceDoc extends ServiceSummary {
  _updatedAt: string
  heading?: string
  body?: PortableTextValue
  /** The answer-first line of the "short version" block (falls back to a line about the business). */
  quickAnswer?: string | null
  /** Short label/value facts for the "At a glance" block, each with an optional supporting line. */
  atAGlance?: Array<{_key: string; label: string; value: string; detail?: string | null}> | null
  /** "Signs you need this" checklist. */
  signs?: string[] | null
  /** `asOf` is the date the range was last checked (show "as of {month year}"). */
  priceRange?: {low?: number; high?: number; note?: string; asOf?: string}
  faqs?: FaqItem[]
  relatedServices?: ServiceSummary[]
  relatedPosts?: PostSummary[]
  /** Reviews tagged with this service, featured first (max 6). */
  reviews?: Review[]
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
  /** Bare city name ("Gilbert"); see LocationSummary.shortName. */
  shortName: string
  cityNameForSeo?: string
  heading?: string
  description?: string
  cardBlurb?: string
  mainImage?: ImageRef
  body?: PortableTextValue
  geo?: {lat: number; lng: number}
  county?: string
  zipCodes?: string[]
  neighborhoods?: string[]
  utilityProviders?: string[]
  permitNotes?: PortableTextValue
  featuredServices?: ServiceSummary[]
  /** Picked neighboring cities; null/empty means "list all other cities". */
  nearbyLocations?: LocationSummary[] | null
  faqs?: FaqItem[]
  /** Reviews tagged with this city, featured first (max 6). */
  reviews?: Review[]
  seo?: Seo
}

export interface PostDoc extends PostSummary {
  _updatedAt: string
  updatedAt?: string
  /** 40–60 word answer-first summary shown above the body. */
  quickAnswer?: string
  body?: PortableTextValue
  author?: {name: string; role?: string; slug?: string; credentials?: string[]; photo?: ImageRef}
  reviewedBy?: {name: string; role?: string; slug?: string; credentials?: string[]; photo?: ImageRef}
  /** The first one is the post's primary (hub) service. */
  relatedServices?: ServiceSummary[]
  /** Other posts that support the same services, newest first (max 3). */
  relatedPosts?: PostSummary[]
  faqs?: FaqItem[]
  seo?: Seo
}

/** A post with the slugs of the services it supports and its body as plain text (getPostIndex). */
export interface PostIndexEntry extends PostSummary {
  services: string[]
  text: string
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
  slug?: string
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

/** A project photo (gallery) with alt text. */
export interface GalleryPhoto extends ImageRef {
  _key: string
}

export interface ProjectSummary {
  _id: string
  title: string
  slug: string
  summary?: string
  completedAt?: string
  neighborhood?: string
  mainImage?: ImageRef | null
  gallery?: GalleryPhoto[] | null
  location?: {name: string; slug: string; shortName: string} | null
  services?: NamedLink[] | null
  review?: Review | null
}

// ---------------------------------------------------------------------------
// Page builder sections (studio/schemaTypes/sections). Every section has _type
// and _key. Headings render as H2; the page H1 always comes from page.heading.

interface SectionBase {
  _key: string
}

export interface HeroSection extends SectionBase {
  _type: 'heroSection'
  eyebrow?: string
  /** @deprecated Ignored: the H1 always comes from page.heading. */
  heading?: string
  /** Words of page.heading to highlight. */
  headingAccent?: string
  text?: string
  image?: ImageRef | null
  primaryCta?: LinkItem | null
  secondaryCta?: LinkItem | null
  /** Short phrases under the buttons ("Free estimates and flat-rate pricing."). */
  ctaNotes?: string[] | null
  showPhone?: boolean
  trustLine?: string
  showTrustBar?: boolean
  reviewSnippets: ReviewSnippet[]
}

export interface RichTextSection extends SectionBase {
  _type: 'richTextSection'
  heading?: string
  body?: PortableTextValue
}

export interface MediaTextSection extends SectionBase {
  _type: 'mediaTextSection'
  heading?: string
  body?: PortableTextValue
  image?: ImageRef | null
  imagePosition?: 'left' | 'right'
  cta?: LinkItem | null
}

export interface ServiceCategoryGroup {
  _id: string
  name: string
  slug: string
  heading?: string
  description?: PortableTextValue | null
  /** This group's cards, in the section's order. */
  services: ServiceCard[]
}

export interface ServicesSection extends SectionBase {
  _type: 'servicesSection'
  eyebrow?: string
  heading?: string
  headingAccent?: string
  intro?: string
  layout?: 'featured' | 'grid' | 'grouped'
  category?: NamedLink | null
  /** Picked cards, else the category's services, else every service (site order). */
  services: ServiceCard[]
  /** Only for layout "grouped": the cards grouped by category, in order of first appearance. */
  groups?: ServiceCategoryGroup[]
  cta?: LinkItem | null
}

export interface LocationsSection extends SectionBase {
  _type: 'locationsSection'
  eyebrow?: string
  heading?: string
  headingAccent?: string
  intro?: string
  /** Picked cities, else every city. */
  locations: LocationSummary[]
  includeHomeCity?: boolean
  /** Mesa (links to /), when includeHomeCity is not false. */
  homeCity?: HomeCity | null
}

export interface ReviewsSection extends SectionBase {
  _type: 'reviewsSection'
  eyebrow?: string
  heading?: string
  headingAccent?: string
  intro?: string
  /** Picked reviews (all of them, in order), else reviews matching the city/service filters, featured first, with `limit` applied (default 6, 0 = all). */
  reviews: Review[]
  location?: NamedLink | null
  service?: NamedLink | null
  limit?: number
  cta?: LinkItem | null
}

export interface FaqGroup {
  _key: string
  heading: string
  topic?: string
  faqs: FaqItem[]
}

export interface FaqSection extends SectionBase {
  _type: 'faqSection'
  eyebrow?: string
  heading?: string
  intro?: string
  image?: ImageRef | null
  topic?: string
  /** Picked questions, else every question with `topic`. */
  faqs: FaqItem[]
  groups: FaqGroup[]
}

export interface TeamSection extends SectionBase {
  _type: 'teamSection'
  eyebrow?: string
  heading?: string
  intro?: string
  /** Picked people, else everyone shown on the team page. */
  members: TeamMember[]
  showBios?: boolean
  cta?: LinkItem | null
}

/** A post as a card in a section: the summary plus the card's own cover, when the editor gave it one. */
export interface PostCard extends PostSummary {
  _key?: string
  /** The topic pill on the cover (else the post's category). */
  label?: string
  /** A few words set large on the cover. */
  coverWords?: string
  /** A cover photo for this card (else the post's main image). */
  cover?: ImageRef | null
}

export interface PostsSection extends SectionBase {
  _type: 'postsSection'
  eyebrow?: string
  heading?: string
  intro?: string
  /** Picked posts (all of them, in order), else the newest posts (in `category`, featured first when asked) with `limit` applied (default 3, 0 = all). */
  posts: PostCard[]
  category?: NamedLink | null
  featuredFirst?: boolean
  limit?: number
  /** "byService": every post under the service it supports, each group linking to that service page (the blog). Default "cards". */
  layout?: 'cards' | 'byService'
  cta?: LinkItem | null
}

export interface JobsSection extends SectionBase {
  _type: 'jobsSection'
  heading?: string
  intro?: string
  /** Open positions; hide the section when empty. */
  jobs: JobOpening[]
}

export type ContactDetail = 'phone' | 'email' | 'offices' | 'hours'

export interface ContactSection extends SectionBase {
  _type: 'contactSection'
  eyebrow?: string
  heading?: string
  text?: string
  detailsHeading?: string
  /** Which details from Site settings to show beside the form. */
  contactDetails?: ContactDetail[]
  formType?: 'estimate' | 'careers'
  formHeading?: string
  submitLabel?: string
  successMessage?: string
}

export interface CtaSection extends SectionBase {
  _type: 'ctaSection'
  /** The section's own CTA when it has a heading, else Site settings → CTA band. */
  cta: CallToAction | null
}

export type TrustFact = 'custom' | 'reviews' | 'license' | 'founded'

export interface TrustItem {
  _key: string
  fact: TrustFact
  value?: string
  label?: string
  href?: string
  icon?: IconName
}

export interface TrustBarSection extends SectionBase {
  _type: 'trustBarSection'
  /** Empty = the standard strip. Use resolveTrustItems() to turn these into display values. */
  items: TrustItem[]
}

/** A trust fact with its value filled in from Site settings (see resolveTrustItems). */
export interface ResolvedTrustItem {
  key: string
  fact: TrustFact
  /** Emphasized part, e.g. "5.0", "ROC #365306", "2017", "2-year". */
  value?: string
  label?: string
  href?: string
  icon?: IconName
  /** For fact "reviews". */
  rating?: number
  reviewCount?: number
  source?: string
}

export interface FeatureGridSection extends SectionBase {
  _type: 'featureGridSection'
  eyebrow?: string
  heading?: string
  headingAccent?: string
  intro?: string
  style?: 'cards' | 'checklist'
  siteList?: 'valueProps' | 'capabilities'
  /** The section's items, or the shared list from Site settings when siteList is set. */
  items: FeatureItem[]
  cta?: LinkItem | null
  /** Background photo (the checklist style). */
  image?: ImageRef | null
}

/** A teamMemberMention mark definition with its member resolved. */
export interface TeamMemberMention {
  _key: string
  _type: 'teamMemberMention'
  member: TeamMemberSummary | null
}

export interface TeamIntroSection extends SectionBase {
  _type: 'teamIntroSection'
  eyebrow?: string
  heading?: string
  headingAccent?: string
  /** Start with one sentence about the business, written from Site settings (lib/site.ts businessSummary). */
  showSummary?: boolean
  /** Portable Text; markDefs of _type "teamMemberMention" carry a resolved `member`. */
  body: PortableTextValue
  /** One photo of the crew at work (alt and caption). */
  image?: ImageRef | null
  /** Picked people, else the people mentioned in the text (deduplicated, in order). */
  people: TeamMemberSummary[]
  cta?: LinkItem | null
  /** A text link beside the button. */
  secondaryCta?: LinkItem | null
}

export interface QuoteSection extends SectionBase {
  _type: 'quoteSection'
  eyebrow?: string
  heading?: string
  subheading?: string
  quote: string
  person?: TeamMemberSummary | null
  /** The customer review the quote is an excerpt of (instead of a team member). */
  review?: Review | null
  image?: ImageRef | null
}

export interface GalleryImage extends ImageRef {
  _key: string
  service?: NamedLink | null
  location?: NamedLink | null
}

export interface GallerySection extends SectionBase {
  _type: 'gallerySection'
  eyebrow?: string
  heading?: string
  headingAccent?: string
  intro?: string
  images: GalleryImage[]
  projects: ProjectSummary[]
  cta?: LinkItem | null
}

export interface OfficeLocationsSection extends SectionBase {
  _type: 'officeLocationsSection'
  eyebrow?: string
  heading?: string
  intro?: string
  /** The chosen offices from Site settings → Addresses (all when none were picked). */
  offices: PostalAddress[]
}

export interface ProcessStep {
  _key: string
  title: string
  text?: string
  /** Add the phone number and office hours from Site settings, and the estimate link. */
  showContact?: boolean
  icon?: IconName
}

export interface ProcessStepsSection extends SectionBase {
  _type: 'processStepsSection'
  eyebrow?: string
  heading?: string
  headingAccent?: string
  intro?: string
  steps: ProcessStep[]
  cta?: LinkItem | null
}

export interface PriceRow {
  _key: string
  label: string
  /** The row's price, else the linked service's priceRange. Skip rows where either is missing. */
  low?: number | null
  high?: number | null
  unit?: string
  note?: string
  service?: NamedLink | null
  guide?: {title: string; slug: string} | null
}

export interface PriceGuideSection extends SectionBase {
  _type: 'priceGuideSection'
  heading?: string
  intro?: string
  rows: PriceRow[]
  disclaimer?: string
  /** Date the prices were checked (YYYY-MM-DD); show "Prices as of {month year}". */
  asOf?: string
}

export interface HighlightItem {
  _key: string
  lead?: string
  text?: string
}

export interface HighlightsSection extends SectionBase {
  _type: 'highlightsSection'
  eyebrow?: string
  heading?: string
  checklist: HighlightItem[]
  cta?: LinkItem | null
  image?: ImageRef | null
  asideHeading?: string
  asideBody?: PortableTextValue | null
}

export type PageSection =
  | HeroSection
  | RichTextSection
  | MediaTextSection
  | ServicesSection
  | LocationsSection
  | ReviewsSection
  | FaqSection
  | TeamSection
  | PostsSection
  | JobsSection
  | ContactSection
  | CtaSection
  | TrustBarSection
  | FeatureGridSection
  | TeamIntroSection
  | QuoteSection
  | GallerySection
  | OfficeLocationsSection
  | ProcessStepsSection
  | PriceGuideSection
  | HighlightsSection

export type PageSectionType = PageSection['_type']

/** The section type for a given _type, e.g. SectionOf<'heroSection'>. */
export type SectionOf<T extends PageSectionType> = Extract<PageSection, {_type: T}>

export interface PageDoc {
  _id: string
  _updatedAt: string
  title: string
  slug: string
  /** The page H1. Never render a section heading as the H1. */
  heading?: string
  intro?: string
  sections?: PageSection[]
  seo?: Seo
}
