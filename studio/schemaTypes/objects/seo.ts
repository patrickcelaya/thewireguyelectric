import {defineField, defineType} from 'sanity'
import {altField} from '../shared/fields'

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: {collapsible: true, collapsed: false},
  fields: [
    defineField({
      name: 'title',
      title: 'Meta title',
      type: 'string',
      description: 'Shown in Google results and the browser tab. Falls back to the page title. Aim for 50–60 characters.',
      validation: (rule) => rule.max(70).warning('Titles over ~60 characters get truncated in Google'),
    }),
    defineField({
      name: 'description',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      description: 'The snippet under the title in Google. Aim for 120–160 characters and include a call to action.',
      validation: (rule) => [
        rule.max(170).warning('Descriptions over ~160 characters get truncated'),
        rule.min(70).warning('Short descriptions waste search result space'),
      ],
    }),
    defineField({
      name: 'ogImage',
      title: 'Social share image',
      type: 'image',
      description: '1200×630. Falls back to the main image, then the site default.',
      options: {hotspot: true},
      fields: [altField('warning')],
    }),
    defineField({
      name: 'noIndex',
      title: 'Hide from search engines (noindex)',
      type: 'boolean',
      initialValue: false,
      description: 'Only for thin or utility pages. Never turn this on for a page that ranks.',
    }),
  ],
})
