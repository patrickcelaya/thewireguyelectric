import {defineField, defineType} from 'sanity'
import {FolderIcon} from '@sanity/icons/Folder'
import {fieldGroups, legacyIdField, seoField, urlSlugField} from '../shared/fields'

export const serviceCategory = defineType({
  name: 'serviceCategory',
  title: 'Service category',
  type: 'document',
  icon: FolderIcon,
  groups: fieldGroups,
  fields: [
    defineField({name: 'name', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    urlSlugField('/services-categories', {source: 'name'}),
    defineField({name: 'heading', title: 'H1 heading', type: 'string', group: 'content'}),
    defineField({name: 'description', type: 'richText', group: 'content'}),
    seoField,
    legacyIdField,
  ],
  preview: {select: {title: 'name', subtitle: 'slug.current'}},
})
