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
    imageField('mainImage', 'Main image'),
    defineField({name: 'body', type: 'richText', group: 'content'}),
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
      ],
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
