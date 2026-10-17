import {defineArrayMember, defineField} from 'sanity'
import {WrenchIcon} from '@sanity/icons/Wrench'
import {PinIcon} from '@sanity/icons/Pin'
import {UsersIcon} from '@sanity/icons/Users'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {CaseIcon} from '@sanity/icons/Case'
import {ImagesIcon} from '@sanity/icons/Images'
import {BillIcon} from '@sanity/icons/Bill'
import {
  altField,
  captionField,
  eyebrowField,
  headingAccentField,
  sectionHeadingField,
  sectionImageField,
} from '../shared/fields'
import {countLabel, sectionPreview} from './preview'

// Sections that list documents (services, cities, posts, people, jobs, photos, prices).
// Every list is resolved in web/src/lib/queries.ts; an empty list renders nothing.

export const servicesSection = defineArrayMember({
  name: 'servicesSection',
  title: 'Services list',
  type: 'object',
  icon: WrenchIcon,
  description: 'Service cards. Pick services (optionally with custom card text), or show a whole category, or all services.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    headingAccentField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'layout',
      type: 'string',
      description: 'Featured: a few large cards. Grid: a compact directory. Grouped: every service under its category heading (Residential, Commercial).',
      options: {
        list: [
          {title: 'Featured', value: 'featured'},
          {title: 'Grid', value: 'grid'},
          {title: 'Grouped by category', value: 'grouped'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'grid',
    }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{type: 'serviceCategory'}],
      description: 'Show only the services in this category. Ignored when services are picked below. Leave both empty to show every service.',
    }),
    defineField({
      name: 'services',
      type: 'array',
      description: 'Optional. Pick services in the order to show them. Use "Service with custom card text" to keep a card\'s own title or blurb.',
      of: [
        defineArrayMember({type: 'reference', to: [{type: 'service'}]}),
        defineArrayMember({
          name: 'serviceCard',
          title: 'Service with custom card text',
          type: 'object',
          icon: WrenchIcon,
          fields: [
            defineField({name: 'service', type: 'reference', to: [{type: 'service'}], validation: (rule) => rule.required()}),
            defineField({name: 'title', type: 'string', description: 'Card title, e.g. "EV Chargers". Defaults to the service name. The card still links to the service.'}),
            defineField({name: 'text', type: 'text', rows: 3, description: 'Card blurb. Defaults to the service\'s short description.'}),
            sectionImageField('image', 'Image', 'Optional. Replaces the service\'s main image on this card.'),
          ],
          preview: {
            select: {title: 'title', service: 'service.name', media: 'image', serviceMedia: 'service.mainImage'},
            prepare: ({title, service, media, serviceMedia}) => ({title: title || service, subtitle: title ? `→ ${service ?? '?'}` : 'Custom card', media: media ?? serviceMedia}),
          },
        }),
      ],
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem', description: 'e.g. "View All Services" → /services'}),
  ],
  preview: {
    select: {title: 'heading', layout: 'layout', services: 'services', category: 'category.name'},
    prepare: sectionPreview('Services', (v) => [v.layout, countLabel(v.services, 'service') ?? (v.category ? `all ${v.category}` : 'all')].filter(Boolean).join(', ')),
  },
})

export const locationsSection = defineArrayMember({
  name: 'locationsSection',
  title: 'Service areas list',
  type: 'object',
  icon: PinIcon,
  description: 'Cities we serve, each linking to its page. Card text comes from each city\'s "Card blurb".',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    headingAccentField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'locations',
      title: 'Cities',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'location'}]})],
      description: 'Optional. Pick cities in the order to show them. Leave empty to show every city.',
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'includeHomeCity',
      title: 'Include Mesa (the homepage)',
      type: 'boolean',
      initialValue: true,
      description: 'Mesa has no city page: the homepage is the Mesa page. When on, Mesa is listed first and links to /. Its blurb comes from Site settings → Home city.',
    }),
  ],
  preview: {
    select: {title: 'heading', locations: 'locations'},
    prepare: sectionPreview('Service areas', (v) => countLabel(v.locations, 'city', 'cities') ?? 'all cities'),
  },
})

