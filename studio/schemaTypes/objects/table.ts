import {defineArrayMember, defineField, defineType} from 'sanity'
import {ThListIcon} from '@sanity/icons/ThList'

// Simple table (cost guides use these). First row renders as the header.
export const table = defineType({
  name: 'table',
  title: 'Table',
  type: 'object',
  icon: ThListIcon,
  fields: [
    defineField({name: 'caption', type: 'string', title: 'Caption'}),
    defineField({
      name: 'rows',
      type: 'array',
      title: 'Rows',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'tableRow',
          fields: [defineField({name: 'cells', type: 'array', of: [defineArrayMember({type: 'string'})]})],
          preview: {select: {cells: 'cells'}, prepare: ({cells}) => ({title: (cells ?? []).join(' | ')})},
        }),
      ],
    }),
    defineField({name: 'hasHeaderRow', type: 'boolean', title: 'First row is a header', initialValue: true}),
  ],
  preview: {select: {title: 'caption', rows: 'rows'}, prepare: ({title, rows}) => ({title: title || 'Table', subtitle: `${rows?.length ?? 0} rows`})},
})
