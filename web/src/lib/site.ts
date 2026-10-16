// Display values for the site chrome (header, footer, call bar, trust lines),
// derived from Site settings so NAP, hours, rating and licence never drift.
import type {PostalAddress, SiteSettings} from './types'
import {formatHours, nextOpening} from './hours'

/**
 * Every "Free Estimate" link goes to the estimate page (owner rule). It is a code
 * route, so its path lives here rather than in Sanity.
 */
export const ESTIMATE_PATH = '/estimate'

/** Appended to the text of every link that opens a new tab (screen readers). */
export const NEW_TAB_NOTE = ' (opens in a new tab)'

export function telHref(settings: SiteSettings) {
  return `tel:${settings.phoneE164}`
}

export interface Rating {
  /** "5.0" */
  value: string
  /** "380+" */
  count?: string
  /** "Google" */
  source: string
  href?: string
}

/** The rating as shown ("5.0 from 380+ Google reviews"), or undefined when Site settings has none. */
export function siteRating(settings: SiteSettings): Rating | undefined {
  const r = settings.reviewSummary
  if (!r?.ratingValue) return undefined
  return {
    value: r.ratingValue.toFixed(1),
    count: r.reviewCount ? `${r.reviewCount}+` : undefined,
    source: r.source || 'Google',
    href: r.reviewsUrl || settings.googleBusinessProfileUrl,
  }
}

/** "from 380+ Google reviews" */
export function ratingSummary(rating: Rating) {
  return rating.count ? `from ${rating.count} ${rating.source} reviews` : `on ${rating.source}`
}

export function licence(settings: SiteSettings) {
  return settings.rocLicense ? {number: `ROC #${settings.rocLicense}`, href: settings.rocLicenseUrl} : undefined
}

export function officeHours(settings: SiteSettings) {
  return {
    /** "Mon – Fri, 9 am – 5 pm" */
    line: formatHours(settings.openingHours),
    /** "Mon - Fri: 9 am - 5 pm" */
    footer: formatHours(settings.openingHours, 'footer'),
    /** "Monday to Friday, 9 am to 5 pm" */
    prose: formatHours(settings.openingHours, 'prose'),
    next: nextOpening(settings.openingHours),
  }
}

/** Social and directory profiles from Site settings → sameAs, by network. */
export function profiles(settings: SiteSettings) {
  const find = (host: RegExp) => settings.sameAs?.find((u) => host.test(u))
  return {facebook: find(/facebook\.com/i), instagram: find(/instagram\.com/i), bbb: find(/bbb\.org/i), yelp: find(/yelp\.com/i)}
}

/** Brand art for the sister companies (static files in public/img), keyed by their site's host. */
const SISTER_LOGOS: Record<string, string> = {
  'thecoolingguyhvac.com': 'cooling',
  'thewaterguyplumbing.com': 'water',
}

export interface SisterBrand {
  label: string
  href: string
  logo?: {src: string; srcset: string; width: number; height: number}
}

export function sisterBrands(settings: SiteSettings): SisterBrand[] {
  return (settings.sisterCompanies ?? [])
    .filter((s) => s.label && s.href)
    .map((s) => {
      const host = new URL(s.href).hostname.replace(/^www\./, '')
      const key = SISTER_LOGOS[host]
      return {
        label: s.label,
        href: s.href,
        logo: key ? {src: `/img/sister-${key}-396.webp`, srcset: `/img/sister-${key}-264.webp 264w, /img/sister-${key}-396.webp 396w`, width: 132, height: 119} : undefined,
      }
    })
}

/** "1321 N 65th St, Mesa, AZ 85205" */
export function formatAddress(a: PostalAddress) {
  return [a.streetAddress, a.addressLocality, [a.addressRegion, a.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

/**
 * The footer's office links: every address in Site settings (the home address
 * included: the footer is the one place it shows), each linked to its Google
 * Business Profile with the live footer's wording.
 */
export function footerOffices(settings: SiteSettings) {
  return (settings.addresses ?? [])
    .filter((a) => a.streetAddress || a.mapLinkText)
    .map((a) => ({
      key: a._key ?? a.addressLocality ?? a.streetAddress,
      /** Offices with their own profile name carry it, with "(by appointment)" when that applies. */
      name: a.gbpName ? `${a.gbpName}${a.appointmentOnly ? ' (by appointment)' : ''}` : undefined,
      text: a.mapLinkText || `${formatAddress(a)}${a.addressLocality ? ` - ${a.addressLocality} Location` : ''}`,
      href: a.googleMapsUrl,
    }))
}
