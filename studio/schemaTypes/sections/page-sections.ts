import {defineType} from 'sanity'
import {StackIcon} from '@sanity/icons/Stack'
import {heroSection} from './hero'
import {
  featureGridSection,
  highlightsSection,
  mediaTextSection,
  processStepsSection,
  quoteSection,
  richTextSection,
  teamIntroSection,
} from './content-sections'
import {
  gallerySection,
  jobsSection,
  locationsSection,
  postsSection,
  priceGuideSection,
  servicesSection,
  teamSection,
} from './listing-sections'
import {faqSection, reviewsSection, trustBarSection} from './proof-sections'
import {contactSection, ctaSection, officeLocationsSection} from './contact-sections'

// Page builder sections. Named for what the content is, not how it looks, so a
// redesign doesn't require a content migration. Rules every renderer follows:
// - The page H1 always comes from page.heading, never from a section.
// - Section headings are H2s; anything inside a section is H3 or lower.
// - A section whose content resolves to nothing renders nothing.
// See docs/CONTENT_MODEL.md.

const sectionTypes = (sections: unknown) => ((sections ?? []) as Array<{_type?: string}>).map((s) => s._type)

export const pageSections = defineType({
  name: 'pageSections',
  title: 'Sections',
  type: 'array',
  icon: StackIcon,
  of: [
    heroSection,
    richTextSection,
    mediaTextSection,
    servicesSection,
    locationsSection,
    reviewsSection,
    faqSection,
    teamSection,
    postsSection,
    jobsSection,
    contactSection,
    ctaSection,
    trustBarSection,
    featureGridSection,
    teamIntroSection,
    quoteSection,
    gallerySection,
    officeLocationsSection,
    processStepsSection,
    priceGuideSection,
    highlightsSection,
  ],
  options: {
    insertMenu: {
      filter: true,
      groups: [
        {name: 'intro', title: 'Intro', of: ['heroSection', 'trustBarSection', 'teamIntroSection']},
        {name: 'copy', title: 'Copy', of: ['richTextSection', 'mediaTextSection', 'featureGridSection', 'highlightsSection', 'processStepsSection', 'quoteSection']},
        {name: 'lists', title: 'Lists', of: ['servicesSection', 'locationsSection', 'postsSection', 'teamSection', 'gallerySection', 'priceGuideSection', 'jobsSection']},
        {name: 'proof', title: 'Proof', of: ['reviewsSection', 'faqSection']},
        {name: 'contact', title: 'Contact', of: ['contactSection', 'officeLocationsSection', 'ctaSection']},
      ],
    },
  },
  // Sanity takes the level from the rule, so the error and the warning are separate rules.
  validation: (rule) => [
    rule.custom((sections) => (sectionTypes(sections).filter((t) => t === 'heroSection').length > 1 ? 'Use one hero per page' : true)),
    rule
      .custom((sections) => {
        const types = sectionTypes(sections)
        return types.includes('heroSection') && types[0] !== 'heroSection' ? 'The hero should be the first section' : true
      })
      .warning(),
  ],
})
