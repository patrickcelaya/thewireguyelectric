import {defineArrayMember, defineField, defineType} from 'sanity'
import {WrenchIcon} from '@sanity/icons/Wrench'
import {fieldGroups, imageField, legacyIdField, seoField, urlSlugField} from '../shared/fields'

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
    imageField('mainImage', 'Main image', {group: 'content'}),
    defineField({name: 'body', type: 'richText', group: 'content'}),
    defineField({
      name: 'atAGlance',
      title: 'At a glance',
      type: 'array',
      group: 'content',
      description: 'Optional short facts shown near the top, e.g. "Warranty" → "2-year warranty on services we provide". Only facts the business confirms; leave empty rather than guess.',
      of: [
        defineArrayMember({
          name: 'glanceFact',
          title: 'Fact',
          type: 'object',
          fields: [
            defineField({name: 'label', type: 'string', description: 'e.g. "Permit"', validation: (rule) => rule.required()}),
            defineField({name: 'value', type: 'string', description: 'e.g. "We pull the permit and schedule the inspection"', validation: (rule) => rule.required()}),
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
      validation: (rule) =>
        rule.custom((value) => {
          const v = value as {low?: number; high?: number; asOf?: string} | undefined
          if (!v || (v.low === undefined && v.high === undefined)) return true
          if (typeof v.low !== 'number' || typeof v.high !== 'number') return 'Enter both the low and high price'
          if (v.high < v.low) return 'High must be at least low'
          if (!v.asOf) return {message: 'Add the date this range was checked; prices are shown with it', level: 'warning'} as const
          return true
        }),
    }),
    defineField({name: 'faqs', title: 'FAQs', type: 'array', group: 'content', of: [defineArrayMember({type: 'faqItem'})]}),
    defineField({name: 'relatedServices', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
    defineField({name: 'relatedPosts', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'post'}]})]}),
    defineField({name: 'order', type: 'number', group: 'content', description: 'Sort order on listings (lower first)'}),
    seoField,
    legacyIdField,
  ],
  orderings: [{title: 'Order', name: 'orderAsc', by: [{field: 'order', direction: 'asc'}, {field: 'name', direction: 'asc'}]}],
  preview: {select: {title: 'name', subtitle: 'slug.current', media: 'mainImage'}, prepare: ({title, subtitle, media}) => ({title, subtitle: `/services/${subtitle ?? ''}`, media})},
})
