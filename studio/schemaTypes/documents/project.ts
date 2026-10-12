import {defineArrayMember, defineField, defineType} from 'sanity'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {fieldGroups, imageField, seoField, urlSlugField} from '../shared/fields'

// Real jobs. The strongest local-proof content an electrician can publish, and the
// raw material that makes city and service pages unique.
export const project = defineType({
  name: 'project',
  title: 'Project (job showcase)',
  type: 'document',
  icon: ProjectsIcon,
  groups: fieldGroups,
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    urlSlugField('/projects'),
    defineField({name: 'location', type: 'reference', to: [{type: 'location'}], group: 'content'}),
    defineField({name: 'neighborhood', type: 'string', group: 'content'}),
    defineField({name: 'services', type: 'array', group: 'content', of: [defineArrayMember({type: 'reference', to: [{type: 'service'}]})]}),
    defineField({name: 'completedAt', type: 'date', group: 'content'}),
    defineField({name: 'summary', type: 'text', rows: 3, group: 'content'}),
    imageField('mainImage', 'Main image'),
    defineField({
      name: 'gallery',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: [defineField({name: 'alt', type: 'string'})]})],
    }),
    defineField({name: 'body', type: 'richText', group: 'content'}),
    defineField({name: 'review', type: 'reference', to: [{type: 'review'}], group: 'content'}),
    seoField,
  ],
  preview: {select: {title: 'title', subtitle: 'location.name', media: 'mainImage'}},
})