export const postsSection = defineArrayMember({
  name: 'postsSection',
  title: 'Blog posts',
  type: 'object',
  icon: DocumentTextIcon,
  description: 'Blog post cards: picked posts, or the newest posts (optionally from one category).',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'posts',
      type: 'array',
      of: [
        defineArrayMember({type: 'reference', to: [{type: 'post'}]}),
        defineArrayMember({
          name: 'postCard',
          title: 'Post with its own cover',
          type: 'object',
          icon: DocumentTextIcon,
          fields: [
            defineField({name: 'post', type: 'reference', to: [{type: 'post'}], validation: (rule) => rule.required()}),
            defineField({name: 'label', title: 'Topic label', type: 'string', description: 'Optional pill on the cover, e.g. "Troubleshooting". Defaults to the post\'s category.'}),
            defineField({
              name: 'coverWords',
              title: 'Cover words',
              type: 'string',
              description: 'Optional. Two or three words set large on the cover, e.g. "Heat and breakers". The post title stays the link below.',
              validation: (rule) => rule.max(28).warning('Keep the cover words short'),
            }),
            sectionImageField('image', 'Cover photo', 'Optional. A real job photo for this card, replacing the post\'s main image here (the post page keeps its own).'),
          ],
          preview: {
            select: {title: 'post.title', words: 'coverWords', media: 'image', postMedia: 'post.mainImage'},
            prepare: ({title, words, media, postMedia}) => ({title, subtitle: words ? `Cover: ${words}` : 'Own cover', media: media ?? postMedia}),
          },
        }),
      ],
      description: 'Optional. Pick posts in the order to show them. Use "Post with its own cover" for a card with a real job photo or cover words. Leave empty to show the newest posts.',
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'category', type: 'reference', to: [{type: 'postCategory'}], description: 'Only posts in this category. Ignored when posts are picked.'}),
    defineField({
      name: 'featuredFirst',
      title: 'Featured posts first',
      type: 'boolean',
      initialValue: false,
      description: 'Put posts marked "Featured" ahead of newer posts. Ignored when posts are picked.',
    }),
    defineField({
      name: 'limit',
      type: 'number',
      initialValue: 3,
      description: 'How many of the newest posts to show. 0 = all. Ignored when posts are picked (every picked post is shown).',
      validation: (rule) => rule.min(0).integer(),
    }),
    defineField({
      name: 'layout',
      type: 'string',
      description:
        'Cards: one row of guide cards. By service: every post under the service it supports (its first related service), each group linking to that service page, as on the blog.',
      options: {
        list: [
          {title: 'Cards', value: 'cards'},
          {title: 'By service', value: 'byService'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'cards',
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem', description: 'e.g. "Read the blog" → /blog'}),
  ],
  preview: {
    select: {title: 'heading', posts: 'posts', limit: 'limit', category: 'category.name'},
    prepare: sectionPreview('Blog posts', (v) => countLabel(v.posts, 'post') ?? [v.category, v.limit ? `latest ${v.limit}` : 'all'].filter(Boolean).join(', ')),
  },
})

export const teamSection = defineArrayMember({
  name: 'teamSection',
  title: 'Team',
  type: 'object',
  icon: UsersIcon,
  description: 'Team member cards with photo, name and role.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'members',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'teamMember'}]})],
      description: 'Optional. Pick people in the order to show them. Leave empty to show everyone marked "Show on team page".',
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'showBios', title: 'Show bios', type: 'boolean', initialValue: true}),
    defineField({name: 'cta', title: 'Button', type: 'linkItem', description: 'e.g. "Our Team" → /our-team'}),
  ],
  preview: {
    select: {title: 'heading', members: 'members'},
    prepare: sectionPreview('Team', (v) => countLabel(v.members, 'person', 'people') ?? 'everyone'),
  },
})

export const jobsSection = defineArrayMember({
  name: 'jobsSection',
  title: 'Job openings',
  type: 'object',
  icon: CaseIcon,
  description: 'Open positions from the Job openings documents (each also becomes JobPosting structured data). Hidden when nothing is open.',
  fields: [sectionHeadingField(), defineField({name: 'intro', type: 'text', rows: 3})],
  preview: {select: {title: 'heading'}, prepare: sectionPreview('Job openings')},
})

