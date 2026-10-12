import {defineField, defineType} from 'sanity'
import {StarIcon} from '@sanity/icons/Star'

// Curated customer reviews (copied from Google with permission). Tagging the city
// and service lets city and service pages show relevant local proof.
// Note: Google does not show star rich results for reviews a business publishes
// about itself, so these are for people and conversion, not for stars in search.
export const review = defineType({
  name: 'review',
  title: 'Review',
  type: 'document',
  icon: StarIcon,
  fields: [
    defineField({name: 'authorName', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'rating', type: 'number', initialValue: 5, validation: (rule) => rule.required().min(1).max(5)}),
    defineField({name: 'text', type: 'text', rows: 5, validation: (rule) => rule.required()}),
    defineField({name: 'date', type: 'date'}),
    defineField({name: 'source', type: 'string', initialValue: 'Google', options: {list: ['Google', 'Yelp', 'Facebook', 'Nextdoor', 'Angi', 'Direct']}}),
    defineField({name: 'sourceUrl', type: 'url'}),
    defineField({name: 'location', type: 'reference', to: [{type: 'location'}]}),
    defineField({name: 'service', type: 'reference', to: [{type: 'service'}]}),
    defineField({name: 'featured', type: 'boolean', initialValue: false}),
  ],
  preview: {select: {title: 'authorName', subtitle: 'text'}},
})
