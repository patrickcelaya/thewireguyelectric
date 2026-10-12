import {defineArrayMember, defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons/Pin'
import {fieldGroups, imageField, legacyIdField, seoField, urlSlugField} from '../shared/fields'

// A city in the service area (/locations/<city>). City pages rank when they carry
// genuinely local proof: real jobs, reviews and local specifics, not swapped city names.
export const location = defineType({
  name: 'location',
  title: 'Service area (city)',
  type: 'document',
  icon: PinIcon,
  groups: [...fieldGroups, {name: 'local', title: 'Local proof'}],
  fields: [
    defineField({name: 'name', title: 'City name', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    urlSlugField('/locations', {source: 'name'}),
    defineField({name: 'cityNameForSeo', title: 'City name for SEO', type: 'string', group: 'seo', description: 'Used in the title "Electrician in {City name for SEO} | The Wire Guy Electric", e.g. "Gilbert, AZ"'}),
    defineField({name: 'heading', title: 'H1 heading', type: 'string', group: 'content'}),
    defineField({name: 'description', type: 'text', rows: 2, group: 'content', description: 'Short summary used on cards'}),
    imageField('mainImage', 'Main image'),
    defineField({name: 'body', type: 'richText', group: 'content'}),
    defineField({name: 'geo', type: 'geopoint', group: 'local', description: 'City center, for areaServed schema'}),
    defineField({name: 'county', type: 'string', group: 'local', initialValue: 'Maricopa County'}),
    defineField({name: 'zipCodes', type: 'array', group: 'local', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'neighborhoods', type: 'array', group: 'local', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'utilityProviders', type: 'array', group: 'local', of: [defineArrayMember({type: 'string'})], options: {list: ['SRP', 'APS', 'TEP', 'ED3']}, description: 'Utility service affects panel upgrades, EV chargers and solar interconnects'}),
    defineField({name: 'permitNotes', type: 'richText', group: 'local', description: 'City permit and inspection specifics an electrician actually deals with here'}),
    defineField({name: 'featuredServices', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
    defineField({name: 'faqs', title: 'FAQs', type: 'array', group: 'content', of: [defineArrayMember({type: 'faqItem'})]}),
    seoField,
    legacyIdField,
  ],
  preview: {select: {title: 'name', subtitle: 'slug.current'}, prepare: ({title, subtitle}) => ({title, subtitle: `/locations/${subtitle ?? ''}`})},
})
