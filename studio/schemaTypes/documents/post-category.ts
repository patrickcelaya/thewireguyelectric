import {defineField, defineType} from 'sanity'
import {TagIcon} from '@sanity/icons/Tag'
import {fieldGroups, legacyIdField, seoField, urlSlugField} from '../shared/fields'

export const postCategory = defineType({
  name: 'postCategory',
  title: 'Blog category',
  type: 'document',
  icon: TagIcon,
  groups: fieldGroups,
  fields: [
    defineField({name: 'name', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    urlSlugField('/posts-categories', {source: 'name'}),
    defineField({name: 'description', type: 'text', rows: 3, group: 'content'}),
    seoField,
    legacyIdField,
  ],
  preview: {select: {title: 'name', subtitle: 'slug.current'}},
})
