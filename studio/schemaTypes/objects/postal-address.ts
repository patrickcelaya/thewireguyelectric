import {defineField, defineType} from 'sanity'

export const postalAddress = defineType({
  name: 'postalAddress',
  title: 'Address',
  type: 'object',
  fields: [
    defineField({name: 'label', type: 'string', description: 'e.g. "Mesa office"'}),
    defineField({name: 'streetAddress', type: 'string'}),
    defineField({name: 'addressLocality', title: 'City', type: 'string'}),
    defineField({name: 'addressRegion', title: 'State', type: 'string', initialValue: 'AZ'}),
    defineField({name: 'postalCode', type: 'string'}),
    defineField({name: 'geo', type: 'geopoint', description: 'Exact pin location of the office'}),
    defineField({name: 'googleMapsUrl', type: 'url', title: 'Google Business Profile / Maps URL'}),
    defineField({
      name: 'gbpName',
      title: 'Name on Google Business Profile',
      type: 'string',
      description: 'Exactly as it appears on Google. Used in structured data for this location.',
    }),
    defineField({
      name: 'locationPage',
      title: 'Location page',
      type: 'reference',
      to: [{type: 'location'}],
      description: 'For a second office with its own Google Business Profile: the city page that profile links to. That page then carries this location\'s address and structured data.',
    }),
    defineField({name: 'phone', title: 'Phone (if different)', type: 'string', description: 'E.164, e.g. +16027697892. Leave empty to use the main number.'}),
    defineField({name: 'appointmentOnly', title: 'By appointment only', type: 'boolean', initialValue: false}),
  ],
  preview: {
    select: {title: 'label', street: 'streetAddress', city: 'addressLocality'},
    prepare: ({title, street, city}) => ({title: title || city, subtitle: [street, city].filter(Boolean).join(', ')}),
  },
})
