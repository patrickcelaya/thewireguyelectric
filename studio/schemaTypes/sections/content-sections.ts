import {defineArrayMember, defineField} from 'sanity'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {ImageIcon} from '@sanity/icons/Image'
import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {ThLargeIcon} from '@sanity/icons/ThLarge'
import {OlistIcon} from '@sanity/icons/Olist'
import {DoubleQuoteIcon} from '@sanity/icons/DoubleQuote'
import {UsersIcon} from '@sanity/icons/Users'
import {
  eyebrowField,
  headingAccentField,
  iconField,
  sectionHeadingField,
  sectionImageField,
} from '../shared/fields'
import {countLabel, sectionPreview} from './preview'

// Editorial sections: copy, images, lists of reasons, steps and quotes.

export const richTextSection = defineArrayMember({
  name: 'richTextSection',
  title: 'Text',
  type: 'object',
  icon: DocumentTextIcon,
  description: 'Free-form copy with headings, lists, links, images and tables.',
  fields: [sectionHeadingField(), defineField({name: 'body', type: 'richText'})],
  preview: {select: {title: 'heading'}, prepare: sectionPreview('Text')},
})

export const mediaTextSection = defineArrayMember({
  name: 'mediaTextSection',
  title: 'Image + text',
  type: 'object',
  icon: ImageIcon,
  description: 'A photo next to a block of copy.',
  fields: [
    sectionHeadingField(),
    defineField({name: 'body', type: 'richText'}),
    sectionImageField(),
    defineField({name: 'imagePosition', type: 'string', options: {list: ['left', 'right'], layout: 'radio'}, initialValue: 'right'}),
    defineField({name: 'cta', title: 'Button', type: 'linkItem'}),
  ],
  preview: {select: {title: 'heading', media: 'image'}, prepare: sectionPreview('Image + text')},
})

export const featureGridSection = defineArrayMember({
  name: 'featureGridSection',
  title: 'Features',
  type: 'object',
  icon: ThLargeIcon,
  description: 'Reasons to choose us ("No BS pricing", "Amazing Quality") or a checklist of what we do ("Panel Upgrades", "+ More!").',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    headingAccentField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'style',
      type: 'string',
      description: 'Cards: each item has a title, text and optional link. Checklist: short items with a check mark.',
      options: {
        list: [
          {title: 'Cards', value: 'cards'},
          {title: 'Checklist', value: 'checklist'},
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
      initialValue: 'cards',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'siteList',
      title: 'Use a shared list',
      type: 'string',
      description: 'Optional. Show a list kept in Site settings → Shared copy instead of the items below, so the copy stays identical everywhere it appears.',
      options: {
        list: [
          {title: 'Value props (Site settings)', value: 'valueProps'},
          {title: 'Capabilities (Site settings)', value: 'capabilities'},
        ],
      },
    }),
    defineField({
      name: 'items',
      type: 'array',
      of: [defineArrayMember({type: 'featureItem'})],
      hidden: ({parent}) => Boolean((parent as {siteList?: string} | undefined)?.siteList),
      validation: (rule) =>
        rule
          .custom((items, context) => {
            const parent = context.parent as {siteList?: string} | undefined
            if (parent?.siteList || (Array.isArray(items) && items.length)) return true
            return 'Add items or pick a shared list, or the section will not show'
          })
          .warning(),
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem'}),
  ],
  preview: {
    select: {title: 'heading', style: 'style', siteList: 'siteList', items: 'items'},
    prepare: sectionPreview('Features', (v) => (v.siteList ? `shared ${v.siteList}` : [v.style, countLabel(v.items, 'item')].filter(Boolean).join(', '))),
  },
})

export const highlightsSection = defineArrayMember({
  name: 'highlightsSection',
  title: 'Highlights',
  type: 'object',
  icon: CheckmarkCircleIcon,
  description: 'A short checklist with a photo and a side note, e.g. "We treat you like family" with the license line, or "Why Work With Us?".',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({
      name: 'checklist',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'highlightItem',
          title: 'Point',
          type: 'object',
          icon: CheckmarkCircleIcon,
          fields: [
            defineField({name: 'lead', type: 'string', description: 'Bold opening words, e.g. "Consistent, Reliable Work". Optional.'}),
            defineField({name: 'text', type: 'text', rows: 2, description: 'The rest of the point, e.g. "Steady residential service across the Phoenix Valley, year-round."'}),
          ],
          validation: (rule) =>
            rule.custom((value) => {
              const v = value as {lead?: string; text?: string} | undefined
              return v?.lead || v?.text ? true : 'Add a lead or text'
            }),
          preview: {select: {title: 'lead', subtitle: 'text'}, prepare: ({title, subtitle}) => ({title: title || subtitle, subtitle: title ? subtitle : undefined})},
        }),
      ],
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem'}),
    sectionImageField(),
    defineField({name: 'asideHeading', title: 'Side note heading', type: 'string', description: 'e.g. "Licensed, bonded, and insured. ROC#365306"'}),
    defineField({name: 'asideBody', title: 'Side note text', type: 'richText'}),
  ],
  preview: {
    select: {title: 'heading', media: 'image', checklist: 'checklist'},
    prepare: sectionPreview('Highlights', (v) => countLabel(v.checklist, 'point')),
  },
})

