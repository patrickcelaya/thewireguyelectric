// How a page's sections are laid out (components/sections/SectionRenderer.astro):
// which ones render, which are numbered chapters, and which share a band.
import type {PageSection, SectionOf, SiteSettings} from './types'
import {ESTIMATE_PATH} from './site'

/** One thing the renderer draws: a section, or the questions-and-guides band. */
export type SectionPlanItem =
  | {kind: 'section'; section: PageSection; number?: number}
  | {
      kind: 'answers'
      faq?: SectionOf<'faqSection'>
      posts?: SectionOf<'postsSection'>
      numbers: {faq?: number; posts?: number}
    }

/** True when a section has nothing to show: it renders nothing and takes no number. */
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
      return !section.jobs.length
    // Owner: no price modules on any page; prices stay in FAQ answers and posts.
    case 'priceGuideSection':
      return true
    default:
      return false
  }
}

/**
 * Sections set between the numbered chapters: the hero, the value cards on the copper
 * band and a quote pulled out on its photo. Every other section's eyebrow carries the
 * next chapter number ("01", "02", …), as in the round-5 mockups.
 */
function isInterlude(section: PageSection) {
  return (
    section._type === 'heroSection' ||
    section._type === 'quoteSection' ||
    (section._type === 'featureGridSection' && section.style !== 'checklist')
  )
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
 * The page's sections in order, empty ones dropped, chapters numbered. Questions
 * followed by guides share one band ("answers"), as do questions or guides alone.
 */
export function planSections(sections: PageSection[]): SectionPlanItem[] {
  const plan: SectionPlanItem[] = []
  let chapter = 0
  const next = () => ++chapter
  for (const section of sections.filter((s) => !isEmptySection(s))) {
    if (section._type === 'faqSection') {
      plan.push({kind: 'answers', faq: section, numbers: {faq: next()}})
    } else if (section._type === 'postsSection') {
      const last = plan.at(-1)
      if (last?.kind === 'answers' && last.faq && !last.posts) {
        last.posts = section
        last.numbers.posts = next()
      } else plan.push({kind: 'answers', posts: section, numbers: {posts: next()}})
    } else {
      plan.push({kind: 'section', section, number: isInterlude(section) ? undefined : next()})
    }
  }
  return plan
}

/** A section's accessible name: its H2 (by id) when it has one, else its eyebrow. */
export function sectionLabel(id: string, heading?: string | null, eyebrow?: string | null) {
  return heading ? {'aria-labelledby': id} : {'aria-label': eyebrow ?? undefined}
}
