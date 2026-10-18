import {defineArrayMember, defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons/Pin'
import {contentUpdatedField, UTILITY_PROVIDERS, fieldGroups, imageField, legacyIdField, seoField, urlSlugField} from '../shared/fields'

// A city in the service area (/locations/<city>). City pages rank when they carry
// genuinely local proof: real jobs, reviews and local specifics, not swapped city names.
// Mesa is not a location document: the homepage is the Mesa page (see Site settings → Home city).
export const location = defineType({
  name: 'location',
  title: 'Service area (city)',
  type: 'document',
  icon: PinIcon,
  groups: [...fieldGroups, {name: 'local', title: 'Local proof'}],
  fields: [
    defineField({
      name: 'name',
      title: 'City name',
      type: 'string',
      group: 'content',
      description: 'Just the city, e.g. "Gilbert". Used in breadcrumbs, city lists and structured data.',
      validation: (rule) => rule.required(),
    }),
    urlSlugField('/locations', {source: 'name'}),
    defineField({name: 'cityNameForSeo', title: 'City name for SEO', type: 'string', group: 'seo', description: 'Used in the title "Electrician in {City name for SEO} | The Wire Guy Electric", e.g. "Gilbert, AZ"'}),
    defineField({name: 'heading', title: 'H1 heading', type: 'string', group: 'content'}),
    defineField({name: 'description', type: 'text', rows: 2, group: 'content', description: 'The lede under the H1; also the default meta description.'}),
    defineField({
      name: 'cardBlurb',
      title: 'Card blurb',
      type: 'text',
      rows: 2,
      group: 'content',
      description: 'One line for city cards and tiles, e.g. "North Scottsdale, DC Ranch, McCormick Ranch, and Gainey Ranch." Must be true of this city.',
    }),
    imageField('mainImage', 'Main image', {
      group: 'content',
      description: 'One of the crew’s own photos, shown beside "{City} at a glance". Never claim a photo was taken in this city unless it was.',
    }),
    imageField('heroImage', 'Hero image', {
      group: 'content',
      description:
        'The photo under the open sky at the top of the page: a wide company photo with plenty of sky. Crop it so every head sits in the bottom quarter (below the words) and nothing at the far left or right matters on phones. Empty: the photo picked for this city in the site code, else the fleet.',
    }),
    defineField({name: 'body', type: 'richText', group: 'content'}),
    defineField({name: 'geo', type: 'geopoint', group: 'local', description: 'City center, for areaServed schema'}),
    defineField({name: 'county', type: 'string', group: 'local', initialValue: 'Maricopa County'}),
    defineField({name: 'zipCodes', type: 'array', group: 'local', of: [defineArrayMember({type: 'string'})]}),
    defineField({name: 'neighborhoods', type: 'array', group: 'local', of: [defineArrayMember({type: 'string'})]}),
    defineField({
      name: 'utilityProviders',
      type: 'array',
      group: 'local',
      of: [defineArrayMember({type: 'string'})],
      options: {list: UTILITY_PROVIDERS},
      description: 'Electric utilities serving this city. Utility territory affects panel upgrades, EV chargers and solar interconnects. Only list utilities confirmed from a public source.',
    }),
    defineField({name: 'permitNotes', type: 'richText', group: 'local', description: 'City permit and inspection specifics an electrician actually deals with here'}),
    defineField({name: 'featuredServices', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
    defineField({
      name: 'nearbyLocations',
      title: 'Nearby cities',
      type: 'array',
      group: 'content',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'location'}],
          options: {
            filter: ({document}) => {
              const id = document._id.replace(/^drafts\./, '')
              return {filter: '!(_id in [$id, $draftId])', params: {id, draftId: `drafts.${id}`}}
            },
          },
        }),
      ],
      description: 'Optional. Neighboring cities to link from this page ("Other areas we serve"). Leave empty to list all cities.',
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'faqs', title: 'FAQs', type: 'array', group: 'content', of: [defineArrayMember({type: 'faqItem'})]}),
    seoField,
    contentUpdatedField,
    legacyIdField,
  ],
  preview: {select: {title: 'name', subtitle: 'slug.current'}, prepare: ({title, subtitle}) => ({title, subtitle: `/locations/${subtitle ?? ''}`})},
})