export const processStepsSection = defineArrayMember({
  name: 'processStepsSection',
  title: 'Process steps',
  type: 'object',
  icon: OlistIcon,
  description: 'How working with us goes, step by step (free estimate → flat-rate quote → permit → warranty). Only describe steps the business really follows.',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({
      name: 'steps',
      type: 'array',
      of: [
        defineArrayMember({
          name: 'processStep',
          title: 'Step',
          type: 'object',
          icon: OlistIcon,
          fields: [
            defineField({name: 'title', type: 'string', description: 'e.g. "Free estimate"', validation: (rule) => rule.required()}),
            defineField({name: 'text', type: 'text', rows: 2}),
            iconField(),
          ],
          preview: {select: {title: 'title', subtitle: 'text'}},
        }),
      ],
      validation: (rule) => rule.min(2).warning('A process needs at least two steps'),
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem'}),
  ],
  preview: {select: {title: 'heading', steps: 'steps'}, prepare: sectionPreview('Process steps', (v) => countLabel(v.steps, 'step'))},
})

export const quoteSection = defineArrayMember({
  name: 'quoteSection',
  title: 'Quote',
  type: 'object',
  icon: DoubleQuoteIcon,
  description: 'A statement from someone on the team, e.g. the owner\'s "We care about doing honest work for honest prices".',
  fields: [
    eyebrowField,
    sectionHeadingField(),
    defineField({name: 'subheading', type: 'string', description: 'Optional second line, rendered as an H3.'}),
    defineField({name: 'quote', type: 'text', rows: 4, description: 'Their words, without quotation marks.', validation: (rule) => rule.required()}),
    defineField({name: 'person', type: 'reference', to: [{type: 'teamMember'}], description: 'Who said it. Their name, role and photo are shown.'}),
    sectionImageField(),
  ],
  preview: {
    select: {title: 'heading', quote: 'quote', person: 'person.name', media: 'image'},
    prepare: (value) => sectionPreview('Quote', (v) => v.person as string | undefined)({...value, title: (value.title as string | undefined) || (value.quote as string | undefined)?.slice(0, 60)}),
  },
})

export const teamIntroSection = defineArrayMember({
  name: 'teamIntroSection',
  title: 'Team intro',
  type: 'object',
  icon: UsersIcon,
  description: 'A short paragraph introducing the people behind the business. Mark names as "Team member" so they show with their photo and link to /our-team.',
  fields: [
    eyebrowField,
    defineField({name: 'body', type: 'textWithMentions', validation: (rule) => rule.required()}),
    defineField({
      name: 'people',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'teamMember'}]})],
      description: 'Optional photo row. Leave empty to use the people mentioned in the text.',
      validation: (rule) => rule.unique(),
    }),
    defineField({name: 'cta', title: 'Button', type: 'linkItem', description: 'e.g. "About Us" → /about-us'}),
  ],
  preview: {
    select: {body: 'body', eyebrow: 'eyebrow'},
    prepare: (value) => {
      const blocks = (value.body as Array<{children?: Array<{text?: string}>}> | undefined) ?? []
      const text = blocks.flatMap((b) => b.children ?? []).map((c) => c.text ?? '').join('')
      return sectionPreview('Team intro')({title: (value.eyebrow as string | undefined) || text.slice(0, 60)})
    },
  },
})
