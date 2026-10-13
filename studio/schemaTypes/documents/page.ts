import {defineField, defineType} from 'sanity'
import {DocumentIcon} from '@sanity/icons/Document'
import {fieldGroups, seoField} from '../shared/fields'

// Standalone pages (home, about-us, contact-us, faq, careers, ...). The slug is
// the full path without the leading slash; the homepage uses "index".
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  groups: fieldGroups,
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (rule) => rule.required()}),
    defineField({
      name: 'slug',
      title: 'URL path',
      type: 'slug',
      group: 'content',
      description: 'Path without the leading slash, e.g. "about-us". Use "index" for the homepage. Changing it on a live page breaks links unless you add a redirect.',
      validation: (rule) =>
        rule.required().custom((slug) =>
          slug?.current && /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(slug.current) ? true : 'Lowercase letters, numbers, hyphens and / only',
        ),
    }),
    defineField({
      name: 'heading',
      title: 'H1 heading',
      type: 'string',
      group: 'content',
      description: 'The page\'s only H1, shown in the hero. Falls back to the title. It matches what Google has indexed: change it only as a deliberate SEO decision.',
    }),
    defineField({name: 'intro', type: 'text', rows: 3, group: 'content'}),
    defineField({name: 'sections', type: 'pageSections', group: 'content'}),
    seoField,
  ],
  preview: {select: {title: 'title', slug: 'slug.current'}, prepare: ({title, slug}) => ({title, subtitle: slug === 'index' ? '/' : `/${slug ?? ''}`})},
})
