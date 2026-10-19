// How a page's sections are laid out (components/sections/SectionRenderer.astro):
// which ones render and which share a band.
import type {PageSection, SectionOf, SiteSettings} from './types'
import {ESTIMATE_PATH} from './site'
import {visibleOffices} from './offices'
import {currentJobs} from './jobs'

/** One thing the renderer draws: a section, or the questions-and-guides band (a blog archive by service is a section of its own). */
export type SectionPlanItem =
  | {kind: 'section'; section: PageSection}
  | {
      kind: 'answers'
      faq?: SectionOf<'faqSection'>
      posts?: SectionOf<'postsSection'>
    }

/** True when a section has nothing to show: it renders nothing. */
export function isEmptySection(section: PageSection): boolean {
  switch (section._type) {
    case 'heroSection':
      return false
    case 'teamIntroSection':
      return !section.body.length
    case 'featureGridSection':
      return !section.items.length
    case 'servicesSection':
      return !section.services.length
    case 'locationsSection':
      return !section.locations.length && !section.homeCity
    case 'reviewsSection':
      return !section.reviews.length
    case 'faqSection':
      return !section.faqs.length && !section.groups.some((g) => g.faqs.length)
    case 'postsSection':
      return !section.posts.length
    case 'gallerySection':
      return !section.images.length && !section.projects.length
    case 'quoteSection':
      return !section.quote?.trim()
    case 'processStepsSection':
      return !section.steps.length
    case 'ctaSection':
      return !section.cta
    case 'teamSection':
      return !section.members.length
    case 'jobsSection':
      return !currentJobs(section.jobs).length
    case 'richTextSection':
      return !section.body?.length
    case 'mediaTextSection':
      return !section.body?.length && !section.image
    case 'highlightsSection':
      return !section.checklist.some((c) => c.lead || c.text) && !section.asideBody?.length
    case 'officeLocationsSection':
      return !visibleOffices(section.offices).length
    // Owner: no price modules on any page; prices stay in FAQ answers and posts.
    case 'priceGuideSection':
      return true
    default:
      return false
  }
}

/**
 * The sections a page renders. Every page shows its H1, which the hero carries: a
 * page with no hero gets one (the page heading, the estimate button and Call). A
 * page with no sections at all (content written before the page builder) also
 * closes with the estimate band, so it is never just a heading.
 */
export function withPageFrame(sections: PageSection[], settings: SiteSettings): PageSection[] {
  const framed = [...sections]
  if (!framed.some((s) => s._type === 'heroSection')) {
    framed.unshift({_type: 'heroSection', _key: 'hero', reviewSnippets: [], primaryCta: {label: 'Get a Free Estimate', href: ESTIMATE_PATH}, showPhone: true, showTrustBar: true})
  }
  if (!sections.length) framed.push({_type: 'ctaSection', _key: 'cta', cta: settings.ctaBand ?? {}})
  return framed
}

/**
 * The page's sections in order, empty ones dropped. Questions followed by guides
 * share one band ("answers"), as do questions or guides alone. Sections carry no
 * numbers: they are not a sequence (only the process steps, the /estimate steps and
 * a post's contents are numbered).
 */
export function planSections(sections: PageSection[]): SectionPlanItem[] {
  const plan: SectionPlanItem[] = []
  for (const section of sections.filter((s) => !isEmptySection(s))) {
    if (section._type === 'faqSection') {
      plan.push({kind: 'answers', faq: section})
    } else if (section._type === 'postsSection' && section.layout !== 'byService') {
      const last = plan.at(-1)
      if (last?.kind === 'answers' && last.faq && !last.posts) last.posts = section
      else plan.push({kind: 'answers', posts: section})
    } else {
      plan.push({kind: 'section', section})
    }
  }
  return plan
}

/** A section's accessible name: its H2 (by id) when it has one, else its eyebrow. */
export function sectionLabel(id: string, heading?: string | null, eyebrow?: string | null) {
  return heading ? {'aria-labelledby': id} : {'aria-label': eyebrow ?? undefined}
}
