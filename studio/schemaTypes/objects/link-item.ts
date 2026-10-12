import {defineField, defineType} from 'sanity'
import {LinkIcon} from '@sanity/icons/Link'

export const linkItem = defineType({
  name: 'linkItem',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({name: 'label', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'href', type: 'string', description: 'Path like /services or full URL', validation: (rule) => rule.required()}),
  ],
  preview: {select: {title: 'label', subtitle: 'href'}},
})
