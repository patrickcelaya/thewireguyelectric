import {defineArrayMember, defineField} from 'sanity'
import {BoltIcon} from '@sanity/icons/Bolt'
import {eyebrowField, headingAccentField, sectionImageField} from '../shared/fields'
import {countLabel, sectionPreview} from './preview'

export const heroSection = defineArrayMember({
  name: 'heroSection',
  title: 'Hero',
  type: 'object',
  icon: BoltIcon,
  description:
    'Top of the page. The H1 always comes from the page\'s "H1 heading" field (page.heading), never from a section, so the H1 stays exactly as Google indexed it. Use one hero per page, first.',
  fields: [
    defineField({...eyebrowField, description: 'Short line above the H1, e.g. "established in 2017". Rendered outside the H1.'}),
    defineField({
      name: 'heading',
      type: 'string',
      description: 'Not used. The hero always shows the page\'s "H1 heading" field.',
      deprecated: {reason: 'The H1 comes from the page\'s "H1 heading" field. Clear this field.'},
      hidden: ({value}) => !value,
    }),
    headingAccentField('page'),
    defineField({name: 'text', type: 'text', rows: 3, description: 'The paragraph under the H1.'}),
    sectionImageField('image', 'Image', 'Background or side photo. Use a real photo of the team, vans or a job.'),
    defineField({name: 'primaryCta', title: 'Main button', type: 'linkItem', description: 'e.g. "Get a Free Estimate" → /contact-us'}),
    defineField({name: 'secondaryCta', title: 'Second button', type: 'linkItem', description: 'Optional, e.g. "View All Services" → /services'}),
    defineField({
      name: 'showPhone',
      title: 'Show call button',
      type: 'boolean',
      initialValue: true,
      description: 'Adds a "Call" button with the phone number from Site settings.',
    }),
    defineField({
      name: 'trustLine',
      type: 'string',
      description: 'One short line of verifiable credentials under the buttons, e.g. "Licensed, bonded, and insured · ROC #365306".',
    }),
    defineField({
      name: 'showTrustBar',
      type: 'boolean',
      initialValue: true,
      description: 'Shows the standard trust strip (rating, license and years in business, from Site settings) with the hero.',
    }),
    defineField({
      name: 'reviewSnippets',
      title: 'Review quotes',
      type: 'array',
      of: [defineArrayMember({type: 'reviewSnippet'})],
      description: 'Up to three short quotes from real reviews. Leave empty for none.',
      validation: (rule) => rule.max(4).warning('Three quotes is plenty for a hero'),
    }),
  ],
  preview: {
    select: {text: 'text', eyebrow: 'eyebrow', media: 'image', snippets: 'reviewSnippets'},
    prepare: (value) =>
      sectionPreview('Hero', (v) => countLabel(v.snippets, 'quote'))({
        ...value,
        title: (value.eyebrow as string | undefined) || (value.text as string | undefined)?.slice(0, 60),
      }),
  },
})
