// The navigation model shared by the header (menus and the phone sheet) and the
// footer. Services and cities come from Sanity; the page structure around them
// (About Us, Commercial, Careers, Blog, ...) is the site's information
// architecture and keeps the live anchor texts (docs/DESIGN_SYSTEM.md, "Navigation").
import {getLocations, getServices, getSettings} from './queries'
import {serviceAreaCities, type City} from './cities'
import type {ServiceSummary} from './types'

export interface NavLink {
  label: string
  href: string
}

export interface ServiceGroup {
  /** The category name ("Residential"). */
  label: string
  /** The category page. */
  href: string
  links: NavLink[]
}

export interface NavModel {
  about: NavLink[]
  cities: City[]
  commercial: NavLink
  serviceGroups: ServiceGroup[]
  allServices: NavLink
  careers: NavLink
  blog: NavLink
  /** The footer's "Company" column. */
  company: NavLink[]
}

/** Services grouped by category, groups in the order their first service appears (Site order). */
export function groupServices(services: ServiceSummary[]): ServiceGroup[] {
  const groups = new Map<string, ServiceGroup>()
  for (const s of services) {
    if (!s.category?.slug) continue
    let g = groups.get(s.category.slug)
    if (!g) groups.set(s.category.slug, (g = {label: s.category.name, href: `/services-categories/${s.category.slug}`, links: []}))
    g.links.push({label: s.name, href: `/services/${s.slug}`})
  }
  return [...groups.values()]
}

let model: Promise<NavModel> | undefined

/** Built once per build (every page renders the same chrome). */
export function getNavModel(): Promise<NavModel> {
  model ??= Promise.all([getSettings(), getServices(), getLocations()]).then(([settings, services, locations]) => {
    const about: NavLink[] = [
      {label: 'About Us', href: '/about-us'},
      {label: 'Our Team', href: '/our-team'},
      {label: 'FAQ', href: '/faq'},
      {label: 'Contact Us', href: '/contact-us'},
    ]
    const commercial = {label: 'Commercial', href: '/commercial-electrician'}
    const careers = {label: 'Careers', href: '/careers'}
    const blog = {label: 'Blog', href: '/blog'}
    return {
      about,
      cities: serviceAreaCities(settings.homeCity, locations),
      commercial,
      serviceGroups: groupServices(services),
      allServices: {label: 'All services', href: '/services'},
      careers,
      blog,
      company: [
        {label: 'Home', href: '/'},
        {label: 'About Us', href: '/about-us'},
        {label: 'Our Team', href: '/our-team'},
        commercial,
        {label: 'Services', href: '/services'},
        careers,
        blog,
        {label: 'FAQ', href: '/faq'},
        {label: 'Contact Us', href: '/contact-us'},
      ],
    }
  })
  return model
}

