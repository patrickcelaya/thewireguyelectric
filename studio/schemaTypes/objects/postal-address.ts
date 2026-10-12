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
  ],
  preview: {
    select: {title: 'label', street: 'streetAddress', city: 'addressLocality'},
    prepare: ({title, street, city}) => ({title: title || city, subtitle: [street, city].filter(Boolean).join(', ')}),
  },
})
