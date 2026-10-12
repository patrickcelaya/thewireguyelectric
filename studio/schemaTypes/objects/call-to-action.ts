import {defineField, defineType} from 'sanity'
import {BoltIcon} from '@sanity/icons/Bolt'

export const callToAction = defineType({
  name: 'callToAction',
  title: 'Call to action',
  type: 'object',
  icon: BoltIcon,
  fields: [
    defineField({name: 'heading', type: 'string'}),
    defineField({name: 'text', type: 'text', rows: 2}),
    defineField({name: 'label', type: 'string', title: 'Button label', initialValue: 'Get a free estimate'}),
    defineField({name: 'href', type: 'string', title: 'Button link', initialValue: '/contact-us'}),
  ],
  preview: {select: {title: 'heading', subtitle: 'label'}, prepare: ({title, subtitle}) => ({title: title || 'Call to action', subtitle})},
})
