import {defineArrayMember, defineField} from 'sanity'
import {StarIcon} from '@sanity/icons/Star'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {
  FAQ_TOPICS,
  eyebrowField,
  headingAccentField,
  iconField,
  sectionHeadingField,
  sectionImageField,
} from '../shared/fields'
import {countLabel, sectionPreview} from './preview'

// Proof: reviews, answers and verifiable credentials.

export const reviewsSection = defineArrayMember({
  name: 'reviewsSection',
  title: 'Reviews',
  type: 'object',
  icon: StarIcon,
  description:
    'Real customer reviews as text. Pick reviews, or show reviews filtered by city and/or service (featured first). Hidden when there are none. Never mark these up as Review/AggregateRating structured data.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    headingAccentField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'reviews',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'review'}]})],
      description: 'Optional. Pick reviews in the order to show them. Leave empty to show reviews matching the filters below, featured first.',
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'location', title: 'Only reviews from this city', type: 'reference', to: [{type: 'location'}], description: 'Ignored when reviews are picked.'}),
    defineField({name: 'service', title: 'Only reviews about this service', type: 'reference', to: [{type: 'service'}], description: 'Ignored when reviews are picked.'}),
    defineField({
      name: 'limit',
      type: 'number',
      initialValue: 6,
      description: 'Most reviews to show. 0 = all. Ignored when reviews are picked (every picked review is shown).',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem', description: 'e.g. "Get a Free Estimate Now" → /estimate'}),
  ],
  preview: {
    select: {title: 'heading', reviews: 'reviews', location: 'location.name', service: 'service.name'},
    prepare: sectionPreview('Reviews', (v) => countLabel(v.reviews, 'review') ?? ([v.location, v.service].filter(Boolean).join(', ') || 'featured')),
  },
})

const faqRefs = (description: string) =>
  defineField({
    name: 'faqs',
    title: 'Questions',
    type: 'array',
    of: [defineArrayMember({type: 'reference', to: [{type: 'faq'}]})],
    description,
    validation: (rule) => rule.unique(),
  })

const faqTopic = (description: string) => defineField({name: 'topic', type: 'string', description, options: {list: FAQ_TOPICS}})

export const faqSection = defineArrayMember({
  name: 'faqSection',
  title: 'FAQs',
  type: 'object',
  icon: HelpCircleIcon,
  description:
    'Questions and answers from the shared FAQ documents, optionally in headed groups. All FAQ sections on a page are combined into one FAQPage in structured data, built from exactly the questions shown.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    sectionImageField(),
    faqRefs('Pick questions in the order to show them.'),
    faqTopic('Or show every FAQ with this topic (ignored when questions are picked).'),
    defineField({
      name: 'groups',
      type: 'array',
      description: 'Optional. Headed groups of questions shown after the ones above, e.g. "Pricing And Cost Questions". Group headings render one level below the section heading.',
      of: [
        defineArrayMember({
          name: 'faqGroup',
          title: 'Group',
          type: 'object',
          icon: HelpCircleIcon,
          fields: [
            defineField({name: 'heading', type: 'string', validation: (rule) => rule.required()}),
            faqRefs('Pick questions in the order to show them.'),
            faqTopic('Or show every FAQ with this topic (ignored when questions are picked).'),
          ],
          preview: {
            select: {title: 'heading', faqs: 'faqs', topic: 'topic'},
            prepare: ({title, faqs, topic}) => ({title, subtitle: countLabel(faqs, 'question') ?? (topic ? `topic: ${topic}` : 'empty')}),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {title: 'heading', faqs: 'faqs', groups: 'groups', topic: 'topic'},
    prepare: sectionPreview('FAQs', (v) => [countLabel(v.faqs, 'question') ?? (v.topic ? `topic: ${v.topic}` : undefined), countLabel(v.groups, 'group')].filter(Boolean).join(', ')),
  },
})

const TRUST_FACTS = [
  {title: 'Custom text', value: 'custom'},
  {title: 'Google rating (from Site settings)', value: 'reviews'},
  {title: 'ROC license (from Site settings)', value: 'license'},
  {title: 'Year founded (from Site settings)', value: 'founded'},
]

export const trustBarSection = defineArrayMember({
  name: 'trustBarSection',
  title: 'Trust strip',
  type: 'object',
  icon: CheckmarkCircleIcon,
  description:
    'A row of short, verifiable facts: rating, license, years in business. Leave empty for the standard strip built from Site settings. Only state facts the business can back up.',
  fields: [
    defineField({
      name: 'items',
      type: 'array',
      description: 'Optional. Leave empty to show the standard strip (Google rating, ROC license, year founded and the badges in Site settings).',
      of: [
        defineArrayMember({
          name: 'trustItem',
          title: 'Fact',
          type: 'object',
          icon: CheckmarkCircleIcon,
          fields: [
            defineField({
              name: 'fact',
              type: 'string',
              description: 'Rating, license and year founded are filled in from Site settings, so they never drift.',
              options: {list: TRUST_FACTS},
              initialValue: 'custom',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'value',
              type: 'string',
              description: 'The short emphasized part, e.g. "100+".',
              hidden: ({parent}) => (parent as {fact?: string} | undefined)?.fact !== 'custom',
            }),
            defineField({
              name: 'label',
              type: 'string',
              description: 'The rest, e.g. "Arizona businesses". Never a warranty term (owner, D17). For facts from Site settings, optional wording next to the value (e.g. "Licensed, bonded & insured").',
            }),
            defineField({name: 'href', title: 'Link', type: 'string', description: 'Optional. Rating and license link to the reviews and ROC lookup automatically.'}),
            iconField(),
          ],
          validation: (rule) =>
            rule.custom((value) => {
              const v = value as {fact?: string; value?: string; label?: string} | undefined
              if (!v || v.fact !== 'custom') return true
              return v.value || v.label ? true : 'Add a value or a label'
            }),
          preview: {
            select: {fact: 'fact', value: 'value', label: 'label'},
            prepare: ({fact, value, label}) => ({
              title: [value, label].filter(Boolean).join(' ') || TRUST_FACTS.find((f) => f.value === fact)?.title,
              subtitle: fact && fact !== 'custom' ? 'from Site settings' : undefined,
            }),
          },
        }),
      ],
    }),
  ],
  preview: {select: {items: 'items'}, prepare: sectionPreview('Trust strip', (v) => countLabel(v.items, 'fact') ?? 'standard')},
})
