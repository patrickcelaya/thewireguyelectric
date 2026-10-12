import {defineArrayMember, defineField, defineType} from 'sanity'
import {MarkerIcon} from '@sanity/icons/Marker'
import {fieldGroups, imageField, seoField} from '../shared/fields'

// Service × city landing page, e.g. "Panel Upgrades in Gilbert, AZ" at
// /locations/gilbert/panels. Only publish one when it has unique local substance:
// Google treats mass-produced city-swap pages as doorway pages.
export const serviceLocation = defineType({
  name: 'serviceLocation',
  title: 'Service in city',
  type: 'document',
  icon: MarkerIcon,
  groups: fieldGroups,
  fields: [
    defineField({name: 'service', type: 'reference', to: [{type: 'service'}], group: 'content', validation: (rule) => rule.required()}),
    defineField({name: 'location', type: 'reference', to: [{type: 'location'}], group: 'content', validation: (rule) => rule.required()}),
    defineField({name: 'heading', title: 'H1 heading', type: 'string', group: 'content', description: 'e.g. "Electrical Panel Upgrades in Gilbert, AZ"', validation: (rule) => rule.required()}),
    defineField({name: 'intro', type: 'text', rows: 3, group: 'content', validation: (rule) => rule.required()}),
    imageField('mainImage', 'Main image', {description: 'Use a photo of a real job in this city'}),
    defineField({
      name: 'body',
      type: 'richText',
      group: 'content',
      description: 'Must be specific to this city: local code/permit notes, utility (SRP/APS), common home ages and panel types, real projects.',
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'faqs', title: 'FAQs', type: 'array', group: 'content', of: [defineArrayMember({type: 'faqItem'})]}),
    seoField,
  ],
  preview: {
    select: {service: 'service.name', city: 'location.name'},
    prepare: ({service, city}) => ({title: `${service ?? '?'} in ${city ?? '?'}`}),
  },
})
