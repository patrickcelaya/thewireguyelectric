import {defineArrayMember, defineField, defineType} from 'sanity'
import {StackIcon} from '@sanity/icons/Stack'
import {BoltIcon} from '@sanity/icons/Bolt'
import {WrenchIcon} from '@sanity/icons/Wrench'
import {PinIcon} from '@sanity/icons/Pin'
import {StarIcon} from '@sanity/icons/Star'
import {HelpCircleIcon} from '@sanity/icons/HelpCircle'
import {UsersIcon} from '@sanity/icons/Users'
import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {ImageIcon} from '@sanity/icons/Image'
import {CaseIcon} from '@sanity/icons/Case'

// Page builder sections. Named for what the content is, not how it looks, so a
// redesign doesn't require a content migration.

const hero = defineArrayMember({
  name: 'heroSection',
  title: 'Hero',
  type: 'object',
  icon: BoltIcon,
  fields: [
    defineField({name: 'eyebrow', type: 'string'}),
    defineField({name: 'heading', type: 'string', description: 'Rendered as the H1 when this is the first section and the page has no separate H1'}),
    defineField({name: 'text', type: 'text', rows: 3}),
    defineField({name: 'image', type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', type: 'string'})]}),
    defineField({name: 'primaryCta', type: 'linkItem'}),
    defineField({name: 'showPhone', type: 'boolean', initialValue: true}),
    defineField({name: 'showTrustBar', type: 'boolean', initialValue: true, description: 'Rating, license and years in business'}),
  ],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Hero', subtitle: 'Hero'})},
})

const richTextSection = defineArrayMember({
  name: 'richTextSection',
  title: 'Text',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [defineField({name: 'heading', type: 'string'}), defineField({name: 'body', type: 'richText'})],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Text', subtitle: 'Text'})},
})

const mediaText = defineArrayMember({
  name: 'mediaTextSection',
  title: 'Image + text',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({name: 'heading', type: 'string'}),
    defineField({name: 'body', type: 'richText'}),
    defineField({name: 'image', type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', type: 'string'})]}),
    defineField({name: 'imagePosition', type: 'string', options: {list: ['left', 'right'], layout: 'radio'}, initialValue: 'right'}),
    defineField({name: 'cta', type: 'linkItem'}),
  ],
  preview: {select: {title: 'heading', media: 'image'}, prepare: ({title, media}) => ({title: title || 'Image + text', subtitle: 'Image + text', media})},
})

const servicesSection = defineArrayMember({
  name: 'servicesSection',
  title: 'Services list',
  type: 'object',
  icon: WrenchIcon,
  fields: [
    defineField({name: 'heading', type: 'string'}),
    defineField({name: 'intro', type: 'text', rows: 2}),
    defineField({name: 'category', type: 'reference', to: [{type: 'serviceCategory'}], description: 'Leave empty to show all, or pick services below'}),
    defineField({name: 'services', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
  ],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Services', subtitle: 'Services list'})},
})

const locationsSection = defineArrayMember({
  name: 'locationsSection',
  title: 'Service areas list',
  type: 'object',
  icon: PinIcon,
  fields: [defineField({name: 'heading', type: 'string'}), defineField({name: 'intro', type: 'text', rows: 2})],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Service areas', subtitle: 'Service areas list'})},
})

const reviewsSection = defineArrayMember({
  name: 'reviewsSection',
  title: 'Reviews',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({name: 'heading', type: 'string'}),
    defineField({name: 'reviews', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'review'}]})], description: 'Leave empty to show featured reviews'}),
  ],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Reviews', subtitle: 'Reviews'})},
})

const faqSection = defineArrayMember({
  name: 'faqSection',
  title: 'FAQs',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    defineField({name: 'heading', type: 'string'}),
    defineField({name: 'faqs', type: 'array', of: [defineArrayMember({type: 'reference', to: [{type: 'faq'}]})]}),
    defineField({name: 'topic', type: 'string', description: 'Or show every FAQ with this topic'}),
  ],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'FAQs', subtitle: 'FAQs'})},
})

const teamSection = defineArrayMember({
  name: 'teamSection',
  title: 'Team',
  type: 'object',
  icon: UsersIcon,
  fields: [defineField({name: 'heading', type: 'string'}), defineField({name: 'intro', type: 'text', rows: 2})],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Team', subtitle: 'Team'})},
})

const postsSection = defineArrayMember({
  name: 'postsSection',
  title: 'Latest blog posts',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [defineField({name: 'heading', type: 'string'}), defineField({name: 'limit', type: 'number', initialValue: 3})],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Latest posts', subtitle: 'Blog posts'})},
})

const jobsSection = defineArrayMember({
  name: 'jobsSection',
  title: 'Job openings',
  type: 'object',
  icon: CaseIcon,
  fields: [defineField({name: 'heading', type: 'string'})],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Job openings', subtitle: 'Jobs'})},
})

const contactSection = defineArrayMember({
  name: 'contactSection',
  title: 'Contact form',
  type: 'object',
  icon: BoltIcon,
  fields: [
    defineField({name: 'heading', type: 'string'}),
    defineField({name: 'text', type: 'text', rows: 2}),
    defineField({name: 'formType', type: 'string', options: {list: ['estimate', 'careers'], layout: 'radio'}, initialValue: 'estimate'}),
  ],
  preview: {select: {title: 'heading'}, prepare: ({title}) => ({title: title || 'Contact form', subtitle: 'Form'})},
})

const ctaSection = defineArrayMember({
  name: 'ctaSection',
  title: 'Call to action band',
  type: 'object',
  icon: BoltIcon,
  fields: [defineField({name: 'cta', type: 'callToAction'})],
  preview: {select: {title: 'cta.heading'}, prepare: ({title}) => ({title: title || 'Call to action', subtitle: 'CTA band'})},
})

export const pageSections = defineType({
  name: 'pageSections',
  title: 'Sections',
  type: 'array',
  icon: StackIcon,
  of: [hero, richTextSection, mediaText, servicesSection, locationsSection, reviewsSection, faqSection, teamSection, postsSection, jobsSection, contactSection, ctaSection],
})
