import {defineArrayMember, defineField, defineType} from 'sanity'
import {CogIcon} from '@sanity/icons/Cog'

// Singleton. The single source of truth for NAP (name, address, phone), which
// feeds the header, footer, contact page and every page's LocalBusiness schema.
// Keep it identical to the Google Business Profile.
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'business', title: 'Business (NAP)', default: true},
    {name: 'trust', title: 'Trust & reviews'},
    {name: 'navigation', title: 'Navigation'},
    {name: 'seo', title: 'SEO defaults'},
    {name: 'tracking', title: 'Tracking'},
  ],
  fields: [
    defineField({name: 'businessName', type: 'string', group: 'business', initialValue: 'The Wire Guy Electric', validation: (rule) => rule.required()}),
    defineField({name: 'legalName', type: 'string', group: 'business', initialValue: 'The Wire Guy Electric LLC'}),
    defineField({name: 'tagline', type: 'string', group: 'business'}),
    defineField({name: 'description', type: 'text', rows: 3, group: 'business', description: 'One- or two-sentence description used in schema markup'}),
    defineField({name: 'phone', type: 'string', group: 'business', description: 'Display format, e.g. (602) 769-7892', validation: (rule) => rule.required()}),
    defineField({name: 'phoneE164', title: 'Phone (E.164)', type: 'string', group: 'business', description: 'e.g. +16027697892', validation: (rule) => rule.required().regex(/^\+1\d{10}$/)}),
    defineField({name: 'email', type: 'string', group: 'business', validation: (rule) => rule.email()}),
    defineField({name: 'addresses', type: 'array', group: 'business', of: [defineArrayMember({type: 'postalAddress'})], validation: (rule) => rule.min(1)}),
    defineField({name: 'openingHours', type: 'array', group: 'business', of: [defineArrayMember({type: 'openingHours'})]}),
    defineField({name: 'emergencyService', type: 'boolean', group: 'business', description: 'Offers after-hours emergency service', initialValue: false}),
    defineField({name: 'priceRange', type: 'string', group: 'business', initialValue: '$$'}),
    defineField({name: 'foundingDate', type: 'string', group: 'business', initialValue: '2017'}),
    defineField({name: 'founders', type: 'array', group: 'business', of: [defineArrayMember({type: 'reference', to: [{type: 'teamMember'}]})]}),
    defineField({name: 'rocLicense', title: 'AZ ROC license number', type: 'string', group: 'trust', initialValue: '365306'}),
    defineField({
      name: 'reviewSummary',
      type: 'object',
      group: 'trust',
      description: 'Shown on the site as a trust signal. Keep in sync with Google Business Profile.',
      fields: [
        defineField({name: 'ratingValue', type: 'number', validation: (rule) => rule.min(1).max(5)}),
        defineField({name: 'reviewCount', type: 'number'}),
        defineField({name: 'source', type: 'string', initialValue: 'Google'}),
        defineField({name: 'reviewsUrl', type: 'url', title: 'Link to reviews'}),
      ],
    }),
    defineField({name: 'badges', type: 'array', group: 'trust', of: [defineArrayMember({type: 'string'})], description: 'e.g. "Licensed, bonded & insured", "Family owned since 2017"'}),
    defineField({name: 'sameAs', title: 'Profiles (sameAs)', type: 'array', group: 'trust', of: [defineArrayMember({type: 'url'})], description: 'Google Business Profile, Facebook, Instagram, Yelp, BBB, Nextdoor, etc. Helps Google and AI search connect the business entity.'}),
    defineField({name: 'serviceAreas', type: 'array', group: 'business', of: [defineArrayMember({type: 'reference', to: [{type: 'location'}]})]}),
    defineField({name: 'sisterCompanies', type: 'array', group: 'business', of: [defineArrayMember({type: 'linkItem'})]}),
    defineField({name: 'logo', type: 'image', group: 'business'}),
    defineField({name: 'headerNav', type: 'array', group: 'navigation', of: [defineArrayMember({type: 'linkItem'})]}),
    defineField({name: 'footerNav', type: 'array', group: 'navigation', of: [defineArrayMember({type: 'linkItem'})]}),
    defineField({name: 'primaryCta', type: 'linkItem', group: 'navigation'}),
    defineField({name: 'titleSuffix', type: 'string', group: 'seo', initialValue: 'The Wire Guy Electric', description: 'Appended to page titles that do not set their own full meta title'}),
    defineField({name: 'defaultOgImage', type: 'image', group: 'seo'}),
    defineField({name: 'ga4MeasurementId', title: 'GA4 measurement ID', type: 'string', group: 'tracking', initialValue: 'G-4ZYV7JMRJH'}),
    defineField({name: 'googleSiteVerification', type: 'string', group: 'tracking'}),
  ],
  preview: {prepare: () => ({title: 'Site settings'})},
})
