// The offices as body content shows them (contact blocks, office cards). Every
// address comes from Site settings; an address marked `footerOnly` (the owners'
// home in Mesa) is never shown here: it stays in the footer and the structured data.
import type {PostalAddress, SiteSettings} from './types'

/** The offices body content may show, in Site settings order. */
export function visibleOffices(addresses: PostalAddress[] | null | undefined): PostalAddress[] {
  return (addresses ?? []).filter((a) => !a.footerOnly && (a.streetAddress || a.addressLocality))
}

/** "The Wire Guy Electric of Scottsdale": the office's profile name, else its label (cards add "(by appointment)"). */
export function officeName(office: PostalAddress, settings: SiteSettings) {
  return office.gbpName ?? office.label ?? `${settings.businessName}, ${office.addressLocality}`
}

/** The address as two lines: the street, then "Scottsdale, AZ 85260". */
export function addressLines(office: PostalAddress): string[] {
  const place = [office.addressLocality, [office.addressRegion, office.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [office.streetAddress, place].filter((line): line is string => Boolean(line))
}
