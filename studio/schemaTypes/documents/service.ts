import {defineArrayMember, defineField, defineType} from 'sanity'
import {WrenchIcon} from '@sanity/icons/Wrench'
import {contentUpdatedField, fieldGroups, imageField, legacyIdField, seoField, urlSlugField, wordCount} from '../shared/fields'

export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  icon: WrenchIcon,
  groups: fieldGroups,
  fields: [
    defineField({name: 'name', title: 'Service name', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    urlSlugField('/services', {source: 'name'}),
    defineField({name: 'category', type: 'reference', to: [{type: 'serviceCategory'}], group: 'content'}),
    defineField({name: 'heading', title: 'H1 heading', type: 'string', group: 'content', description: 'Falls back to the service name'}),
    defineField({name: 'shortDescription', type: 'text', rows: 2, group: 'content', description: 'Used on service cards and as the default meta description'}),
    defineField({
      name: 'linkLabel',
      title: 'Link wording',
      type: 'string',
      group: 'content',
      description:
        'Lower-case words for the link from a guide to this service, read as "See our {link wording} service", e.g. "electrical troubleshooting". Use the words people search for. Empty = the wording built into the site for this service, else its name.',
    }),
    defineField({
      name: 'quickAnswer',
      title: 'Quick answer',
      type: 'text',
      rows: 3,
      group: 'content',
      description:
        'The answer-first line of the page\'s "short version": what this service covers, in one or two sentences (25–60 words). Say only what the body says, and no prices. Empty = a line about the business.',
      validation: (rule) =>
        rule
          .custom((value) => {
            const words = wordCount(value as string | undefined)
            if (!words) return true
            return words < 25 || words > 60 ? `${words} words; aim for 25–60` : true
          })
          .warning(),
    }),
    imageField('mainImage', 'Main image', {group: 'content'}),
    defineField({name: 'body', type: 'richText', group: 'content'}),
    defineField({
      name: 'atAGlance',
      title: 'At a glance',
      type: 'array',
      group: 'content',
      description: 'Optional short facts shown near the top, e.g. "Most common job" → "200-amp like-for-like replacement" (Panels). Only facts the business confirms; leave empty rather than guess. The warranty line ("Our work comes with a warranty.") is added to every service by the template; never state a warranty term.',
      of: [
        defineArrayMember({
          name: 'glanceFact',
          title: 'Fact',
          type: 'object',
          fields: [
            defineField({name: 'label', type: 'string', description: 'e.g. "Permit"', validation: (rule) => rule.required()}),
            defineField({name: 'value', type: 'string', description: 'e.g. "We pull the permit"', validation: (rule) => rule.required()}),
            defineField({name: 'detail', type: 'string', description: 'Optional supporting line under the fact, e.g. "We schedule the inspection and make sure everything passes."'}),
          ],
          preview: {select: {title: 'label', subtitle: 'value'}},
        }),
      ],
    }),
    defineField({
      name: 'signs',
      title: 'Signs you need this',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'string'})],
      description: 'Optional checklist of symptoms or situations, e.g. "Breakers trip when the AC starts". Shown as a list on the service page.',
    }),
    defineField({
      name: 'priceRange',
      title: 'Typical price range',
      type: 'object',
      group: 'content',
      description: 'Optional "from–to" price guidance. Pages with honest cost ranges earn links and convert.',
      fields: [
        defineField({name: 'low', type: 'number'}),
        defineField({name: 'high', type: 'number'}),
        defineField({name: 'note', type: 'string', description: 'e.g. "Most 200A panel upgrades in Mesa"'}),
        defineField({name: 'asOf', title: 'Checked on', type: 'date', description: 'When this range was last confirmed. Shown as "as of {month year}".'}),
      ],
      // Sanity takes the level from the rule, so the error and the warning are separate rules.
      validation: (rule) => [
        rule.custom((value) => {
          const v = value as {low?: number; high?: number} | undefined
          if (!v || (v.low == null && v.high == null)) return true
          if (typeof v.low !== 'number' || typeof v.high !== 'number') return 'Enter both the low and high price'
          return v.high < v.low ? 'High must be at least low' : true
        }),
        rule
          .custom((value) => {
            const v = value as {low?: number; high?: number; asOf?: string} | undefined
            if (!v || (v.low == null && v.high == null) || v.asOf) return true
            return 'Add the date this range was checked; prices are shown with it'
          })
          .warning(),
      ],
    }),
    defineField({name: 'faqs', title: 'FAQs', type: 'array', group: 'content', of: [defineArrayMember({type: 'faqItem'})]}),
    defineField({name: 'relatedServices', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
    defineField({name: 'relatedPosts', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'post'}]})]}),
    defineField({name: 'order', type: 'number', group: 'content', description: 'Sort order on listings (lower first)'}),
    seoField,
    contentUpdatedField,
    legacyIdField,
  ],
  orderings: [{title: 'Order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}, {field: 'name', direction: 'asc'}]}],
  preview: {select: {title: 'name', subtitle: 'slug.current', media: 'mainImage'}, prepare: ({title, subtitle, media}) => ({title, subtitle: `/services/${subtitle ?? ''}`, media})},
})