export const gallerySection = defineArrayMember({
  name: 'gallerySection',
  title: 'Photo gallery',
  type: 'object',
  icon: ImagesIcon,
  description: 'Real photos of our own work (no stock). Add photos here, or pick projects to show their photos.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    headingAccentField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'images',
      title: 'Photos',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'galleryImage',
          title: 'Photo',
          type: 'image',
          options: {hotspot: true},
          fields: [
            altField('error'),
            captionField,
            defineField({name: 'service', type: 'reference', to: [{type: 'service'}], description: 'Optional. The service shown; links the photo to that page.'}),
            defineField({name: 'location', title: 'City', type: 'reference', to: [{type: 'location'}], description: 'Optional. Where the job was.'}),
          ],
        }),
      ],
    }),
    defineField({
      name: 'projects',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'project'}]})],
      description: 'Optional. Projects to show (their main photo, title and city).',
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem', description: 'e.g. "See more on Instagram" → profile URL'}),
  ],
  preview: {
    select: {title: 'heading', images: 'images', projects: 'projects', media: 'images.0'},
    prepare: sectionPreview('Photo gallery', (v) => [countLabel(v.images, 'photo'), countLabel(v.projects, 'project')].filter(Boolean).join(', ')),
  },
})

export const priceGuideSection = defineArrayMember({
  name: 'priceGuideSection',
  title: 'Price guide',
  type: 'object',
  icon: BillIcon,
  description: 'Typical price ranges the business has published, as a table. Never invent a price: every row must come from the business, and the guide must carry the date it was last checked.',
  fields: [
    sectionHeadingField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'rows',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'priceRow',
          title: 'Price',
          type: 'object',
          icon: BillIcon,
          fields: [
            defineField({name: 'label', type: 'string', description: 'What is priced, e.g. "200-amp panel replacement"', validation: (rule) => rule.required()}),
            defineField({name: 'low', title: 'From ($)', type: 'number', description: 'Leave empty to use the linked service\'s typical price range.', validation: (rule) => rule.min(0)}),
            defineField({name: 'high', title: 'To ($)', type: 'number', validation: (rule) => rule.min(0)}),
            defineField({name: 'unit', type: 'string', description: 'Optional, e.g. "per hour", "per fixture", "installed"'}),
            defineField({name: 'note', type: 'string', description: 'Optional, e.g. "Full service with meter base"'}),
            defineField({name: 'service', type: 'reference', to: [{type: 'service'}], description: 'Optional. The service page this price is for (the row links there).'}),
            defineField({name: 'guide', title: 'Cost guide', type: 'reference', to: [{type: 'post'}], description: 'Optional. A blog post that explains this price.'}),
          ],
          validation: (rule) =>
            rule.custom((value) => {
              const v = value as {low?: number; high?: number; service?: unknown} | undefined
              if (!v) return true
              const hasPrices = typeof v.low === 'number' && typeof v.high === 'number'
              if (!hasPrices && !v.service) return 'Enter both prices, or link a service whose typical price range is filled in'
              if (hasPrices && v.high! < v.low!) return '"To" must be at least "From"'
              return true
            }),
          preview: {
            select: {title: 'label', low: 'low', high: 'high', unit: 'unit', service: 'service.name'},
            prepare: ({title, low, high, unit, service}) => ({
              title,
              subtitle: typeof low === 'number' && typeof high === 'number' ? `$${low.toLocaleString('en-US')}–$${high.toLocaleString('en-US')}${unit ? ` ${unit}` : ''}` : `from ${service ?? '?'}`,
            }),
          },
        }),
      ],
    }),
    defineField({name: 'disclaimer', type: 'text', rows: 2, description: 'e.g. "Typical ranges only; your price depends on the job. Estimates are free."'}),
    defineField({name: 'asOf', title: 'Prices checked on', type: 'date', description: 'Shown as "Prices as of {month year}".', validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: 'heading', rows: 'rows', asOf: 'asOf'}, prepare: sectionPreview('Price guide', (v) => [countLabel(v.rows, 'price'), v.asOf ? `as of ${v.asOf}` : undefined].filter(Boolean).join(', '))},
})
