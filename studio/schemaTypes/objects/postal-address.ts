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
      name: 'mapLinkText',
      title: 'Map link text',
      type: 'string',
      description: 'The words of the footer link to this office\'s Google Business Profile, e.g. "1321 N 65th St, Mesa, AZ 85205 - Mesa Location". Leave empty to show the address.',
    }),
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
    defineField({
      name: 'footerOnly',
      title: 'Show only in the footer',
      type: 'boolean',
      initialValue: false,
      description: 'For an address that must stay consistent for local SEO but should not be advertised (e.g. a home address): it appears only in the footer (linked to its Google Business Profile, like every footer address) and in search-engine data, never in office cards, contact details, maps or directions links on pages.',
    }),
  ],
  preview: {
    select: {title: 'label', street: 'streetAddress', city: 'addressLocality'},
    prepare: ({title, street, city}) => ({title: title || city, subtitle: [street, city].filter(Boolean).join(', ')}),
  },
})
